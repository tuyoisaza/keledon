/**
 * Genesys Adapter - Handles Genesys Pure Cloud calls via API
 *
 * Manages:
 * - API authentication
 * - Call control (answer, hold, transfer, end)
 * - Call state monitoring
 * - Audio path (not WebRTC - uses Genesys telephony)
 */
import { EventEmitter } from 'events';
export interface GenesysConfig {
    apiKey?: string;
    organizationId?: string;
    region?: string;
    endpoint?: string;
}
export interface GenesysCall {
    id: string;
    state: 'alerting' | 'connected' | 'held' | 'disconnected';
    participantId: string;
    phoneNumber?: string;
    direction: 'inbound' | 'outbound';
    startTime?: number;
    duration?: number;
}
export declare class GenesysAdapter extends EventEmitter {
    private config;
    private authToken;
    private currentCall;
    private pollInterval;
    private isConnected;
    constructor(config?: GenesysConfig);
    /**
     * Initialize with configuration
     */
    initialize(config: GenesysConfig): Promise<void>;
    /**
     * Authenticate with Genesys Cloud
     */
    authenticate(): Promise<void>;
    /**
     * Get current call status
     */
    getCurrentCall(): Promise<GenesysCall | null>;
    /**
     * Answer incoming call
     */
    answerCall(callId: string): Promise<void>;
    /**
     * Hold call
     */
    holdCall(callId: string): Promise<void>;
    /**
     * Resume call from hold
     */
    resumeCall(callId: string): Promise<void>;
    /**
     * End call
     */
    endCall(callId: string): Promise<void>;
    /**
     * Transfer call
     */
    transferCall(callId: string, targetNumber: string): Promise<void>;
    /**
     * Start monitoring for new calls (polling)
     */
    startMonitoring(pollIntervalMs?: number): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Get current call
     */
    getCurrentCallState(): GenesysCall | null;
    /**
     * Check if connected
     */
    isAuthenticated(): boolean;
    /**
     * Disconnect
     */
    disconnect(): void;
    private mapGenesysCall;
    private mapState;
}
export declare const genesysAdapter: GenesysAdapter;
//# sourceMappingURL=genesys-adapter.d.ts.map