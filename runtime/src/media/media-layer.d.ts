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
import { EventEmitter } from 'events';
import { TeamConfig } from './config-loader';
import { STTService } from './stt-service';
import { TTSService } from './tts-service';
import { WebRTCAdapter } from './adapters/webrtc-adapter';
import { GenesysAdapter } from './adapters/genesys-adapter';
export interface MediaLayerConfig {
    deviceConfig: {
        deviceId: string;
        organizationId?: string;
        cloudUrl: string;
        authToken: string;
    };
}
export interface CallContext {
    sessionId: string;
    teamConfig: TeamConfig;
    startTime: number;
}
export type VendorAdapter = 'webrtc' | 'genesys' | 'avaya';
export declare class MediaLayer extends EventEmitter {
    private configLoader;
    private sttService;
    private ttsService;
    private vad;
    private webRTCAdapter;
    private genesysAdapter;
    private audioCapture;
    private currentVendor;
    private currentCall;
    private isInitialized;
    private useVAD;
    constructor();
    /**
     * Initialize media layer with device configuration
     */
    initialize(config: MediaLayerConfig): Promise<void>;
    private initializeStt;
    private initializeTts;
    private setupEventHandlers;
    /**
     * Start a call - initialize call context and start STT listening
     */
    startCall(sessionId: string): Promise<void>;
    /**
     * Start WebRTC call
     */
    private startWebRTCCall;
    /**
     * Start Genesys call
     */
    private startGenesysCall;
    /**
     * Start STT listening
     */
    private startListening;
    /**
     * Stop call
     */
    stopCall(): Promise<void>;
    /**
     * Speak text response from Cloud
     */
    speak(text: string, options?: {
        voice?: string;
        speed?: number;
        interruptible?: boolean;
    }): Promise<void>;
    /**
     * Stop current speech
     */
    stopSpeaking(): Promise<void>;
    /**
     * Get call status
     */
    getCallStatus(): {
        active: boolean;
        sessionId?: string;
        duration?: number;
        vendor: string;
    };
    /**
     * Mute/unmute
     */
    mute(): void;
    unmute(): void;
    /**
     * Hold/resume
     */
    hold(): Promise<void>;
    resume(): Promise<void>;
    /**
     * Switch vendor dynamically
     */
    switchVendor(vendor: VendorAdapter, config?: any): Promise<void>;
    /**
     * Get vendor adapter for external control
     */
    getVendorAdapter(): WebRTCAdapter | GenesysAdapter;
    /**
     * Get STT service for direct control
     */
    getSTTService(): STTService;
    /**
     * Get TTS service for direct control
     */
    getTTSService(): TTSService;
    /**
     * Check if initialized
     */
    isReady(): boolean;
    /**
     * Cleanup
     */
    cleanup(): Promise<void>;
}
export declare const mediaLayer: MediaLayer;
//# sourceMappingURL=media-layer.d.ts.map