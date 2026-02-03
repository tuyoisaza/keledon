/**
 * STT Manager - Bridges Speech-to-Text with Cloud Events
 * Handles audio capture, STT processing, and text_input event emission
 */

export class STTManager {
  constructor(sessionManager, webSocketClient) {
    this.sessionManager = sessionManager;
    this.webSocketClient = webSocketClient;
    this.sttAdapter = null;
    this.audioStream = null;
    this.isActive = false;
    this.status = 'ready'; // ready | listening | processing | error | degraded
    this.config = {
      provider: 'deepgram',
      language: 'en-US',
      model: 'nova-2',
      apiKey: '',
      ...this.getEnvironmentConfig()
    };
    
    // State tracking for Side Panel
    this.stats = {
      transcriptsReceived: 0,
      eventsEmitted: 0,
      errors: 0,
      lastTranscriptTime: null
    };
  }

  /**
   * Get configuration from environment
   */
  getEnvironmentConfig() {
    // Anti-demo: Get real config from environment, not hardcoded
    return {
      apiKey: process.env.DEEPGRAM_API_KEY || '',
      provider: process.env.STT_PROVIDER || 'deepgram',
      language: process.env.STT_LANGUAGE || 'en-US'
    };
  }

  /**
   * Initialize STT manager
   */
  async initialize() {
    try {
      // Validate anti-demo requirements
      if (!this.config.apiKey) {
        throw new Error('STT API key is required (anti-demo: no fake keys)');
      }

      // Load STT adapter dynamically based on provider
      const { DeepgramSTT } = await import('./stt/deepgram.js');
      this.sttAdapter = new DeepgramSTT(this.config);

      // Set up STT event handlers
      this.setupSTTEventHandlers();

      // Initialize adapter
      await this.sttAdapter.initialize();

      this.status = 'ready';
      this.emit('stt:initialized', { 
        provider: this.config.provider,
        config: this.config 
      });

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('stt:error', error);
      throw error;
    }
  }

  /**
   * Set up STT adapter event handlers
   */
  setupSTTEventHandlers() {
    if (!this.sttAdapter) return;

    // Handle interim transcripts (for visual feedback)
    this.sttAdapter.on('result:interim', (result) => {
      this.status = 'processing';
      this.stats.transcriptsReceived++;
      
      this.emit('stt:interim', {
        text: result.text,
        confidence: result.confidence
      });
    });

    // Handle final transcripts - emit text_input events
    this.sttAdapter.on('result:final', (result) => {
      this.handleFinalTranscript(result);
    });

    // Handle STT errors
    this.sttAdapter.on('error', (error) => {
      this.status = 'error';
      this.stats.errors++;
      this.emit('stt:error', error);
    });

    // Handle connection events
    this.sttAdapter.on('connection:opened', () => {
      this.status = 'listening';
      this.emit('stt:listening', {});
    });

    this.sttAdapter.on('connection:closed', () => {
      this.status = 'ready';
      this.emit('stt:stopped', {});
    });
  }

  /**
   * Handle final transcript - emit canonical text_input event
   */
  async handleFinalTranscript(result) {
    try {
      // Anti-demo: Validate we have real content
      if (!result.text || result.text.trim().length === 0) {
        console.warn('Empty transcript received, skipping');
        return;
      }

      const session = this.sessionManager.getCurrentSession();
      if (!session) {
        console.warn('No active session for text_input event');
        return;
      }

      // Create canonical text_input event
      const textInputEvent = {
        session_id: session.id,
        event_type: 'text_input',
        payload: {
          text: result.text.trim(),
          confidence: result.confidence,
          provider: result.provider,
          language: result.language,
          model: result.model,
          metadata: {
            ...result.metadata,
            agent_id: this.getAgentId(),
            timestamp: new Date().toISOString()
          }
        },
        ts: new Date().toISOString(),
        agent_id: this.getAgentId()
      };

      // Send to cloud via WebSocket
      const sent = this.webSocketClient.sendBrainEvent('text_input', textInputEvent.payload);
      
      if (sent) {
        this.stats.eventsEmitted++;
        this.stats.lastTranscriptTime = new Date().toISOString();
        
        this.emit('stt:text_input_sent', {
          text: result.text,
          session_id: session.id,
          event_id: textInputEvent.session_id
        });
      } else {
        throw new Error('Failed to send text_input event');
      }

    } catch (error) {
      this.status = 'degraded';
      this.stats.errors++;
      this.emit('stt:error', new Error(`Failed to handle transcript: ${error.message}`));
    }
  }

  /**
   * Start STT processing
   */
  async start() {
    if (this.isActive) {
      console.warn('STT manager is already active');
      return;
    }

    if (!this.sttAdapter) {
      throw new Error('STT manager not initialized');
    }

    try {
      // Request microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Start STT processing
      await this.sttAdapter.start(this.audioStream);
      
      this.isActive = true;
      this.status = 'listening';
      
      this.emit('stt:started', {
        provider: this.config.provider,
        audioConstraints: {
          sampleRate: 16000,
          channelCount: 1
        }
      });

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('stt:error', error);
      throw error;
    }
  }

  /**
   * Stop STT processing
   */
  async stop() {
    if (!this.isActive) {
      return;
    }

    try {
      // Stop STT adapter
      if (this.sttAdapter) {
        await this.sttAdapter.stop();
      }

      // Stop audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      this.isActive = false;
      this.status = 'ready';
      
      this.emit('stt:stopped', {});

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('stt:error', error);
      throw error;
    }
  }

  /**
   * Get STT status for Side Panel
   */
  getStatus() {
    return {
      status: this.status,
      isActive: this.isActive,
      provider: this.config.provider,
      language: this.config.language,
      stats: { ...this.stats },
      config: {
        provider: this.config.provider,
        language: this.config.language,
        model: this.config.model
        // Don't expose API key in status
      }
    };
  }

  /**
   * Update STT configuration
   */
  async updateConfig(newConfig) {
    const wasActive = this.isActive;
    
    try {
      // Stop if active
      if (wasActive) {
        await this.stop();
      }

      // Update config
      this.config = { ...this.config, ...newConfig };

      // Reinitialize
      await this.initialize();

      // Restart if was active
      if (wasActive) {
        await this.start();
      }

      this.emit('stt:config_updated', { oldConfig: this.config, newConfig });

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('stt:error', error);
      throw error;
    }
  }

  /**
   * Get agent ID
   */
  getAgentId() {
    // Use session agent_id or generate stable ID
    const session = this.sessionManager.getCurrentSession();
    return session?.agent_id || 'Agent-STT-' + crypto.randomUUID().slice(0, 8);
  }

  /**
   * Test STT functionality
   */
  async test() {
    try {
      if (!this.sttAdapter) {
        await this.initialize();
      }

      // Test would involve checking API connectivity
      const isReady = this.sttAdapter.validateAPIKey?.(this.config.apiKey) || false;
      
      this.emit('stt:test_complete', { isReady });
      return isReady;

    } catch (error) {
      this.emit('stt:test_failed', { error: error.message });
      return false;
    }
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = new Map();
    }
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (!this.eventHandlers || !this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in STT manager event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.stop();
    
    if (this.sttAdapter) {
      await this.sttAdapter.cleanup();
      this.sttAdapter = null;
    }

    if (this.eventHandlers) {
      this.eventHandlers.clear();
    }

    this.status = 'ready';
    this.isActive = false;
  }
}