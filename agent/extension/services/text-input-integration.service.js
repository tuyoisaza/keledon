/**
 * Text Input Integration Service - Orchestrates complete text input flow
 * Coordinates audio capture, STT processing, and cloud communication
 */

import { AudioCaptureService } from './audio-capture.service.js';
import { TextInputService } from './text-input.service.js';
import { EventEmitter } from '../core/event-router.js';

export class TextInputIntegrationService extends EventEmitter {
  constructor(websocketClient, sessionManager, config = {}) {
    super();
    this.websocketClient = websocketClient;
    this.sessionManager = sessionManager;
    this.config = {
      auto_start: false,
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      stt: {
        provider: 'deepgram',
        language: 'en-US',
        confidence_threshold: 0.7,
        silence_timeout: 2000
      },
      ...config
    };
    
    this.audioCapture = null;
    this.textInput = null;
    this.isActive = false;
    this.isInitialized = false;
  }

  /**
   * Initialize text input integration
   */
  async initialize() {
    try {
      this.emit('initializing', {});
      
      // Create audio capture service
      this.audioCapture = new AudioCaptureService(this.config.audio);
      
      // Create text input service
      this.textInput = new TextInputService(
        this.websocketClient, 
        this.sessionManager, 
        this.config.stt
      );
      
      // Setup service event handlers
      this.setupServiceHandlers();
      
      // Initialize both services
      await this.audioCapture.initialize();
      await this.textInput.initialize();
      
      this.isInitialized = true;
      
      this.emit('initialized', { 
        audioConfig: this.config.audio,
        sttConfig: this.config.stt
      });
      
      console.log('TextInputIntegrationService: Initialized');
      
    } catch (error) {
      console.error('TextInputIntegrationService: Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start complete text input flow
   */
  async start() {
    if (this.isActive) {
      console.warn('TextInputIntegrationService: Already active');
      return;
    }

    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      this.emit('starting', {});
      
      // Start audio capture
      const audioStream = await this.audioCapture.start();
      
      // Start text input processing
      await this.textInput.start(audioStream);
      
      this.isActive = true;
      
      this.emit('started', { 
        session_id: this.sessionManager.getCurrentSession()?.id,
        audio_stream_id: audioStream.id,
        stt_provider: this.config.stt.provider
      });
      
      console.log('TextInputIntegrationService: Started text input flow');
      
    } catch (error) {
      console.error('TextInputIntegrationService: Failed to start:', error);
      this.emit('error', error);
      
      // Attempt cleanup on failure
      await this.stop();
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
      
      // Stop text input first
      if (this.textInput) {
        await this.textInput.stop();
      }
      
      // Stop audio capture
      if (this.audioCapture) {
        this.audioCapture.stop();
      }
      
      this.isActive = false;
      
      this.emit('stopped', {});
      console.log('TextInputIntegrationService: Stopped text input flow');
      
    } catch (error) {
      console.error('TextInputIntegrationService: Failed to stop:', error);
      this.emit('error', error);
    }
  }

  /**
   * Setup event handlers for both services
   */
  setupServiceHandlers() {
    if (!this.audioCapture || !this.textInput) return;

    // Audio capture events
    this.audioCapture.on('error', (error) => {
      this.emit('audio_error', error);
      this.handleAudioError(error);
    });

    this.audioCapture.on('permissions_denied', (data) => {
      this.emit('permissions_denied', data);
    });

    this.audioCapture.on('device_changed', (data) => {
      this.emit('audio_device_changed', data);
    });

    // Text input events
    this.textInput.on('text_input_sent', (data) => {
      this.emit('text_input', data);
    });

    this.textInput.on('interim', (data) => {
      this.emit('interim_transcript', data);
    });

    this.textInput.on('silence_detected', (data) => {
      this.emit('silence_detected', data);
    });

    this.textInput.on('error', (error) => {
      this.emit('stt_error', error);
      this.handleSTTError(error);
    });

    this.textInput.on('stt:connected', (data) => {
      this.emit('stt_connected', data);
    });

    this.textInput.on('stt:disconnected', (data) => {
      this.emit('stt_disconnected', data);
    });

    // WebSocket client events
    this.websocketClient.on('connection:established', () => {
      this.emit('websocket_connected', {});
    });

    this.websocketClient.on('connection:closed', () => {
      this.emit('websocket_disconnected', {});
      if (this.isActive) {
        this.handleWebSocketDisconnection();
      }
    });
  }

  /**
   * Handle audio capture errors
   * @param {Error} error - Audio error
   */
  async handleAudioError(error) {
    console.error('TextInputIntegrationService: Audio error:', error);
    
    // Send system event about audio failure
    if (this.websocketClient.isConnected()) {
      const systemPayload = {
        event: 'error',
        data: {
          type: 'audio_capture_error',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
      
      this.websocketClient.sendBrainEvent('system', systemPayload);
    }

    // Stop processing on audio errors
    await this.stop();
  }

  /**
   * Handle STT errors
   * @param {Error} error - STT error
   */
  async handleSTTError(error) {
    console.error('TextInputIntegrationService: STT error:', error);
    
    // Try to restart STT on transient errors
    if (this.isActive && this.isTransientSTTError(error)) {
      console.log('TextInputIntegrationService: Attempting STT recovery...');
      
      try {
        // Restart text input service only
        if (this.audioCapture.getStream()) {
          await this.textInput.stop();
          await this.textInput.start(this.audioCapture.getStream());
        }
      } catch (recoveryError) {
        console.error('TextInputIntegrationService: STT recovery failed:', recoveryError);
        await this.stop();
      }
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleWebSocketDisconnection() {
    console.log('TextInputIntegrationService: WebSocket disconnected, pausing text input');
    
    // Pause text input but keep audio capture ready
    if (this.textInput) {
      await this.textInput.stop();
    }
    
    this.isActive = false;
    
    // Emit status change
    this.emit('status_changed', { 
      status: 'paused', 
      reason: 'websocket_disconnected' 
    });
  }

  /**
   * Check if STT error is transient (can be recovered)
   * @param {Error} error - STT error
   * @returns {boolean} Whether error is transient
   */
  isTransientSTTError(error) {
    const transientMessages = [
      'network',
      'timeout',
      'connection',
      'temporary'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return transientMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Resume text input flow after pause
   */
  async resume() {
    if (this.isActive) {
      console.warn('TextInputIntegrationService: Already active');
      return;
    }

    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      // Check if we can resume
      if (!this.websocketClient.isConnected()) {
        throw new Error('WebSocket client not connected');
      }

      if (!this.audioCapture.getStream()) {
        throw new Error('No audio stream available');
      }

      // Resume text input processing
      await this.textInput.start(this.audioCapture.getStream());
      this.isActive = true;
      
      this.emit('resumed', { 
        session_id: this.sessionManager.getCurrentSession()?.id 
      });
      
      console.log('TextInputIntegrationService: Resumed text input flow');
      
    } catch (error) {
      console.error('TextInputIntegrationService: Failed to resume:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  async updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    try {
      // Update audio config
      if (newConfig.audio && this.audioCapture) {
        await this.audioCapture.updateConfig(newConfig.audio);
      }

      // Update STT config
      if (newConfig.stt && this.textInput) {
        await this.textInput.updateConfig(newConfig.stt);
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
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get integration status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      active: this.isActive,
      audio: this.audioCapture ? {
        recording: this.audioCapture.isRecording(),
        stats: this.audioCapture.getStreamStats()
      } : null,
      stt: this.textInput ? this.textInput.getStats() : null,
      websocket: this.websocketClient.isConnected(),
      current_session: this.sessionManager.getCurrentSession()?.id || null
    };
  }

  /**
   * Request microphone permissions
   * @returns {Promise<boolean>} Permission granted
   */
  async requestPermissions() {
    if (!this.audioCapture) {
      throw new Error('Audio capture service not initialized');
    }

    return await this.audioCapture.requestPermissions();
  }

  /**
   * Check microphone permissions
   * @returns {Promise<string>} Permission state
   */
  async checkPermissions() {
    if (!this.audioCapture) {
      throw new Error('Audio capture service not initialized');
    }

    return await this.audioCapture.checkPermissions();
  }

  /**
   * Get available audio devices
   * @returns {Promise<MediaDeviceInfo[]>} List of devices
   */
  async getAudioDevices() {
    if (!this.audioCapture) {
      throw new Error('Audio capture service not initialized');
    }

    return await this.audioCapture.getAudioDevices();
  }

  /**
   * Set audio input device
   * @param {string} deviceId - Device ID
   */
  async setAudioDevice(deviceId) {
    if (!this.audioCapture) {
      throw new Error('Audio capture service not initialized');
    }

    const wasActive = this.isActive;
    
    if (wasActive) {
      await this.stop();
    }

    await this.audioCapture.setAudioDevice(deviceId);

    if (wasActive && this.config.auto_start) {
      await this.start();
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.stop();
      
      if (this.audioCapture) {
        await this.audioCapture.cleanup();
        this.audioCapture = null;
      }
      
      if (this.textInput) {
        await this.textInput.cleanup();
        this.textInput = null;
      }
      
      this.removeAllListeners();
      
      console.log('TextInputIntegrationService: Cleaned up');
      
    } catch (error) {
      console.error('TextInputIntegrationService: Error during cleanup:', error);
    }
  }
}