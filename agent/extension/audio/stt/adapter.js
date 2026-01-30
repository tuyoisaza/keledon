/**
 * STT Adapter Interface - Speech-to-Text Abstraction
 * Defines the contract for all STT implementations
 */

export class STTAdapter {
  constructor(config = {}) {
    this.config = {
      provider: 'deepgram',
      language: 'en-US',
      model: 'nova-2',
      sampleRate: 16000,
      channels: 1,
      ...config
    };
    this.isActive = false;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize the STT adapter
   * @param {Object} config - STT configuration
   */
  async initialize(config = {}) {
    this.config = { ...this.config, ...config };
    await this.onInitialize();
    this.emit('initialized', { config: this.config });
  }

  /**
   * Start speech recognition
   * @param {MediaStream} audioStream - Audio stream to process
   */
  async start(audioStream) {
    if (this.isActive) {
      throw new Error('STT adapter is already active');
    }

    try {
      await this.onStart(audioStream);
      this.isActive = true;
      this.emit('started', { config: this.config });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop speech recognition
   */
  async stop() {
    if (!this.isActive) return;

    try {
      await this.onStop();
      this.isActive = false;
      this.emit('stopped', {});
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Process audio chunk
   * @param {ArrayBuffer|Float32Array} audioData - Audio data to process
   */
  async processAudio(audioData) {
    if (!this.isActive) {
      throw new Error('STT adapter is not active');
    }

    try {
      return await this.onProcessAudio(audioData);
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
   * Check if adapter is currently active
   */
  isReady() {
    return this.isActive;
  }

  /**
   * Abstract methods to be implemented by concrete adapters
   */
  async onInitialize() {
    throw new Error('onInitialize() must be implemented by subclass');
  }

  async onStart(audioStream) {
    throw new Error('onStart() must be implemented by subclass');
  }

  async onStop() {
    throw new Error('onStop() must be implemented by subclass');
  }

  async onProcessAudio(audioData) {
    throw new Error('onProcessAudio() must be implemented by subclass');
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
        console.error(`Error in STT adapter event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.isActive) {
      await this.stop();
    }
    
    await this.onCleanup();
    this.eventHandlers.clear();
  }

  async onCleanup() {
    // Default implementation does nothing
  }
}