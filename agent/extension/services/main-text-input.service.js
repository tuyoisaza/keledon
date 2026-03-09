/**
 * Main Text Input Flow Service - Complete Implementation
 * Provides simple API for the full text input pipeline
 */

import { TextInputIntegrationService } from './text-input-integration.service.js';
import { EventEmitter } from '../core/event-router.js';

export class MainTextInputService extends EventEmitter {
  constructor(websocketClient, sessionManager, config = {}) {
    super();
    this.websocketClient = websocketClient;
    this.sessionManager = sessionManager;
    // Get cloud URL from config or default
    const getCloudUrl = () => {
      if (typeof window !== 'undefined' && window.AGENT_CONFIG?.WS_URL) {
        return window.AGENT_CONFIG.WS_URL;
      }
      if (typeof process !== 'undefined' && process.env?.KELEDON_CLOUD_BASE_URL) {
        return process.env.KELEDON_CLOUD_BASE_URL.replace(/^https?:\/\//i, 'wss://').replace(':3001', ':3011');
      }
      return 'ws://localhost:3011';
    };
    this.config = {
      // Cloud connection config
      cloud_url: getCloudUrl(),
      
      // Audio capture config
      auto_start: false,
      request_permissions_on_init: true,
      
      // STT config
      stt_provider: 'deepgram',
      stt_language: 'en-US',
      confidence_threshold: 0.7,
      silence_timeout: 2000,
      
      // Integration config
      auto_reconnect: true,
      auto_recovery: true,
      
      ...config
    };
    
    this.textInputIntegration = null;
    this.isInitialized = false;
    this.isActive = false;
  }

  /**
   * Initialize main text input service
   */
  async initialize() {
    try {
      this.emit('initializing', {});
      
      // Create text input integration service
      this.textInputIntegration = new TextInputIntegrationService(
        this.websocketClient,
        this.sessionManager,
        {
          auto_start: this.config.auto_start,
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          stt: {
            provider: this.config.stt_provider,
            language: this.config.stt_language,
            confidence_threshold: this.config.confidence_threshold,
            silence_timeout: this.config.silence_timeout
          }
        }
      );
      
      // Setup integration event handlers
      this.setupIntegrationHandlers();
      
      // Initialize the integration service
      await this.textInputIntegration.initialize();
      
      // Request permissions if configured
      if (this.config.request_permissions_on_init) {
        const permissionsGranted = await this.textInputIntegration.requestPermissions();
        if (!permissionsGranted) {
          throw new Error('Microphone permissions denied');
        }
      }
      
      this.isInitialized = true;
      
      this.emit('initialized', { 
        config: this.config,
        capabilities: this.getCapabilities()
      });
      
      console.log('MainTextInputService: Initialized successfully');
      
    } catch (error) {
      console.error('MainTextInputService: Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start complete text input flow
   */
  async start() {
    if (this.isActive) {
      console.warn('MainTextInputService: Already active');
      return;
    }

    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      this.emit('starting', {});
      
      // Start the integration service
      await this.textInputIntegration.start();
      this.isActive = true;
      
      this.emit('started', { 
        session_id: this.sessionManager.getCurrentSession()?.id,
        config: this.config
      });
      
      console.log('MainTextInputService: Started text input flow');
      
    } catch (error) {
      console.error('MainTextInputService: Failed to start:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop text input flow
   */
  async stop() {
    if (!this.isActive) return;

    try {
      this.emit('stopping', {});
      
      await this.textInputIntegration.stop();
      this.isActive = false;
      
      this.emit('stopped', {});
      console.log('MainTextInputService: Stopped text input flow');
      
    } catch (error) {
      console.error('MainTextInputService: Failed to stop:', error);
      this.emit('error', error);
    }
  }

  /**
   * Setup event handlers for integration service
   */
  setupIntegrationHandlers() {
    if (!this.textInputIntegration) return;

    // Pass through all events with additional context
    this.textInputIntegration.on('text_input', (data) => {
      this.emit('text_input', {
        ...data,
        service: 'main_text_input',
        timestamp: new Date().toISOString()
      });
    });

    this.textInputIntegration.on('interim_transcript', (data) => {
      this.emit('interim_transcript', {
        ...data,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('silence_detected', (data) => {
      this.emit('silence_detected', {
        ...data,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('stt_connected', (data) => {
      this.emit('stt_connected', {
        ...data,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('stt_disconnected', (data) => {
      this.emit('stt_disconnected', {
        ...data,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('audio_error', (error) => {
      this.emit('audio_error', {
        ...error,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('stt_error', (error) => {
      this.emit('stt_error', {
        ...error,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('permissions_denied', (data) => {
      this.emit('permissions_denied', {
        ...data,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('audio_device_changed', (data) => {
      this.emit('audio_device_changed', {
        ...data,
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('websocket_connected', () => {
      this.emit('websocket_connected', {
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('websocket_disconnected', () => {
      this.emit('websocket_disconnected', {
        service: 'main_text_input'
      });
    });

    this.textInputIntegration.on('status_changed', (data) => {
      this.emit('status_changed', {
        ...data,
        service: 'main_text_input'
      });
    });
  }

  /**
   * Get service capabilities
   * @returns {Object} Available capabilities
   */
  getCapabilities() {
    return {
      audio_capture: true,
      speech_to_text: true,
      real_time_transcription: true,
      confidence_filtering: true,
      silence_detection: true,
      multiple_providers: true,
      automatic_reconnection: this.config.auto_reconnect,
      automatic_recovery: this.config.auto_recovery,
      permission_management: true,
      device_management: true
    };
  }

  /**
   * Get current status
   * @returns {Object} Current status
   */
  getStatus() {
    if (!this.textInputIntegration) {
      return {
        initialized: this.isInitialized,
        active: this.isActive,
        capabilities: this.getCapabilities(),
        components: {
          integration: null
        }
      };
    }

    const integrationStatus = this.textInputIntegration.getStatus();
    
    return {
      initialized: this.isInitialized,
      active: this.isActive,
      config: this.config,
      capabilities: this.getCapabilities(),
      components: {
        integration: integrationStatus,
        websocket: {
          connected: this.websocketClient.isConnected(),
          url: this.config.cloud_url
        },
        session: {
          current: this.sessionManager.getCurrentSession()?.id || null,
          state: this.sessionManager.getCurrentSession()?.state || 'none'
        }
      }
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  async updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    try {
      if (this.textInputIntegration) {
        const integrationConfig = {
          auto_start: this.config.auto_start,
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          stt: {
            provider: this.config.stt_provider,
            language: this.config.stt_language,
            confidence_threshold: this.config.confidence_threshold,
            silence_timeout: this.config.silence_timeout
          }
        };
        
        await this.textInputIntegration.updateConfig(integrationConfig);
      }

      this.emit('config_updated', { oldConfig, newConfig: this.config });
      
    } catch (error) {
      // Revert config on error
      this.config = oldConfig;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Request microphone permissions
   * @returns {Promise<boolean>} Permission granted
   */
  async requestPermissions() {
    if (!this.textInputIntegration) {
      throw new Error('Text input integration not initialized');
    }

    return await this.textInputIntegration.requestPermissions();
  }

  /**
   * Check microphone permissions
   * @returns {Promise<string>} Permission state
   */
  async checkPermissions() {
    if (!this.textInputIntegration) {
      throw new Error('Text input integration not initialized');
    }

    return await this.textInputIntegration.checkPermissions();
  }

  /**
   * Get available audio devices
   * @returns {Promise<MediaDeviceInfo[]>} List of devices
   */
  async getAudioDevices() {
    if (!this.textInputIntegration) {
      throw new Error('Text input integration not initialized');
    }

    return await this.textInputIntegration.getAudioDevices();
  }

  /**
   * Set audio input device
   * @param {string} deviceId - Device ID
   */
  async setAudioDevice(deviceId) {
    if (!this.textInputIntegration) {
      throw new Error('Text input integration not initialized');
    }

    return await this.textInputIntegration.setAudioDevice(deviceId);
  }

  /**
   * Test the complete text input pipeline
   * @returns {Promise<Object>} Test results
   */
  async testPipeline() {
    const testResults = {
      timestamp: new Date().toISOString(),
      components: {},
      overall: false
    };

    try {
      // Test WebSocket connection
      testResults.components.websocket = this.websocketClient.isConnected();
      
      // Test session
      testResults.components.session = !!this.sessionManager.getCurrentSession();
      
      // Test permissions
      if (this.textInputIntegration) {
        testResults.components.permissions = await this.textInputIntegration.checkPermissions();
        
        // Test audio devices
        testResults.components.audio_devices = await this.textInputIntegration.getAudioDevices();
        testResults.components.audio_device_count = testResults.components.audio_devices.length;
      }
      
      // Overall test result
      testResults.overall = Object.values(testResults.components).every(
        value => typeof value === 'boolean' ? value : value !== null && value !== undefined
      );
      
    } catch (error) {
      testResults.error = error.message;
    }

    return testResults;
  }

  /**
   * Get diagnostic information
   * @returns {Object} Diagnostic data
   */
  getDiagnostics() {
    return {
      timestamp: new Date().toISOString(),
      service: 'MainTextInputService',
      version: '1.0.0',
      config: this.config,
      status: this.getStatus(),
      capabilities: this.getCapabilities(),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        languages: navigator.languages,
        mediaDevices: 'mediaDevices' in navigator,
        webSocket: 'WebSocket' in window
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.stop();
      
      if (this.textInputIntegration) {
        await this.textInputIntegration.cleanup();
        this.textInputIntegration = null;
      }
      
      this.removeAllListeners();
      
      console.log('MainTextInputService: Cleaned up');
      
    } catch (error) {
      console.error('MainTextInputService: Error during cleanup:', error);
    }
  }
}

// Export factory function for easy instantiation
export function createMainTextInputService(websocketClient, sessionManager, config = {}) {
  return new MainTextInputService(websocketClient, sessionManager, config);
}
