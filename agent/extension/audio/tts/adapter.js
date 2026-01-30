/**
 * TTS Adapter Interface - Text-to-Speech Abstraction
 * Defines contract for all TTS implementations
 */

export class TTSAdapter {
  constructor(config = {}) {
    this.config = {
      provider: 'elevenlabs',
      voice: 'default',
      language: 'en-US',
      speed: 1.0,
      pitch: 0.0,
      volume: 1.0,
      format: 'mp3',
      sampleRate: 22050,
      ...config
    };
    this.isActive = false;
    this.isPlaying = false;
    this.eventHandlers = new Map();
    this.audioQueue = [];
    this.currentAudio = null;
  }

  /**
   * Initialize TTS adapter
   * @param {Object} config - TTS configuration
   */
  async initialize(config = {}) {
    this.config = { ...this.config, ...config };
    await this.onInitialize();
    this.emit('initialized', { config: this.config });
  }

  /**
   * Speak text using TTS
   * @param {string} text - Text to synthesize
   * @param {Object} options - Speaking options
   */
  async speak(text, options = {}) {
    if (!text || text.trim() === '') {
      throw new Error('Text is required for speech synthesis');
    }

    const speakOptions = {
      text: text.trim(),
      voice: options.voice || this.config.voice,
      language: options.language || this.config.language,
      speed: options.speed || this.config.speed,
      pitch: options.pitch || this.config.pitch,
      volume: options.volume || this.config.volume,
      interruptible: options.interruptible !== false,
      emotion: options.emotion || this.config.emotion,
      ssml: options.ssml || false,
      ...options
    };

    try {
      this.audioQueue.push(speakOptions);
      await this.processQueue();
      return this.onSpeak(text, speakOptions);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop current speech playback
   */
  async stop() {
    if (!this.isPlaying) return;

    try {
      await this.onStop();
      this.isPlaying = false;
      
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      this.emit('stopped', { reason: 'manual_stop' });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Pause current speech
   */
  async pause() {
    if (!this.isPlaying || !this.currentAudio) return;

    try {
      this.currentAudio.pause();
      this.emit('paused', {});
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Resume paused speech
   */
  async resume() {
    if (!this.currentAudio || this.currentAudio.paused) return;

    try {
      await this.currentAudio.play();
      this.emit('resumed', {});
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  async updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    await this.onConfigUpdate(oldConfig, this.config);
    this.emit('config-updated', { oldConfig, newConfig: this.config });
  }

  /**
   * Get playback status
   */
  getPlaybackStatus() {
    return {
      isActive: this.isActive,
      isPlaying: this.isPlaying,
      isPaused: this.currentAudio?.paused || false,
      queueLength: this.audioQueue.length
    };
  }

  /**
   * Process audio queue
   */
  async processQueue() {
    if (this.isPlaying || this.audioQueue.length === 0) return;

    const speakOptions = this.audioQueue.shift();
    this.isPlaying = true;

    try {
      await this.synthesizeAndPlay(speakOptions);
      this.isPlaying = false;
      
      // Process next item in queue
      if (this.audioQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    } catch (error) {
      this.isPlaying = false;
      this.emit('error', error);
    }
  }

  /**
   * Synthesize and play audio
   */
  async synthesizeAndPlay(options) {
    this.emit('synthesis:started', { text: options.text });

    const audioData = await this.onSynthesize(options);
    
    this.emit('synthesis:completed', { 
      text: options.text,
      audioData 
    });

    return this.playAudio(audioData, options);
  }

  /**
   * Play audio data
   */
  async playAudio(audioData, options) {
    // Create audio element
    const audio = new Audio();
    this.currentAudio = audio;

    // Setup audio events
    audio.onplay = () => {
      this.emit('playback:started', { text: options.text });
    };

    audio.onended = () => {
      this.currentAudio = null;
      this.emit('playback:completed', { text: options.text });
    };

    audio.onerror = (error) => {
      this.currentAudio = null;
      this.emit('error', new Error('Audio playback failed: ' + error.message));
    };

    // Set audio source and play
    if (typeof audioData === 'string' && audioData.startsWith('data:')) {
      audio.src = audioData; // Data URL
    } else if (audioData instanceof Blob) {
      audio.src = URL.createObjectURL(audioData);
    } else {
      throw new Error('Invalid audio data format');
    }

    try {
      await audio.play();
    } catch (error) {
      this.currentAudio = null;
      throw error;
    }
  }

  /**
   * Abstract methods to be implemented by concrete adapters
   */
  async onInitialize() {
    throw new Error('onInitialize() must be implemented by subclass');
  }

  async onSpeak(text, options) {
    throw new Error('onSpeak() must be implemented by subclass');
  }

  async onSynthesize(options) {
    throw new Error('onSynthesize() must be implemented by subclass');
  }

  async onStop() {
    // Default implementation stops current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  async onConfigUpdate(oldConfig, newConfig) {
    // Default implementation does nothing
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in TTS adapter event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.audioQueue = [];
    
    if (this.isPlaying) {
      await this.stop();
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    await this.onCleanup();
    this.eventHandlers.clear();
    this.isActive = false;
  }

  async onCleanup() {
    // Default implementation does nothing
  }
}