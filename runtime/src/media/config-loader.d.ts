/**
 * Config Loader - Loads vendor/STT/TTS configuration from Cloud
 *
 * KELEDON Browser needs to know:
 * - sttProvider: vosk | deepgram | webspeech
 * - ttsProvider: elevenlabs | local
 * - vendorAdapter: genesys | avaya | salesforce | web
 * - vendorCredentials: API keys, endpoints
 */
import { EventEmitter } from 'events';
export interface TeamConfig {
    teamId: string;
    sttProvider: 'vosk' | 'deepgram' | 'webspeech';
    ttsProvider: 'elevenlabs' | 'local';
    vendorAdapter: 'genesys' | 'avaya' | 'salesforce' | 'web';
    vendorConfig?: {
        apiKey?: string;
        endpoint?: string;
        region?: string;
    };
    voskConfig?: {
        serverUrl: string;
        model?: string;
        sampleRate?: number;
    };
    elevenlabsConfig?: {
        apiKey?: string;
        voiceId?: string;
    };
}
export interface DeviceConfig {
    deviceId: string;
    organizationId?: string;
    cloudUrl: string;
    authToken: string;
}
export declare class ConfigLoader extends EventEmitter {
    private teamConfig;
    private deviceConfig;
    private isLoaded;
    constructor();
    /**
     * Load configuration from Cloud for this device/organization
     */
    loadFromCloud(deviceConfig: DeviceConfig): Promise<TeamConfig>;
    /**
     * Get current configuration (cached)
     */
    getConfig(): TeamConfig | null;
    /**
     * Get specific provider config
     */
    getSttProvider(): string;
    getTtsProvider(): string;
    getVendorAdapter(): string;
    /**
     * Update config from Cloud (called periodically or on push)
     */
    refresh(): Promise<TeamConfig>;
    /**
     * Check if configuration is loaded
     */
    isConfigured(): boolean;
    /**
     * Get Vosk configuration for STT adapter
     */
    getVoskConfig(): {
        serverUrl: string;
        sampleRate: number;
    };
    /**
     * Get ElevenLabs configuration for TTS adapter
     */
    getElevenLabsConfig(): {
        apiKey: string;
        voiceId: string;
    };
    /**
     * Get vendor configuration
     */
    getVendorConfig(): TeamConfig['vendorConfig'];
}
export declare const configLoader: ConfigLoader;
//# sourceMappingURL=config-loader.d.ts.map