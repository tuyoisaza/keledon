/**
 * TTS Service - Text-to-Speech factory with multiple providers
 *
 * Supported providers:
 * - elevenlabs: Cloud TTS API
 * - local: Browser Web Speech API
 */
import { EventEmitter } from 'events';
export interface TTSConfig {
    provider: 'elevenlabs' | 'local';
    apiKey?: string;
    voiceId?: string;
    language?: string;
    speed?: number;
    pitch?: number;
}
export interface TTSResult {
    audioUrl?: string;
    duration?: number;
    provider: string;
}
export interface TTSAdapter {
    initialize(config: TTSConfig): Promise<void>;
    speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult>;
    stop(): Promise<void>;
    isPlaying(): boolean;
}
export declare class ElevenLabsAdapter implements TTSAdapter {
    private config;
    private currentAudio;
    private playing;
    initialize(config: TTSConfig): Promise<void>;
    speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult>;
    stop(): Promise<void>;
    isPlaying(): boolean;
}
export declare class LocalTTSAdapter implements TTSAdapter {
    private config;
    private synth;
    private currentUtterance;
    private playing;
    initialize(config: TTSConfig): Promise<void>;
    speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult>;
    stop(): Promise<void>;
    isPlaying(): boolean;
}
export declare class TTSService extends EventEmitter {
    private adapter;
    private currentProvider;
    private config;
    private audioQueue;
    private isProcessingQueue;
    /**
     * Initialize TTS service with a provider
     */
    initialize(config: TTSConfig): Promise<void>;
    /**
     * Speak text immediately
     */
    speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult>;
    /**
     * Queue text to speak (for sequential responses)
     */
    queue(text: string): Promise<void>;
    private processQueue;
    /**
     * Stop current speech
     */
    stop(): Promise<void>;
    /**
     * Get current provider
     */
    getProvider(): string;
    /**
     * Check if playing
     */
    isPlaying(): boolean;
    /**
     * Switch provider dynamically
     */
    switchProvider(config: TTSConfig): Promise<void>;
}
export declare const ttsService: TTSService;
//# sourceMappingURL=tts-service.d.ts.map