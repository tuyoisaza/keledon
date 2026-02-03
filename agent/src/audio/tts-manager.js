/**
 * TTS Manager - Text-to-Speech Response Handler
 * Handles canonical cloud 'say' commands with interruptible speech synthesis
 */

import { TTSFactory } from '../audio/tts/index.js';

export class TTSManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentAdapter = null;
    this.currentAudio = null;
    this.isPlaying = false;
    this.isInterruptible = true;
    this.audioQueue = [];
    this.currentSpeakRequest = null;
    
    // Configuration
    this.config = {
      preferredProvider: 'elevenlabs',
      fallbackProvider: 'local',
      defaultVoice: 'rachel',
      defaultSpeed: 1.0,
      defaultPitch: 0.0,
      volume: 1.0
    };
    
    this.setupEventHandlers();
    console.log('TTSManager: Initialized for production TTS responses');
  }

  setupEventHandlers() {
    // Handle TTS speak requests from WebSocket client
    this.eventBus.on('tts:speak', (payload) => {
      this.handleSpeakRequest(payload);
    });

    // Handle TTS control requests
    this.eventBus.on('tts:stop', () => {
      this.stop();
    });

    this.eventBus.on('tts:pause', () => {
      this.pause();
    });

    this.eventBus.on('tts:resume', () => {
      this.resume();
    });

    // Handle audio events for interruption
    if (typeof Audio !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.isPlaying) {
          this.pause();
        }
      });
    }
  }

  /**
   * Handle canonical cloud 'say' command
   * @param {Object} payload - Cloud command payload
   */
  async handleSpeakRequest(payload) {
    try {
      // Validate anti-demo compliance
      this.validateAntiDemoCompliance(payload);

      console.log(`TTSManager: Processing speak request: "${payload.text}"`);
      
      // Extract TTS options from canonical command
      const speakOptions = {
        text: payload.text,
        voice: payload.voice || this.config.defaultVoice,
        speed: payload.speed || this.config.defaultSpeed,
        pitch: payload.pitch || this.config.defaultPitch,
        volume: payload.volume || this.config.volume,
        interruptible: payload.interruptible !== false // Default to interruptible
      };

      // Check if this should interrupt current speech
      if (speakOptions.interruptible && this.isPlaying) {
        await this.interruptCurrentSpeech();
      }

      // Store current request
      this.currentSpeakRequest = {
        ...speakOptions,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };

      // Initialize TTS adapter if needed
      await this.initializeTTSAdapter();

      // Synthesize and play speech
      await this.synthesizeAndPlay(speakOptions);

      // Report status to Side Panel
      this.reportTTSStatus('speaking', speakOptions);

    } catch (error) {
      console.error('TTSManager: Failed to process speak request', error);
      
      // Anti-demo: show real error, not fake fallback
      this.reportTTSError(error.message);
      
      // Emit error event for logging
      this.eventBus.emit('tts:error', { 
        error: error.message,
        requestId: this.currentSpeakRequest?.requestId,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Initialize TTS adapter with real provider
   */
  async initializeTTSAdapter() {
    if (this.currentAdapter) return;

    try {
      // Try preferred provider first
      const providerConfig = this.getProviderConfig(this.config.preferredProvider);
      
      this.currentAdapter = await TTSFactory.create(this.config.preferredProvider, providerConfig);
      
      // Setup adapter event handlers
      this.currentAdapter.on('playback:started', (data) => {
        this.isPlaying = true;
        this.reportTTSStatus('speaking', data);
      });

      this.currentAdapter.on('playback:completed', (data) => {
        this.isPlaying = false;
        this.reportTTSStatus('ready', data);
        
        // Process next in queue if any
        if (this.audioQueue.length > 0) {
          setTimeout(() => this.processQueue(), 100);
        }
      });

      this.currentAdapter.on('error', (error) => {
        this.isPlaying = false;
        this.reportTTSError(error.message);
      });

      console.log(`TTSManager: Initialized ${this.config.preferredProvider} TTS adapter`);
      
    } catch (error) {
      console.warn(`TTSManager: Failed to initialize ${this.config.preferredProvider}, trying fallback`, error);
      
      // Try fallback provider
      try {
        const fallbackConfig = this.getProviderConfig(this.config.fallbackProvider);
        this.currentAdapter = await TTSFactory.create(this.config.fallbackProvider, fallbackConfig);
        console.log(`TTSManager: Initialized ${this.config.fallbackProvider} fallback TTS adapter`);
      } catch (fallbackError) {
        throw new Error(`Failed to initialize any TTS provider: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider) {
    const configs = {
      elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voice: this.config.defaultVoice,
        model: 'eleven_monolingual_v1',
        language: 'en-US',
        speed: this.config.defaultSpeed,
        pitch: this.config.defaultPitch,
        volume: this.config.volume,
        format: 'mp3',
        outputFormat: 'mp3_44100_128',
        endpoint: 'https://api.elevenlabs.io/v1'
      },
      local: {
        voice: this.config.defaultVoice,
        language: 'en-US',
        rate: this.config.defaultSpeed,
        pitch: this.config.defaultPitch,
        volume: this.config.volume
      }
    };

    return configs[provider] || configs.local;
  }

  /**
   * Synthesize and play speech
   */
  async synthesizeAndPlay(speakOptions) {
    if (!this.currentAdapter) {
      throw new Error('TTS adapter not initialized');
    }

    console.log(`TTSManager: Synthesizing speech for "${speakOptions.text}"`);
    
    // Synthesize speech using real TTS provider
    await this.currentAdapter.speak(speakOptions.text, {
      voice: speakOptions.voice,
      speed: speakOptions.speed,
      pitch: speakOptions.pitch,
      volume: speakOptions.volume,
      interruptible: speakOptions.interruptible
    });
  }

  /**
   * Interrupt current speech playback
   */
  async interruptCurrentSpeech() {
    if (!this.isPlaying || !this.currentAdapter) return;

    console.log('TTSManager: Interrupting current speech');
    
    try {
      await this.currentAdapter.stop();
      this.isPlaying = false;
      this.reportTTSStatus('ready', { reason: 'interrupted' });
    } catch (error) {
      console.error('TTSManager: Failed to interrupt speech', error);
      this.reportTTSError(`Failed to interrupt: ${error.message}`);
    }
  }

  /**
   * Stop current speech
   */
  async stop() {
    if (!this.isPlaying || !this.currentAdapter) return;

    try {
      await this.currentAdapter.stop();
      this.isPlaying = false;
      this.audioQueue = []; // Clear queue
      this.reportTTSStatus('ready', { reason: 'manual_stop' });
      console.log('TTSManager: Speech stopped');
    } catch (error) {
      console.error('TTSManager: Failed to stop speech', error);
      this.reportTTSError(`Failed to stop: ${error.message}`);
    }
  }

  /**
   * Pause current speech
   */
  async pause() {
    if (!this.isPlaying || !this.currentAdapter) return;

    try {
      await this.currentAdapter.pause();
      this.reportTTSStatus('paused', {});
      console.log('TTSManager: Speech paused');
    } catch (error) {
      console.error('TTSManager: Failed to pause speech', error);
      this.reportTTSError(`Failed to pause: ${error.message}`);
    }
  }

  /**
   * Resume paused speech
   */
  async resume() {
    if (!this.currentAdapter) return;

    try {
      await this.currentAdapter.resume();
      this.reportTTSStatus('speaking', { reason: 'resumed' });
      console.log('TTSManager: Speech resumed');
    } catch (error) {
      console.error('TTSManager: Failed to resume speech', error);
      this.reportTTSError(`Failed to resume: ${error.message}`);
    }
  }

  /**
   * Process audio queue
   */
  async processQueue() {
    if (this.audioQueue.length === 0 || this.isPlaying) return;

    const nextRequest = this.audioQueue.shift();
    await this.handleSpeakRequest(nextRequest);
  }

  /**
   * Add speech request to queue
   */
  queueSpeechRequest(speakOptions) {
    this.audioQueue.push(speakOptions);
    
    // Process if not currently speaking
    if (!this.isPlaying) {
      setTimeout(() => this.processQueue(), 50);
    }
  }

  /**
   * Report TTS status to Side Panel and event system
   */
  reportTTSStatus(status, details = {}) {
    const statusData = {
      status,
      timestamp: new Date().toISOString(),
      provider: this.currentAdapter?.config?.provider || 'unknown',
      isPlaying: this.isPlaying,
      queueLength: this.audioQueue.length,
      currentRequest: this.currentSpeakRequest,
      ...details
    };

    // Emit to event bus for Side Panel updates
    this.eventBus.emit('tts:status', statusData);

    // Send to cloud via WebSocket if available
    if (this.eventBus.wsClient && this.eventBus.wsClient.isConnected()) {
      this.eventBus.wsClient.sendBrainEvent('system', {
        type: 'tts_status',
        status: statusData
      });
    }

    console.log(`TTSManager: Status update - ${status}`, details);
  }

  /**
   * Report TTS error
   */
  reportTTSError(errorMessage) {
    const errorData = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      provider: this.currentAdapter?.config?.provider || 'unknown',
      isPlaying: this.isPlaying
    };

    // Emit error events
    this.eventBus.emit('tts:error', errorData);
    this.eventBus.emit('tts:status', { 
      status: 'error', 
      ...errorData 
    });

    // Send to cloud via WebSocket
    if (this.eventBus.wsClient && this.eventBus.wsClient.isConnected()) {
      this.eventBus.wsClient.sendBrainEvent('system', {
        type: 'tts_error',
        error: errorMessage
      });
    }
  }

  /**
   * Validate anti-demo compliance
   */
  validateAntiDemoCompliance(payload) {
    // Validate text is not demo content
    const demoTexts = ['test', 'demo', 'hello world', 'fake tts', 'mock speech'];
    if (demoTexts.some(demo => payload.text.toLowerCase().includes(demo))) {
      throw new Error('ANTI-DEMO VIOLATION: Demo/test TTS text detected in production');
    }

    // Validate payload structure
    if (!payload.text || typeof payload.text !== 'string') {
      throw new Error('ANTI-DEMO VIOLATION: Invalid TTS payload structure');
    }

    // Validate interruptible flag is boolean
    if (payload.interruptible !== undefined && typeof payload.interruptible !== 'boolean') {
      throw new Error('ANTI-DEMO VIOLATION: Invalid interruptible flag');
    }
  }

  /**
   * Get current TTS status
   */
  getStatus() {
    return {
      isInitialized: !!this.currentAdapter,
      isPlaying: this.isPlaying,
      currentProvider: this.currentAdapter?.config?.provider || 'none',
      queueLength: this.audioQueue.length,
      config: this.config,
      currentRequest: this.currentSpeakRequest
    };
  }

  /**
   * Update TTS configuration
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize adapter if provider changed
    if (newConfig.preferredProvider && newConfig.preferredProvider !== this.config.preferredProvider) {
      if (this.currentAdapter) {
        await this.currentAdapter.cleanup();
      }
      this.currentAdapter = null;
    }
    
    console.log('TTSManager: Configuration updated', this.config);
  }

  /**
   * Get available voices
   */
  async getAvailableVoices() {
    if (!this.currentAdapter) {
      await this.initializeTTSAdapter();
    }
    
    try {
      const stats = this.currentAdapter.getStats();
      return stats.voices || [];
    } catch (error) {
      console.error('TTSManager: Failed to get voices', error);
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('TTSManager: Cleaning up resources');
    
    // Stop current speech
    if (this.isPlaying) {
      await this.stop();
    }
    
    // Clear queue
    this.audioQueue = [];
    
    // Cleanup adapter
    if (this.currentAdapter) {
      await this.currentAdapter.cleanup();
      this.currentAdapter = null;
    }
    
    this.currentSpeakRequest = null;
    this.reportTTSStatus('ready', { reason: 'cleanup' });
  }
}