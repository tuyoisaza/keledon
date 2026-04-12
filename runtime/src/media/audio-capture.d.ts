/**
 * Audio Capture - Captures audio from various sources
 *
 * Sources:
 * - Microphone (getUserMedia)
 * - System audio (via CDP for Electron)
 * - Tab audio (via CDP for Electron)
 */
import { EventEmitter } from 'events';
export interface AudioCaptureConfig {
    source: 'microphone' | 'tab' | 'system';
    sampleRate?: number;
    channelCount?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
}
export interface AudioChunk {
    data: Float32Array;
    timestamp: number;
    duration: number;
}
export declare class AudioCapture extends EventEmitter {
    private config;
    private audioContext;
    private stream;
    private sourceNode;
    private processorNode;
    private isCapturing;
    constructor(config?: Partial<AudioCaptureConfig>);
    /**
     * Start capturing audio from microphone
     */
    startMicrophoneCapture(): Promise<void>;
    /**
     * Start capturing from Electron BrowserWindow tab via CDP
     * This requires CDP connection to Electron's browser window
     */
    startTabCapture(cdpUrl: string): Promise<void>;
    /**
     * Setup audio processing pipeline
     */
    private setupAudioPipeline;
    /**
     * Stop capturing
     */
    stop(): Promise<void>;
    /**
     * Get current stream (for WebRTC or other use)
     */
    getStream(): MediaStream | null;
    /**
     * Check if capturing
     */
    isActive(): boolean;
    /**
     * Set volume level (0-1)
     */
    setVolume(level: number): void;
    /**
     * Mute audio
     */
    mute(): void;
    /**
     * Unmute audio
     */
    unmute(): void;
}
export declare const audioCapture: AudioCapture;
//# sourceMappingURL=audio-capture.d.ts.map