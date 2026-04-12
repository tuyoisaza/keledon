"use strict";
/**
 * VAD - Voice Activity Detection
 *
 * Detects when user is speaking to trigger STT processing
 * Uses audio level thresholding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.vad = exports.VoiceActivityDetector = void 0;
const events_1 = require("events");
class VoiceActivityDetector extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.audioContext = null;
        this.analyser = null;
        this.stream = null;
        this.isRunning = false;
        this.currentState = {
            isSpeaking: false,
            speechStartTime: null,
            audioLevel: 0
        };
        this.silenceTimer = null;
        this.config = {
            threshold: config?.threshold || 20,
            minSpeechDuration: config?.minSpeechDuration || 200,
            silenceTimeout: config?.silenceTimeout || 1000,
            sampleRate: config?.sampleRate || 16000
        };
    }
    /**
     * Initialize VAD with audio stream
     */
    async initialize(stream) {
        this.stream = stream;
        this.audioContext = new AudioContext({
            sampleRate: this.config.sampleRate
        });
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        source.connect(this.analyser);
        console.log('[VAD] Initialized');
    }
    /**
     * Start voice detection
     */
    start() {
        if (this.isRunning || !this.analyser)
            return;
        this.isRunning = true;
        this.detect();
        this.emit('started');
        console.log('[VAD] Started');
    }
    /**
     * Stop voice detection
     */
    async stop() {
        this.isRunning = false;
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
            this.analyser = null;
        }
        this.currentState = {
            isSpeaking: false,
            speechStartTime: null,
            audioLevel: 0
        };
        this.emit('stopped');
        console.log('[VAD] Stopped');
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.currentState };
    }
    /**
     * Get audio level (0-255)
     */
    getAudioLevel() {
        if (!this.analyser)
            return 0;
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        return sum / dataArray.length;
    }
    /**
     * Main detection loop
     */
    detect() {
        if (!this.isRunning)
            return;
        const audioLevel = this.getAudioLevel();
        const now = Date.now();
        this.currentState.audioLevel = audioLevel;
        if (audioLevel > this.config.threshold) {
            if (!this.currentState.isSpeaking) {
                this.currentState.isSpeaking = true;
                this.currentState.speechStartTime = now;
                this.emit('speech:start', {
                    timestamp: now,
                    audioLevel
                });
                console.log('[VAD] Speech started');
            }
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
        }
        else {
            if (this.currentState.isSpeaking && this.currentState.speechStartTime) {
                const speechDuration = now - this.currentState.speechStartTime;
                if (!this.silenceTimer) {
                    this.silenceTimer = setTimeout(() => {
                        if (this.currentState.isSpeaking) {
                            this.currentState.isSpeaking = false;
                            const duration = Date.now() - this.currentState.speechStartTime;
                            this.emit('speech:end', {
                                timestamp: now,
                                duration,
                                audioLevel
                            });
                            console.log('[VAD] Speech ended, duration:', duration);
                        }
                    }, this.config.silenceTimeout);
                }
            }
        }
        this.emit('level', { audioLevel, isSpeaking: this.currentState.isSpeaking });
        requestAnimationFrame(() => this.detect());
    }
    /**
     * Update threshold dynamically
     */
    setThreshold(value) {
        this.config.threshold = value;
        console.log('[VAD] Threshold updated to:', value);
    }
    /**
     * Calibrate - listen for ambient noise and set threshold
     */
    async calibrate(durationMs = 2000) {
        return new Promise((resolve) => {
            const levels = [];
            const startTime = Date.now();
            const collectLevel = () => {
                if (Date.now() - startTime >= durationMs) {
                    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
                    const newThreshold = Math.max(avgLevel * 1.5, 10);
                    this.setThreshold(newThreshold);
                    console.log('[VAD] Calibrated threshold:', newThreshold);
                    resolve(newThreshold);
                    return;
                }
                levels.push(this.getAudioLevel());
                requestAnimationFrame(collectLevel);
            };
            collectLevel();
        });
    }
}
exports.VoiceActivityDetector = VoiceActivityDetector;
exports.vad = new VoiceActivityDetector();
//# sourceMappingURL=vad.js.map