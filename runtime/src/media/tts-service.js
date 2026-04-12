"use strict";
/**
 * TTS Service - Text-to-Speech factory with multiple providers
 *
 * Supported providers:
 * - elevenlabs: Cloud TTS API
 * - local: Browser Web Speech API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsService = exports.TTSService = exports.LocalTTSAdapter = exports.ElevenLabsAdapter = void 0;
const events_1 = require("events");
// ================== ELEVENLABS ADAPTER ==================
class ElevenLabsAdapter {
    constructor() {
        this.config = null;
        this.currentAudio = null;
        this.playing = false;
    }
    async initialize(config) {
        this.config = config;
        console.log('[TTS-ElevenLabs] Initialized');
    }
    async speak(text, options) {
        if (!this.config)
            throw new Error('Adapter not initialized');
        const voiceId = options?.voiceId || this.config.voiceId || 'rachel';
        const apiKey = this.config.apiKey || '';
        if (!apiKey) {
            console.warn('[TTS-ElevenLabs] No API key, falling back to local');
            return { provider: 'elevenlabs-fallback' };
        }
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.8
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            if (this.currentAudio) {
                this.currentAudio.pause();
                URL.revokeObjectURL(this.currentAudio.src);
            }
            this.currentAudio = new Audio(audioUrl);
            this.playing = true;
            await new Promise((resolve, reject) => {
                this.currentAudio.onended = () => {
                    this.playing = false;
                    resolve();
                };
                this.currentAudio.onerror = (e) => {
                    this.playing = false;
                    reject(e);
                };
                this.currentAudio.play().catch(reject);
            });
            return {
                audioUrl,
                duration: this.currentAudio.duration * 1000,
                provider: 'elevenlabs'
            };
        }
        catch (error) {
            console.error('[TTS-ElevenLabs] Failed:', error);
            throw error;
        }
    }
    async stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.playing = false;
        }
    }
    isPlaying() {
        return this.playing;
    }
}
exports.ElevenLabsAdapter = ElevenLabsAdapter;
// ================== LOCAL TTS ADAPTER ==================
class LocalTTSAdapter {
    constructor() {
        this.config = null;
        this.synth = null;
        this.currentUtterance = null;
        this.playing = false;
    }
    async initialize(config) {
        this.config = config;
        this.synth = window.speechSynthesis;
        console.log('[TTS-Local] Initialized');
    }
    async speak(text, options) {
        if (!this.synth)
            throw new Error('Adapter not initialized');
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = options?.language || this.config?.language || 'en-US';
            utterance.rate = options?.speed || this.config?.speed || 1.0;
            utterance.pitch = options?.pitch || this.config?.pitch || 1.0;
            utterance.volume = 1.0;
            const voices = this.synth.getVoices();
            const voice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha')) || voices[0];
            if (voice) {
                utterance.voice = voice;
            }
            utterance.onstart = () => {
                this.playing = true;
            };
            utterance.onend = () => {
                this.playing = false;
                resolve({ provider: 'local' });
            };
            utterance.onerror = (event) => {
                this.playing = false;
                reject(new Error(event.error));
            };
            this.currentUtterance = utterance;
            this.synth.speak(utterance);
        });
    }
    async stop() {
        if (this.synth) {
            this.synth.cancel();
            this.playing = false;
        }
    }
    isPlaying() {
        return this.playing;
    }
}
exports.LocalTTSAdapter = LocalTTSAdapter;
// ================== TTS SERVICE FACTORY ==================
class TTSService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.adapter = null;
        this.currentProvider = '';
        this.config = null;
        this.audioQueue = [];
        this.isProcessingQueue = false;
    }
    /**
     * Initialize TTS service with a provider
     */
    async initialize(config) {
        this.config = config;
        this.currentProvider = config.provider;
        switch (config.provider) {
            case 'elevenlabs':
                this.adapter = new ElevenLabsAdapter();
                break;
            case 'local':
                this.adapter = new LocalTTSAdapter();
                break;
            default:
                this.adapter = new LocalTTSAdapter();
        }
        await this.adapter.initialize(config);
        console.log(`[TTS] Initialized with provider: ${config.provider}`);
    }
    /**
     * Speak text immediately
     */
    async speak(text, options) {
        if (!this.adapter) {
            throw new Error('TTS service not initialized');
        }
        try {
            const result = await this.adapter.speak(text, options);
            this.emit('spoke', result);
            return result;
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * Queue text to speak (for sequential responses)
     */
    async queue(text) {
        this.audioQueue.push(text);
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }
    async processQueue() {
        if (this.audioQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        this.isProcessingQueue = true;
        const text = this.audioQueue.shift();
        try {
            await this.speak(text);
        }
        catch (error) {
            console.error('[TTS] Queue item failed:', error);
        }
        this.processQueue();
    }
    /**
     * Stop current speech
     */
    async stop() {
        if (this.adapter) {
            await this.adapter.stop();
            this.audioQueue = [];
            this.isProcessingQueue = false;
            this.emit('stopped');
        }
    }
    /**
     * Get current provider
     */
    getProvider() {
        return this.currentProvider;
    }
    /**
     * Check if playing
     */
    isPlaying() {
        return this.adapter?.isPlaying() || false;
    }
    /**
     * Switch provider dynamically
     */
    async switchProvider(config) {
        if (this.adapter) {
            await this.stop();
        }
        await this.initialize(config);
    }
}
exports.TTSService = TTSService;
exports.ttsService = new TTSService();
//# sourceMappingURL=tts-service.js.map