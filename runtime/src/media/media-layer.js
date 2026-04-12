"use strict";
/**
 * Media Layer - Orchestrates all media components
 *
 * Coordinates:
 * - Call control (WebRTC, Genesys, Avaya)
 * - Audio capture
 * - STT (Vosk, Deepgram, WebSpeech)
 * - Cloud communication (text exchange)
 * - TTS (ElevenLabs, Local)
 * - Audio output
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaLayer = exports.MediaLayer = void 0;
const events_1 = require("events");
const config_loader_1 = require("./config-loader");
const stt_service_1 = require("./stt-service");
const tts_service_1 = require("./tts-service");
const vad_1 = require("./vad");
const webrtc_adapter_1 = require("./adapters/webrtc-adapter");
const genesys_adapter_1 = require("./adapters/genesys-adapter");
const audio_capture_1 = require("./audio-capture");
class MediaLayer extends events_1.EventEmitter {
    constructor() {
        super();
        this.currentVendor = 'webrtc';
        this.currentCall = null;
        this.isInitialized = false;
        this.useVAD = true;
        this.configLoader = new config_loader_1.ConfigLoader();
        this.sttService = new stt_service_1.STTService();
        this.ttsService = new tts_service_1.TTSService();
        this.vad = new vad_1.VoiceActivityDetector();
        this.webRTCAdapter = new webrtc_adapter_1.WebRTCAdapter();
        this.genesysAdapter = new genesys_adapter_1.GenesysAdapter();
        this.audioCapture = new audio_capture_1.AudioCapture();
    }
    /**
     * Initialize media layer with device configuration
     */
    async initialize(config) {
        console.log('[MediaLayer] Initializing...');
        const teamConfig = await this.configLoader.loadFromCloud(config.deviceConfig);
        this.currentVendor = teamConfig.vendorAdapter;
        await this.initializeStt(teamConfig);
        await this.initializeTts(teamConfig);
        this.setupEventHandlers();
        this.isInitialized = true;
        this.emit('initialized', { vendor: this.currentVendor, teamConfig });
        console.log('[MediaLayer] Initialized with vendor:', this.currentVendor);
    }
    async initializeStt(config) {
        const sttConfig = {
            provider: config.sttProvider,
            language: 'en-US',
            sampleRate: 16000,
            ...(config.voskConfig || {})
        };
        await this.sttService.initialize(sttConfig);
        console.log('[MediaLayer] STT initialized:', config.sttProvider);
    }
    async initializeTts(config) {
        const ttsConfig = {
            provider: config.ttsProvider,
            ...(config.elevenlabsConfig || {})
        };
        await this.ttsService.initialize(ttsConfig);
        console.log('[MediaLayer] TTS initialized:', config.ttsProvider);
    }
    setupEventHandlers() {
        this.sttService.on('transcript', (result) => {
            if (this.currentCall) {
                this.emit('media:transcript', {
                    sessionId: this.currentCall.sessionId,
                    text: result.text,
                    isFinal: result.is_final,
                    confidence: result.confidence,
                    timestamp: result.timestamp
                });
            }
        });
        this.sttService.on('error', (error) => {
            this.emit('media:error', { component: 'stt', error });
        });
        this.ttsService.on('spoke', (result) => {
            this.emit('media:spoken', result);
        });
    }
    /**
     * Start a call - initialize call context and start STT listening
     */
    async startCall(sessionId) {
        if (!this.isInitialized) {
            throw new Error('MediaLayer not initialized');
        }
        this.currentCall = {
            sessionId,
            teamConfig: this.configLoader.getConfig(),
            startTime: Date.now()
        };
        console.log('[MediaLayer] Starting call:', sessionId);
        if (this.currentVendor === 'webrtc') {
            await this.startWebRTCCall();
        }
        else if (this.currentVendor === 'genesys') {
            await this.startGenesysCall();
        }
        await this.startListening();
        this.emit('call:started', { sessionId, vendor: this.currentVendor });
    }
    /**
     * Start WebRTC call
     */
    async startWebRTCCall() {
        await this.webRTCAdapter.initializeCall();
        await this.webRTCAdapter.createConnection();
        const stream = this.webRTCAdapter.getLocalStream();
        if (stream) {
            await this.audioCapture.startMicrophoneCapture();
        }
    }
    /**
     * Start Genesys call
     */
    async startGenesysCall() {
        const vendorConfig = this.configLoader.getVendorConfig();
        this.genesysAdapter.initialize(vendorConfig);
        await this.genesysAdapter.authenticate();
        await this.audioCapture.startMicrophoneCapture();
    }
    /**
     * Start STT listening
     */
    async startListening() {
        if (this.useVAD) {
            const stream = this.audioCapture.getStream();
            if (stream) {
                await this.vad.initialize(stream);
                this.vad.start();
            }
        }
        await this.sttService.start();
        this.emit('listening:started');
    }
    /**
     * Stop call
     */
    async stopCall() {
        if (!this.currentCall)
            return;
        const sessionId = this.currentCall.sessionId;
        const duration = Date.now() - this.currentCall.startTime;
        console.log('[MediaLayer] Stopping call:', sessionId, 'duration:', duration);
        await this.sttService.stop();
        await this.ttsService.stop();
        await this.audioCapture.stop();
        await this.vad.stop();
        if (this.currentVendor === 'webrtc') {
            await this.webRTCAdapter.endCall();
        }
        else if (this.currentVendor === 'genesys') {
            this.genesysAdapter.disconnect();
        }
        this.currentCall = null;
        this.emit('call:ended', { sessionId, duration });
    }
    /**
     * Speak text response from Cloud
     */
    async speak(text, options) {
        await this.ttsService.speak(text, {
            voiceId: options?.voice,
            speed: options?.speed
        });
    }
    /**
     * Stop current speech
     */
    async stopSpeaking() {
        await this.ttsService.stop();
    }
    /**
     * Get call status
     */
    getCallStatus() {
        return {
            active: this.currentCall !== null,
            sessionId: this.currentCall?.sessionId,
            duration: this.currentCall ? Date.now() - this.currentCall.startTime : undefined,
            vendor: this.currentVendor
        };
    }
    /**
     * Mute/unmute
     */
    mute() {
        this.audioCapture.mute();
        this.emit('call:muted');
    }
    unmute() {
        this.audioCapture.unmute();
        this.emit('call:unmuted');
    }
    /**
     * Hold/resume
     */
    async hold() {
        if (this.currentVendor === 'webrtc') {
            await this.webRTCAdapter.hold();
        }
        else if (this.currentVendor === 'genesys' && this.currentCall) {
            const callState = this.genesysAdapter.getCurrentCallState();
            if (callState) {
                await this.genesysAdapter.holdCall(callState.id);
            }
        }
    }
    async resume() {
        if (this.currentVendor === 'webrtc') {
            await this.webRTCAdapter.resume();
        }
        else if (this.currentVendor === 'genesys' && this.currentCall) {
            const callState = this.genesysAdapter.getCurrentCallState();
            if (callState) {
                await this.genesysAdapter.resumeCall(callState.id);
            }
        }
    }
    /**
     * Switch vendor dynamically
     */
    async switchVendor(vendor, config) {
        this.currentVendor = vendor;
        if (vendor === 'genesys' && config) {
            await this.genesysAdapter.initialize(config);
        }
        this.emit('vendor:switched', { vendor });
    }
    /**
     * Get vendor adapter for external control
     */
    getVendorAdapter() {
        if (this.currentVendor === 'webrtc') {
            return this.webRTCAdapter;
        }
        return this.genesysAdapter;
    }
    /**
     * Get STT service for direct control
     */
    getSTTService() {
        return this.sttService;
    }
    /**
     * Get TTS service for direct control
     */
    getTTSService() {
        return this.ttsService;
    }
    /**
     * Check if initialized
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Cleanup
     */
    async cleanup() {
        if (this.currentCall) {
            await this.stopCall();
        }
        this.emit('cleanup');
        console.log('[MediaLayer] Cleaned up');
    }
}
exports.MediaLayer = MediaLayer;
exports.mediaLayer = new MediaLayer();
//# sourceMappingURL=media-layer.js.map