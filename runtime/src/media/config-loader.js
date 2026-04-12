"use strict";
/**
 * Config Loader - Loads vendor/STT/TTS configuration from Cloud
 *
 * KELEDON Browser needs to know:
 * - sttProvider: vosk | deepgram | webspeech
 * - ttsProvider: elevenlabs | local
 * - vendorAdapter: genesys | avaya | salesforce | web
 * - vendorCredentials: API keys, endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configLoader = exports.ConfigLoader = void 0;
const events_1 = require("events");
class ConfigLoader extends events_1.EventEmitter {
    constructor() {
        super();
        this.teamConfig = null;
        this.deviceConfig = null;
        this.isLoaded = false;
    }
    /**
     * Load configuration from Cloud for this device/organization
     */
    async loadFromCloud(deviceConfig) {
        this.deviceConfig = deviceConfig;
        try {
            const response = await fetch(`${deviceConfig.cloudUrl}/api/teams/config`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${deviceConfig.authToken}`,
                    'X-Device-ID': deviceConfig.deviceId,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            const config = await response.json();
            this.teamConfig = {
                teamId: config.teamId || 'default',
                sttProvider: config.sttProvider || 'vosk',
                ttsProvider: config.ttsProvider || 'elevenlabs',
                vendorAdapter: config.vendorAdapter || 'web',
                vendorConfig: config.vendorConfig || {},
                voskConfig: config.voskConfig,
                elevenlabsConfig: config.elevenlabsConfig
            };
            this.isLoaded = true;
            this.emit('config:loaded', this.teamConfig);
            return this.teamConfig;
        }
        catch (error) {
            console.error('ConfigLoader: Failed to load from cloud:', error);
            this.emit('config:error', error);
            throw error;
        }
    }
    /**
     * Get current configuration (cached)
     */
    getConfig() {
        return this.teamConfig;
    }
    /**
     * Get specific provider config
     */
    getSttProvider() {
        return this.teamConfig?.sttProvider || 'vosk';
    }
    getTtsProvider() {
        return this.teamConfig?.ttsProvider || 'elevenlabs';
    }
    getVendorAdapter() {
        return this.teamConfig?.vendorAdapter || 'web';
    }
    /**
     * Update config from Cloud (called periodically or on push)
     */
    async refresh() {
        if (!this.deviceConfig) {
            throw new Error('No device config loaded');
        }
        return this.loadFromCloud(this.deviceConfig);
    }
    /**
     * Check if configuration is loaded
     */
    isConfigured() {
        return this.isLoaded && this.teamConfig !== null;
    }
    /**
     * Get Vosk configuration for STT adapter
     */
    getVoskConfig() {
        return {
            serverUrl: this.teamConfig?.voskConfig?.serverUrl || 'ws://localhost:9091',
            sampleRate: this.teamConfig?.voskConfig?.sampleRate || 16000
        };
    }
    /**
     * Get ElevenLabs configuration for TTS adapter
     */
    getElevenLabsConfig() {
        return {
            apiKey: this.teamConfig?.elevenlabsConfig?.apiKey || '',
            voiceId: this.teamConfig?.elevenlabsConfig?.voiceId || 'rachel'
        };
    }
    /**
     * Get vendor configuration
     */
    getVendorConfig() {
        return this.teamConfig?.vendorConfig || {};
    }
}
exports.ConfigLoader = ConfigLoader;
exports.configLoader = new ConfigLoader();
//# sourceMappingURL=config-loader.js.map