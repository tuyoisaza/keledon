/**
 * WebRTC Adapter - Handles WebRTC calls
 *
 * Manages:
 * - RTCPeerConnection
 * - Audio capture from microphone
 * - Audio output to remote
 * - Call state (ringing, connected, ended)
 */
import { EventEmitter } from 'events';
export interface WebRTCConfig {
    iceServers?: RTCIceServer[];
    audioOnly?: boolean;
}
export interface CallState {
    status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    duration: number;
    peerConnection: RTCPeerConnection | null;
}
export declare class WebRTCAdapter extends EventEmitter {
    private config;
    private peerConnection;
    private localStream;
    private remoteStream;
    private state;
    private durationInterval;
    private startTime;
    constructor(config?: WebRTCConfig);
    /**
     * Initialize call - get local media
     */
    initializeCall(): Promise<MediaStream>;
    /**
     * Create peer connection and handle signaling
     */
    createConnection(): Promise<RTCPeerConnection>;
    /**
     * Handle offer (incoming call)
     */
    handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit>;
    /**
     * Set remote description (outgoing call)
     */
    setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
    /**
     * Add ICE candidate
     */
    addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
    /**
     * Create offer for outgoing call
     */
    createOffer(): Promise<RTCSessionDescriptionInit>;
    /**
     * Mute local audio
     */
    muteAudio(): void;
    /**
     * Unmute local audio
     */
    unmuteAudio(): void;
    /**
     * Put call on hold
     */
    hold(): Promise<void>;
    /**
     * Resume from hold
     */
    resume(): Promise<void>;
    /**
     * End call
     */
    endCall(): Promise<void>;
    /**
     * Get current state
     */
    getState(): CallState;
    /**
     * Get remote stream (for output)
     */
    getRemoteStream(): MediaStream | null;
    /**
     * Get local stream
     */
    getLocalStream(): MediaStream | null;
    private onConnected;
    private onEnded;
}
export declare const webRTCAdapter: WebRTCAdapter;
//# sourceMappingURL=webrtc-adapter.d.ts.map