/**
 * Local TTS Adapter - Browser-based Text-to-Speech
 * Implements TTS adapter using Web Speech Synthesis API
 */

import { TTSAdapter } from './adapter.js';

export class LocalTTS extends TTSAdapter {
  constructor(config = {}) {
    super({
      provider: 'local',
      voice: 'default',
      language: 'en-US',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      ...config
    });

    this.synthesis = null;
    this.voices = [];
    this.selectedVoice = null;
    this.isSpeaking = false;
    this.isPaused = false;
  }

  /**
   * Initialize local speech synthesis
   */
  async onInitialize() {
    // Check if Web Speech Synthesis is available
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech Synthesis API is not supported in this browser');
    }

    this.synthesis = window.speechSynthesis;
    this.loadVoices();

    // Listen for voice changes
    this.synthesis.onvoiceschanged = () => {
      this.loadVoices();
    };

    this.emit('ready', { provider: 'local' });
  }

  /**
   * Load available voices
   */
  loadVoices() {
    this.voices = this.synthesis.getVoices() || [];
    
    // Select default voice if not set
    if (!this.selectedVoice) {
      this.selectedVoice = this.findVoice(this.config.voice) || this.voices[0];
    }

    this.emit('voices:loaded', { 
      count: this.voices.length,
      voices: this.voices.map(this.formatVoice.bind(this))
    });
  }

  /**
   * Speak text using local synthesis
   */
  async onSpeak(text, options) {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not initialized');
    }

    const voice = this.findVoice(options.voice || this.config.voice);
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure utterance
    utterance.voice = voice;
    utterance.lang = options.language || this.config.language;
    utterance.rate = options.speed || this.config.rate;
    utterance.pitch = options.pitch || this.config.pitch;
    utterance.volume = options.volume || this.config.volume;
    
    // Set event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.emit('playback:started', { 
        text: text,
        voice: voice?.name,
        language: utterance.lang
      });
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.emit('playback:completed', { 
        text: text,
        voice: voice?.name
      });
    };

    utterance.onerror = (event) => {
      this.isSpeaking = false;
      const error = new Error(`Local TTS Error: ${event.error}`);
      error.event = event;
      this.emit('error', error);
    };

    utterance.onpause = () => {
      this.isPaused = true;
      this.emit('paused', { text });
    };

    utterance.onresume = () => {
      this.isPaused = false;
      this.emit('resumed', { text });
    };

    utterance.onmark = (event) => {
      this.emit('mark', { 
        name: event.name,
        text: text
      });
    };

    utterance.onboundary = (event) => {
      this.emit('boundary', {
        name: event.name,
        charIndex: event.charIndex,
        text: text
      });
    };

    // Speak the utterance
    this.synthesis.speak(utterance);

    // For local TTS, synthesis happens synchronously
    // Return immediately since we don't have audio data to return
    return null;
  }

  /**
   * Synthesize speech (local TTS doesn't return audio data)
   */
  async onSynthesize(options) {
    // Local TTS synthesizes directly to speakers
    // This method is kept for interface compatibility
    return null;
  }

  /**
   * Stop speech synthesis
   */
  async onStop() {
    if (!this.synthesis) return;

    try {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.isPaused = false;
      
      this.emit('stopped', { reason: 'manual_stop' });
    } catch (error) {
      this.emit('error', new Error('Failed to stop local speech synthesis: ' + error.message));
      throw error;
    }
  }

  /**
   * Pause speech synthesis
   */
  async pause() {
    if (!this.synthesis || !this.isSpeaking) return;

    try {
      this.synthesis.pause();
      this.emit('paused', {});
    } catch (error) {
      this.emit('error', new Error('Failed to pause local speech synthesis: ' + error.message));
      throw error;
    }
  }

  /**
   * Resume speech synthesis
   */
  async resume() {
    if (!this.synthesis || !this.isPaused) return;

    try {
      this.synthesis.resume();
      this.emit('resumed', {});
    } catch (error) {
      this.emit('error', new Error('Failed to resume local speech synthesis: ' + error.message));
      throw error;
    }
  }

  /**
   * Find voice by name or default
   */
  findVoice(voiceName) {
    if (!voiceName) {
      return this.voices[0]; // Default voice
    }

    // Try exact match first
    let voice = this.voices.find(v => v.name === voiceName);
    
    // Try case-insensitive match
    if (!voice) {
      voice = this.voices.find(v => 
        v.name.toLowerCase() === voiceName.toLowerCase()
      );
    }

    // Try partial match
    if (!voice) {
      voice = this.voices.find(v => 
        v.name.toLowerCase().includes(voiceName.toLowerCase())
      );
    }

    return voice;
  }

  /**
   * Format voice information
   */
  formatVoice(voice) {
    return {
      name: voice.name,
      lang: voice.lang,
      gender: this.inferGender(voice),
      localService: voice.localService,
      voiceURI: voice.voiceURI,
      default: voice.default
    };
  }

  /**
   * Infer gender from voice name (heuristic)
   */
  inferGender(voice) {
    const name = voice.name.toLowerCase();
    
    if (name.includes('female') || name.includes('woman') || name.includes('girl')) {
      return 'female';
    } else if (name.includes('male') || name.includes('man') || name.includes('boy')) {
      return 'male';
    }
    
    return 'unknown';
  }

  /**
   * Get available voices
   */
  getVoices() {
    return this.voices.map(this.formatVoice.bind(this));
  }

  /**
   * Get current voice info
   */
  getCurrentVoice() {
    return this.selectedVoice ? this.formatVoice(this.selectedVoice) : null;
  }

  /**
   * Update local TTS configuration
   */
  async onConfigUpdate(oldConfig, newConfig) {
    const settingsChanged = [
      'voice', 'language', 'rate', 'pitch', 'volume'
    ].some(key => oldConfig[key] !== newConfig[key]);

    if (settingsChanged) {
      // Update selected voice if changed
      if (oldConfig.voice !== newConfig.voice) {
        this.selectedVoice = this.findVoice(newConfig.voice);
      }
    }

    // Local TTS config doesn't require restart
    this.emit('config-updated', { oldConfig, newConfig });
  }

  /**
   * Get recommended voices for language
   */
  getRecommendedVoices(language = 'en-US') {
    return this.voices
      .filter(voice => voice.lang === language)
      .map(this.formatVoice.bind(this))
      .slice(0, 5); // Return top 5 voices
  }

  /**
   * Test voice
   */
  async testVoice(voice, text = "This is a test of the voice.") {
    try {
      await this.speak(text, { voice });
      return true;
    } catch (error) {
      console.error(`Voice test failed for ${voice}:`, error);
      return false;
    }
  }

  /**
   * Check if local TTS is supported
   */
  static isSupported() {
    return !!(window.speechSynthesis);
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      provider: 'local',
      isActive: this.isActive,
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      config: this.getConfig(),
      voicesLoaded: this.voices.length > 0,
      currentVoice: this.getCurrentVoice(),
      supported: !!(window.speechSynthesis)
    };
  }

  /**
   * Cleanup local TTS resources
   */
  async onCleanup() {
    await this.onStop();
    
    this.synthesis = null;
    this.voices = [];
    this.selectedVoice = null;
  }
}