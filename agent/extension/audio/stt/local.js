/**
 * Local STT Adapter - Browser-based Speech Recognition
 * Implements STT adapter using Web Speech API
 */

import { STTAdapter } from './adapter.js';

export class LocalSTT extends STTAdapter {
  constructor(config = {}) {
    super({
      provider: 'local',
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      ...config
    });

    this.recognition = null;
    this.audioStream = null;
    this.isListening = false;
  }

  /**
   * Initialize local speech recognition
   */
  async onInitialize() {
    // Check if Web Speech API is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    this.recognition.lang = this.config.language;

    // Setup event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit('started', { config: this.config });
    };

    this.recognition.onresult = (event) => {
      this.handleResult(event);
    };

    this.recognition.onerror = (event) => {
      this.handleError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit('stopped', {});
    };

    this.emit('ready', { provider: 'local' });
  }

  /**
   * Start speech recognition
   */
  async onStart(audioStream) {
    this.audioStream = audioStream;

    if (!this.recognition) {
      throw new Error('Speech recognition not initialized');
    }

    try {
      this.recognition.start();
    } catch (error) {
      this.emit('error', new Error('Failed to start speech recognition: ' + error.message));
      throw error;
    }
  }

  /**
   * Stop speech recognition
   */
  async onStop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }

  /**
   * Process audio chunk (not used with Web Speech API)
   */
  async onProcessAudio(audioData) {
    // Local STT handles audio internally through the browser
    // This method is kept for interface compatibility
    return audioData;
  }

  /**
   * Handle recognition results
   */
  handleResult(event) {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    // Emit final results
    if (finalTranscript.trim()) {
      const result = {
        text: finalTranscript.trim(),
        confidence: 1.0, // Web Speech API doesn't provide per-word confidence
        provider: 'local',
        isFinal: true,
        timestamp: new Date().toISOString(),
        alternatives: [],
        language: this.config.language,
        metadata: {
          webSpeechAPI: true,
          resultIndex: event.resultIndex
        }
      };

      this.emit('result:final', result);
    }

    // Emit interim results
    if (interimTranscript.trim()) {
      const result = {
        text: interimTranscript.trim(),
        confidence: 0.5, // Lower confidence for interim results
        provider: 'local',
        isFinal: false,
        timestamp: new Date().toISOString(),
        alternatives: [],
        language: this.config.language,
        metadata: {
          webSpeechAPI: true,
          interim: true
        }
      };

      this.emit('result:interim', result);
    }
  }

  /**
   * Handle recognition errors
   */
  handleError(event) {
    const errorMap = {
      'no-speech': 'No speech was detected',
      'aborted': 'Speech input was aborted',
      'audio-capture': 'Audio capture failed',
      'network': 'Network communication failed',
      'not-allowed': 'Permission to use microphone was denied',
      'service-not-allowed': 'Speech recognition service is not allowed',
      'bad-grammar': 'Grammar format or syntax is bad',
      'language-not-supported': 'Language is not supported'
    };

    const message = errorMap[event.error] || `Unknown error: ${event.error}`;
    const error = new Error(`Local STT Error: ${message}`);
    error.code = event.error;
    error.provider = 'local';
    error.event = event;

    this.emit('error', error);
  }

  /**
   * Update local STT configuration
   */
  async onConfigUpdate(oldConfig, newConfig) {
    const settingsChanged = [
      'language', 'continuous', 'interimResults', 'maxAlternatives'
    ].some(key => oldConfig[key] !== newConfig[key]);

    if (settingsChanged && this.recognition) {
      // Update recognition settings
      this.recognition.continuous = newConfig.continuous;
      this.recognition.interimResults = newConfig.interimResults;
      this.recognition.maxAlternatives = newConfig.maxAlternatives;
      this.recognition.lang = newConfig.language;

      // Restart recognition if active
      if (this.isActive) {
        await this.stop();
        await this.start(this.audioStream);
      }
    }
  }

  /**
   * Get local STT statistics
   */
  getStats() {
    return {
      provider: 'local',
      isActive: this.isActive,
      config: this.getConfig(),
      isListening: this.isListening,
      supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    };
  }

  /**
   * Check if local STT is supported
   */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Get available languages
   */
  static getAvailableLanguages() {
    if (!this.isSupported()) {
      return [];
    }

    // Return commonly supported languages
    return [
      { code: 'en-US', name: 'English (United States)' },
      { code: 'en-GB', name: 'English (United Kingdom)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'fr-FR', name: 'French (France)' },
      { code: 'de-DE', name: 'German (Germany)' },
      { code: 'it-IT', name: 'Italian (Italy)' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ru-RU', name: 'Russian (Russia)' },
      { code: 'ja-JP', name: 'Japanese (Japan)' },
      { code: 'zh-CN', name: 'Chinese (China)' }
    ];
  }

  /**
   * Cleanup local STT resources
   */
  async onCleanup() {
    await this.onStop();
    
    if (this.recognition) {
      this.recognition = null;
    }
  }
}