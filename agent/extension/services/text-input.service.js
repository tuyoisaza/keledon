/**
 * Text Input Service - Bridges STT output to canonical events
 * Processes speech recognition results and sends text_input events to cloud
 */

import { STTFactory } from '../audio/stt/index.js';
import { EventEmitter } from '../core/event-router.js';

export class TextInputService extends EventEmitter {
  constructor(websocketClient, sessionManager, config = {}) {
    super();
    this.websocketClient = websocketClient;
    this.sessionManager = sessionManager;
    this.config = {
      provider: 'deepgram',
      language: 'en-US',
      confidence_threshold: 0.7,
      silence_timeout: 2000,
      ...config
    };
    
    this.sttAdapter = null;
    this.isActive = false;
    this.lastResultTime = 0;
    this.silenceTimer = null;
    this.currentSession = null;
  }

  /**
   * Initialize text input service
   */
  async initialize() {
    try {
      // Create STT adapter
      this.sttAdapter = await STTFactory.create(this.config.provider, this.config);
      
      // Setup STT event handlers
      this.setupSTTHandlers();
      
      this.emit('initialized', { provider: this.config.provider });
      console.log('TextInputService: Initialized with', this.config.provider);
      
    } catch (error) {
      console.error('TextInputService: Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start text input processing
   * @param {MediaStream} audioStream - Audio stream to process
   */
  async start(audioStream) {
    if (this.isActive) {
      console.warn('TextInputService: Already active');
      return;
    }

    if (!this.sttAdapter) {
      throw new Error('STT adapter not initialized');
    }

    if (!this.websocketClient.isConnected()) {
      throw new Error('WebSocket client not connected');
    }

    try {
      // Get current session
      this.currentSession = this.sessionManager.getCurrentSession();
      if (!this.currentSession) {
        throw new Error('No active session for text input');
      }

      // Start STT processing
      await this.sttAdapter.start(audioStream);
      this.isActive = true;
      
      this.startSilenceTimer();
      
      this.emit('started', { 
        session_id: this.currentSession.id,
        provider: this.config.provider 
      });
      
      console.log('TextInputService: Started text input processing');
      
    } catch (error) {
      console.error('TextInputService: Failed to start:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop text input processing
   */
  async stop() {
    if (!this.isActive) return;

    try {
      if (this.sttAdapter) {
        await this.sttAdapter.stop();
      }

      this.clearSilenceTimer();
      this.isActive = false;
      this.currentSession = null;
      
      this.emit('stopped', {});
      console.log('TextInputService: Stopped text input processing');
      
    } catch (error) {
      console.error('TextInputService: Failed to stop:', error);
      this.emit('error', error);
    }
  }

  /**
   * Setup STT event handlers
   */
  setupSTTHandlers() {
    if (!this.sttAdapter) return;

    // Handle interim results
    this.sttAdapter.on('result:interim', (result) => {
      this.handleInterimResult(result);
    });

    // Handle final results
    this.sttAdapter.on('result:final', (result) => {
      this.handleFinalResult(result);
    });

    // Handle STT errors
    this.sttAdapter.on('error', (error) => {
      this.handleSTTError(error);
    });

    // Handle connection events
    this.sttAdapter.on('connection:opened', () => {
      this.emit('stt:connected', { provider: this.config.provider });
    });

    this.sttAdapter.on('connection:closed', (data) => {
      this.emit('stt:disconnected', data);
    });
  }

  /**
   * Handle interim STT results
   * @param {Object} result - Interim transcription result
   */
  handleInterimResult(result) {
    this.resetSilenceTimer();
    
    this.emit('interim', {
      text: result.text,
      confidence: result.confidence,
      timestamp: result.timestamp
    });
  }

  /**
   * Handle final STT results and emit canonical text_input event
   * @param {Object} result - Final transcription result
   */
  async handleFinalResult(result) {
    // Reset silence timer
    this.resetSilenceTimer();
    this.lastResultTime = Date.now();

    // Filter by confidence threshold
    if (result.confidence < this.config.confidence_threshold) {
      console.log(`TextInputService: Filtered low confidence result: ${result.confidence}`);
      return;
    }

    // Create canonical text_input event payload
    const textInputPayload = {
      text: result.text,
      confidence: result.confidence,
      provider: result.provider,
      metadata: {
        language: result.language,
        model: result.model,
        words: result.words,
        processing_time_ms: Date.now() - new Date(result.timestamp).getTime(),
        session_id: this.currentSession?.id
      }
    };

    try {
      // Send text_input event via WebSocket client
      const success = this.websocketClient.sendBrainEvent('text_input', textInputPayload);
      
      if (success) {
        this.emit('text_input_sent', {
          text: result.text,
          confidence: result.confidence,
          session_id: this.currentSession.id,
          timestamp: new Date().toISOString()
        });
        
        console.log(`TextInputService: Sent text_input event: "${result.text}"`);
      } else {
        throw new Error('Failed to send text_input event');
      }
      
    } catch (error) {
      console.error('TextInputService: Failed to send text_input event:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle STT errors
   * @param {Error} error - STT error
   */
  handleSTTError(error) {
    console.error('TextInputService: STT error:', error);
    this.emit('error', error);
    
    // Send system event about STT failure
    if (this.currentSession && this.websocketClient.isConnected()) {
      const systemPayload = {
        event: 'error',
        data: {
          type: 'stt_error',
          message: error.message,
          provider: this.config.provider,
          timestamp: new Date().toISOString()
        }
      };
      
      this.websocketClient.sendBrainEvent('system', systemPayload);
    }
  }

  /**
   * Start silence detection timer
   */
  startSilenceTimer() {
    this.clearSilenceTimer();
    
    this.silenceTimer = setTimeout(() => {
      if (this.isActive) {
        this.handleSilenceTimeout();
      }
    }, this.config.silence_timeout);
  }

  /**
   * Reset silence detection timer
   */
  resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.startSilenceTimer();
  }

  /**
   * Clear silence detection timer
   */
  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Handle silence timeout
   */
  handleSilenceTimeout() {
    if (!this.isActive) return;

    const timeSinceLastResult = Date.now() - this.lastResultTime;
    
    if (timeSinceLastResult >= this.config.silence_timeout) {
      this.emit('silence_detected', {
        duration: timeSinceLastResult,
        timestamp: new Date().toISOString()
      });
      
      console.log('TextInputService: Silence detected after', timeSinceLastResult, 'ms');
    }
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  async updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Update STT adapter if provider changed
    if (oldConfig.provider !== this.config.provider && this.sttAdapter) {
      await this.sttAdapter.cleanup();
      this.sttAdapter = await STTFactory.create(this.config.provider, this.config);
      this.setupSTTHandlers();
      
      if (this.isActive) {
        // Restart with new provider (requires audio stream)
        this.emit('provider_changed', { 
          oldProvider: oldConfig.provider, 
          newProvider: this.config.provider 
        });
      }
    }

    // Update STT adapter config
    if (this.sttAdapter) {
      await this.sttAdapter.updateConfig(this.config);
    }

    this.emit('config_updated', { oldConfig, newConfig: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get STT statistics
   */
  getStats() {
    if (!this.sttAdapter) {
      return { isActive: false, provider: null };
    }

    return {
      isActive: this.isActive,
      provider: this.config.provider,
      sttStats: this.sttAdapter.getStats(),
      websocketConnected: this.websocketClient.isConnected(),
      currentSession: this.currentSession?.id || null,
      lastResultTime: this.lastResultTime,
      timeSinceLastResult: this.lastResultTime ? Date.now() - this.lastResultTime : null
    };
  }

  /**
   * Check if service is active
   */
  isProcessing() {
    return this.isActive && this.sttAdapter?.isReady();
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.stop();
      
      if (this.sttAdapter) {
        await this.sttAdapter.cleanup();
        this.sttAdapter = null;
      }
      
      this.clearSilenceTimer();
      this.removeAllListeners();
      
      console.log('TextInputService: Cleaned up');
      
    } catch (error) {
      console.error('TextInputService: Error during cleanup:', error);
    }
  }
}