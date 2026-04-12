/**
 * VAD - Voice Activity Detection
 *
 * Detects when user is speaking to trigger STT processing
 * Uses audio level thresholding
 */
import { EventEmitter } from 'events';
export interface VADConfig {
    threshold: number;
    minSpeechDuration: number;
    silenceTimeout: number;
    sampleRate: number;
}
export interface VADState {
    isSpeaking: boolean;
    speechStartTime: number | null;
    audioLevel: number;
}
export declare class VoiceActivityDetector extends EventEmitter {
    private config;
    private audioContext;
    private analyser;
    private stream;
    private isRunning;
    private currentState;
    private silenceTimer;
    constructor(config?: Partial<VADConfig>);
    /**
     * Initialize VAD with audio stream
     */
    initialize(stream: MediaStream): Promise<void>;
    /**
     * Start voice detection
     */
    start(): void;
    /**
     * Stop voice detection
     */
    stop(): Promise<void>;
    /**
     * Get current state
     */
    getState(): VADState;
    /**
     * Get audio level (0-255)
     */
    private getAudioLevel;
    /**
     * Main detection loop
     */
    private detect;
    /**
     * Update threshold dynamically
     */
    setThreshold(value: number): void;
    /**
     * Calibrate - listen for ambient noise and set threshold
     */
    calibrate(durationMs?: number): Promise<number>;
}
export declare const vad: VoiceActivityDetector;
//# sourceMappingURL=vad.d.ts.map