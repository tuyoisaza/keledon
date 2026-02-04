/**
 * TTS Manager - Text-to-Speech with Interruptible Support
 * Handles Cloud 'say' commands with real-time speech synthesis
 */

export class TTSManager {
  constructor(sessionManager, webSocketClient) {
    this.sessionManager = sessionManager;
    this.webSocketClient = webSocketClient;
    this.ttsProvider = null;
    this.isActive = false;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.interruptible = true;
    this.status = 'ready'; // ready | speaking | error | degraded
    this.config = {
      provider: 'elevenlabs',
      voiceId: 'default',
      apiKey: '',
      ...this.getEnvironmentConfig()
    };
    
    // State tracking for Side Panel
    this.stats = {
      speechesCompleted: 0,
      speechesInterrupted: 0,
      errors: 0,
      lastSpeechTime: null
    };
  }

  /**
   * Get configuration from environment (anti-demo)
   */
  getEnvironmentConfig() {
    return {
      apiKey: process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY || '',
      provider: process.env.TTS_PROVIDER || 'elevenlabs',
      voiceId: process.env.TTS_VOICE_ID || 'default'
    };
  }

  /**
   * Initialize TTS manager
   */
  async initialize() {
    try {
      // Validate anti-demo requirements
      if (!this.config.apiKey) {
        throw new Error('TTS API key is required (anti-demo: no fake keys)');
      }

      // Load TTS provider dynamically
      await this.loadTTSProvider();

      // Initialize provider
      await this.ttsProvider.initialize(this.config);

      this.status = 'ready';
      this.emit('tts:initialized', { 
        provider: this.config.provider,
        config: this.config 
      });

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('tts:error', error);
      throw error;
    }
  }

  /**
   * Load TTS provider based on configuration
   */
  async loadTTSProvider() {
    const providerName = this.config.provider.toLowerCase();
    
    switch (providerName) {
      case 'elevenlabs':
        const { ElevenLabsTTS } = await import('./tts/elevenlabs.js');
        this.ttsProvider = new ElevenLabsTTS();
        break;
        
      case 'openai':
        const { OpenAITTS } = await import('./tts/openai.js');
        this.ttsProvider = new OpenAITTS();
        break;
        
      default:
        throw new Error(`Unsupported TTS provider: ${providerName}`);
    }
  }

  /**
   * Process Cloud 'say' command
   */
  async processSayCommand(command) {
    try {
      const session = this.sessionManager.getCurrentSession();
      if (!session) {
        throw new Error('No active session for TTS');
      }

      // Validate command structure (canonical compliance)
      if (!command.text || typeof command.text !== 'string') {
        throw new Error('Invalid say command: missing text');
      }

      const text = command.text.trim();
      if (text.length === 0) {
        return { success: false, error: 'Empty text for TTS' };
      }

      // Handle speech interruption
      if (this.isSpeaking && command.interruptible) {
        await this.stopSpeech();
        this.stats.speechesInterrupted++;
      }

      // Start speech synthesis
      const result = await this.speak(text, {
        voiceId: command.voiceId || this.config.voiceId,
        interruptible: command.interruptible !== false, // Default to interruptible
        session_id: session.id,
        agent_id: this.getAgentId()
      });

      if (result.success) {
        this.stats.speechesCompleted++;
        this.stats.lastSpeechTime = new Date().toISOString();
        
        this.emit('tts:speech_started', {
          text,
          session_id: session.id,
          voiceId: command.voiceId || this.config.voiceId
        });
      }

      return result;

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('tts:error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Speak text with interruptible support
   */
  async speak(text, options = {}) {
    if (!this.ttsProvider) {
      throw new Error('TTS provider not initialized');
    }

    if (this.isSpeaking && !options.interruptible) {
      throw new Error('Already speaking and speech is not interruptible');
    }

    try {
      this.isSpeaking = true;
      this.status = 'speaking';

      // Create utterance with provider
      this.currentUtterance = await this.ttsProvider.createUtterance(text, {
        voiceId: options.voiceId || this.config.voiceId,
        session_id: options.session_id,
        agent_id: options.agent_id
      });

      // Set up interruptible handling
      this.currentUtterance.on('start', () => {
        this.emit('tts:utterance_started', { text, options });
      });

      this.currentUtterance.on('end', () => {
        this.isSpeaking = false;
        this.status = 'ready';
        this.currentUtterance = null;
        
        this.emit('tts:utterance_completed', { text, options });
      });

      this.currentUtterance.on('error', (error) => {
        this.isSpeaking = false;
        this.status = 'error';
        this.currentUtterance = null;
        this.stats.errors++;
        
        this.emit('tts:error', error);
      });

      // Start speech
      await this.ttsProvider.speak(this.currentUtterance);

      return { 
        success: true, 
        text,
        utteranceId: this.currentUtterance.id,
        interruptible: options.interruptible
      };

    } catch (error) {
      this.isSpeaking = false;
      this.status = 'error';
      this.currentUtterance = null;
      throw error;
    }
  }

  /**
   * Stop/interrupt current speech
   */
  async stopSpeech() {
    if (!this.isSpeaking || !this.currentUtterance) {
      return { success: true, message: 'No speech in progress' };
    }

    try {
      // Cancel current utterance
      await this.ttsProvider.cancel(this.currentUtterance);
      
      this.isSpeaking = false;
      this.status = 'ready';
      this.currentUtterance = null;
      
      this.emit('tts:speech_stopped', { 
        reason: 'interrupted',
        wasSpeaking: true
      });

      return { success: true, message: 'Speech interrupted' };

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('tts:error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle WebSocket command from Cloud
   */
  handleCloudCommand(command) {
    if (command.type === 'say') {
      return this.processSayCommand(command.payload);
    }
    
    return { success: false, error: 'Unknown TTS command' };
  }

  /**
   * Get TTS status for Side Panel
   */
  getStatus() {
    return {
      status: this.status,
      isSpeaking: this.isSpeaking,
      interruptible: this.interruptible,
      provider: this.config.provider,
      voiceId: this.config.voiceId,
      stats: { ...this.stats },
      config: {
        provider: this.config.provider,
        voiceId: this.config.voiceId
        // Don't expose API key in status
      }
    };
  }

  /**
   * Update TTS configuration
   */
  async updateConfig(newConfig) {
    const wasActive = this.isSpeaking;
    
    try {
      // Stop current speech if active
      if (wasActive) {
        await this.stopSpeech();
      }

      // Update config
      this.config = { ...this.config, ...newConfig };

      // Reload provider if changed
      if (newConfig.provider || newConfig.apiKey) {
        await this.loadTTSProvider();
        await this.ttsProvider.initialize(this.config);
      }

      // Emit config updated
      this.emit('tts:config_updated', { 
        oldConfig: this.config, 
        newConfig: this.config 
      });

    } catch (error) {
      this.status = 'error';
      this.stats.errors++;
      this.emit('tts:error', error);
      throw error;
    }
  }

  /**
   * Get agent ID
   */
  getAgentId() {
    // Use session agent_id or generate stable ID
    const session = this.sessionManager.getCurrentSession();
    return session?.agent_id || 'Agent-TTS-' + crypto.randomUUID().slice(0, 8);
  }

  /**
   * Test TTS functionality
   */
  async test(text = 'Testing TTS functionality') {
    try {
      if (!this.ttsProvider) {
        await this.initialize();
      }

      // Test speech synthesis
      const result = await this.speak(text, { interruptible: true });
      
      // Wait for completion or interruption
      await new Promise((resolve) => {
        const checkStatus = () => {
          if (!this.isSpeaking) {
            resolve(result);
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        checkStatus();
      });

      this.emit('tts:test_complete', { result });
      return result.success;

    } catch (error) {
      this.emit('tts:test_failed', { error: error.message });
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
        console.error(`Error in TTS manager event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Stop any active speech
    if (this.isSpeaking) {
      await this.stopSpeech();
    }

    // Cleanup provider
    if (this.ttsProvider) {
      await this.ttsProvider.cleanup();
      this.ttsProvider = null;
    }

    this.status = 'ready';
    this.isActive = false;
    this.isSpeaking = false;
    this.currentUtterance = null;

    if (this.eventHandlers) {
      this.eventHandlers.clear();
    }
  }
}