/**
 * STT Service - Speech-to-Text factory with multiple providers
 *
 * Supported providers:
 * - vosk: WebSocket-based, requires Vosk server
 * - deepgram: HTTP streaming, requires API key
 * - webspeech: Browser Web Speech API (fallback)
 */
import { EventEmitter } from 'events';
export interface STTConfig {
    provider: 'vosk' | 'deepgram' | 'webspeech';
    serverUrl?: string;
    apiKey?: string;
    language?: string;
    sampleRate?: number;
}
export interface TranscriptResult {
    text: string;
    confidence: number;
    is_final: boolean;
    timestamp: number;
}
export interface STTAdapter {
    initialize(config: STTConfig): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    onTranscript(callback: (result: TranscriptResult) => void): void;
    onError(callback: (error: Error) => void): void;
}
export declare class VoskAdapter implements STTAdapter {
    private ws;
    private config;
    private transcriptCallback;
    private errorCallback;
    private isRunning;
    private reconnectAttempts;
    private maxReconnectAttempts;
    initialize(config: STTConfig): Promise<void>;
    start(): Promise<void>;
    private attemptReconnect;
    stop(): Promise<void>;
    onTranscript(callback: (result: TranscriptResult) => void): void;
    onError(callback: (error: Error) => void): void;
}
export declare class DeepgramAdapter implements STTAdapter {
    private config;
    private mediaStream;
    private transcriptCallback;
    private errorCallback;
    private isRunning;
    private socket;
    initialize(config: STTConfig): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    onTranscript(callback: (result: TranscriptResult) => void): void;
    onError(callback: (error: Error) => void): void;
}
export declare class WebSpeechAdapter implements STTAdapter {
    private config;
    private recognition;
    private transcriptCallback;
    private errorCallback;
    private isRunning;
    initialize(config: STTConfig): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    onTranscript(callback: (result: TranscriptResult) => void): void;
    onError(callback: (error: Error) => void): void;
}
export declare class STTService extends EventEmitter {
    private adapter;
    private currentProvider;
    private config;
    /**
     * Initialize STT service with a provider
     */
    initialize(config: STTConfig): Promise<void>;
    /**
     * Start listening
     */
    start(): Promise<void>;
    /**
     * Stop listening
     */
    stop(): Promise<void>;
    /**
     * Get current provider
     */
    getProvider(): string;
    /**
     * Check if running
     */
    isRunning(): boolean;
    /**
     * Switch provider dynamically
     */
    switchProvider(config: STTConfig): Promise<void>;
}
export declare const sttService: STTService;
//# sourceMappingURL=stt-service.d.ts.map