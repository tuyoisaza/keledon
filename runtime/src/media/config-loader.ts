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

export class ConfigLoader extends EventEmitter {
  private teamConfig: TeamConfig | null = null;
  private deviceConfig: DeviceConfig | null = null;
  private isLoaded = false;

  constructor() {
    super();
  }

  /**
   * Load configuration from Cloud for this device/organization
   */
  async loadFromCloud(deviceConfig: DeviceConfig): Promise<TeamConfig> {
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

    } catch (error) {
      console.error('ConfigLoader: Failed to load from cloud:', error);
      this.emit('config:error', error);
      throw error;
    }
  }

  /**
   * Get current configuration (cached)
   */
  getConfig(): TeamConfig | null {
    return this.teamConfig;
  }

  /**
   * Get specific provider config
   */
  getSttProvider(): string {
    return this.teamConfig?.sttProvider || 'vosk';
  }

  getTtsProvider(): string {
    return this.teamConfig?.ttsProvider || 'elevenlabs';
  }

  getVendorAdapter(): string {
    return this.teamConfig?.vendorAdapter || 'web';
  }

  /**
   * Update config from Cloud (called periodically or on push)
   */
  async refresh(): Promise<TeamConfig> {
    if (!this.deviceConfig) {
      throw new Error('No device config loaded');
    }
    return this.loadFromCloud(this.deviceConfig);
  }

  /**
   * Check if configuration is loaded
   */
  isConfigured(): boolean {
    return this.isLoaded && this.teamConfig !== null;
  }

  /**
   * Get Vosk configuration for STT adapter
   */
  getVoskConfig(): { serverUrl: string; sampleRate: number } {
    return {
      serverUrl: this.teamConfig?.voskConfig?.serverUrl || 'ws://localhost:9091',
      sampleRate: this.teamConfig?.voskConfig?.sampleRate || 16000
    };
  }

  /**
   * Get ElevenLabs configuration for TTS adapter
   */
  getElevenLabsConfig(): { apiKey: string; voiceId: string } {
    return {
      apiKey: this.teamConfig?.elevenlabsConfig?.apiKey || '',
      voiceId: this.teamConfig?.elevenlabsConfig?.voiceId || 'rachel'
    };
  }

  /**
   * Get vendor configuration
   */
  getVendorConfig(): TeamConfig['vendorConfig'] {
    return this.teamConfig?.vendorConfig || {};
  }
}

export const configLoader = new ConfigLoader();