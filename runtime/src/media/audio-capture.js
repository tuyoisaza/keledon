"use strict";
/**
 * Audio Capture - Captures audio from various sources
 *
 * Sources:
 * - Microphone (getUserMedia)
 * - System audio (via CDP for Electron)
 * - Tab audio (via CDP for Electron)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioCapture = exports.AudioCapture = void 0;
const events_1 = require("events");
class AudioCapture extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.audioContext = null;
        this.stream = null;
        this.sourceNode = null;
        this.processorNode = null;
        this.isCapturing = false;
        this.config = {
            source: config?.source || 'microphone',
            sampleRate: config?.sampleRate || 16000,
            channelCount: config?.channelCount || 1,
            echoCancellation: config?.echoCancellation ?? true,
            noiseSuppression: config?.noiseSuppression ?? true,
            autoGainControl: config?.autoGainControl ?? true
        };
    }
    /**
     * Start capturing audio from microphone
     */
    async startMicrophoneCapture() {
        if (this.isCapturing)
            return;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: { ideal: this.config.sampleRate },
                    channelCount: this.config.channelCount,
                    echoCancellation: this.config.echoCancellation,
                    noiseSuppression: this.config.noiseSuppression,
                    autoGainControl: this.config.autoGainControl
                }
            });
            await this.setupAudioPipeline();
            this.isCapturing = true;
            this.emit('capture:started');
            console.log('[AudioCapture] Microphone capture started');
        }
        catch (error) {
            this.emit('capture:error', error);
            throw error;
        }
    }
    /**
     * Start capturing from Electron BrowserWindow tab via CDP
     * This requires CDP connection to Electron's browser window
     */
    async startTabCapture(cdpUrl) {
        if (this.isCapturing)
            return;
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright-core')));
            const browser = await chromium.connectOverCDP(cdpUrl);
            const contexts = browser.contexts();
            if (contexts.length === 0) {
                throw new Error('No browser contexts found');
            }
            const page = await contexts[0].newPage();
            await page.goto('about:blank');
            const stream = await page.evaluate(() => {
                return navigator.mediaDevices.getUserMedia({ audio: true });
            });
            this.stream = new MediaStream(stream);
            await this.setupAudioPipeline();
            this.isCapturing = true;
            this.emit('capture:started');
            console.log('[AudioCapture] Tab capture started via CDP');
        }
        catch (error) {
            this.emit('capture:error', error);
            throw error;
        }
    }
    /**
     * Setup audio processing pipeline
     */
    async setupAudioPipeline() {
        if (!this.stream) {
            throw new Error('No stream available');
        }
        this.audioContext = new AudioContext({
            sampleRate: this.config.sampleRate
        });
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.processorNode.onaudioprocess = (event) => {
            if (!this.isCapturing)
                return;
            const inputBuffer = event.inputBuffer;
            const channelData = inputBuffer.getChannelData(0);
            const chunk = {
                data: Float32Array.from(channelData),
                timestamp: Date.now(),
                duration: inputBuffer.duration * 1000
            };
            this.emit('audio:chunk', chunk);
        };
        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
    }
    /**
     * Stop capturing
     */
    async stop() {
        this.isCapturing = false;
        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
        this.emit('capture:stopped');
        console.log('[AudioCapture] Stopped');
    }
    /**
     * Get current stream (for WebRTC or other use)
     */
    getStream() {
        return this.stream;
    }
    /**
     * Check if capturing
     */
    isActive() {
        return this.isCapturing;
    }
    /**
     * Set volume level (0-1)
     */
    setVolume(level) {
        if (this.sourceNode) {
            this.sourceNode.gain.value = Math.max(0, Math.min(1, level));
        }
    }
    /**
     * Mute audio
     */
    mute() {
        if (this.stream) {
            this.stream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
        }
    }
    /**
     * Unmute audio
     */
    unmute() {
        if (this.stream) {
            this.stream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
        }
    }
}
exports.AudioCapture = AudioCapture;
exports.audioCapture = new AudioCapture();
//# sourceMappingURL=audio-capture.js.map