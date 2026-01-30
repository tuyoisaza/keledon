/**
 * ElevenLabs TTS Adapter - Cloud-based Text-to-Speech
 * Implements TTS adapter using ElevenLabs API
 */

import { TTSAdapter } from './adapter.js';

export class ElevenLabsTTS extends TTSAdapter {
  constructor(config = {}) {
    super({
      provider: 'elevenlabs',
      apiKey: '',
      voice: 'rachel',
      model: 'eleven_monolingual_v1',
      language: 'en-US',
      speed: 1.0,
      pitch: 0.0,
      volume: 1.0,
      format: 'mp3',
      sampleRate: 22050,
      outputFormat: 'mp3_44100_128',
      endpoint: 'https://api.elevenlabs.io/v1',
      ...config
    });

    this.voices = new Map();
    this.audioContext = null;
  }

  /**
   * Initialize ElevenLabs connection
   */
  async onInitialize() {
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    // Create audio context for playback
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Load available voices
    await this.loadVoices();
    
    this.emit('ready', { provider: 'elevenlabs' });
  }

  /**
   * Load available voices from ElevenLabs
   */
  async loadVoices() {
    try {
      const response = await fetch(`${this.config.endpoint}/voices`, {
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load voices: ${response.status}`);
      }

      const data = await response.json();
      
      // Store voices by ID and name
      data.voices.forEach(voice => {
        this.voices.set(voice.voice_id, voice);
        this.voices.set(voice.name.toLowerCase(), voice);
      });

      this.emit('voices:loaded', { 
        count: data.voices.length,
        voices: data.voices 
      });

    } catch (error) {
      console.error('Failed to load ElevenLabs voices:', error);
      throw error;
    }
  }

  /**
   * Speak text using ElevenLabs
   */
  async onSpeak(text, options) {
    const voiceId = this.getVoiceId(options.voice);
    
    const synthesisOptions = {
      text: options.text,
      voice_id: voiceId,
      model_id: options.model || this.config.model,
      output_format: options.outputFormat || this.config.outputFormat,
      ...this.getVoiceSettings(options)
    };

    return this.synthesizeAndPlay(synthesisOptions);
  }

  /**
   * Synthesize speech using ElevenLabs API
   */
  async onSynthesize(options) {
    const requestBody = {
      text: options.text,
      model_id: options.model_id,
      voice_settings: options.voice_settings
    };

    const response = await fetch(
      `${this.config.endpoint}/text-to-speech/${options.voice_id}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs synthesis failed: ${response.status} - ${errorData.detail?.message || response.statusText}`);
    }

    // Convert response to blob
    const audioBlob = await response.blob();
    
    // Create data URL for playback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Get voice ID from voice name or ID
   */
  getVoiceId(voice) {
    if (!voice) {
      voice = this.config.voice;
    }

    // Try to find by exact match first
    let voiceInfo = this.voices.get(voice);
    
    // If not found, try case-insensitive search
    if (!voiceInfo) {
      voiceInfo = Array.from(this.voices.values())
        .find(v => v.name.toLowerCase() === voice.toLowerCase());
    }

    if (!voiceInfo) {
      throw new Error(`Voice not found: ${voice}. Available voices: ${Array.from(this.voices.keys()).join(', ')}`);
    }

    return voiceInfo.voice_id;
  }

  /**
   * Get voice settings from options
   */
  getVoiceSettings(options) {
    return {
      voice_settings: {
        stability: options.stability || 0.5,
        similarity_boost: options.similarity_boost || 0.8,
        style: options.style || 0.0,
        use_speaker_boost: options.useSpeakerBoost !== false,
        ...options.voiceSettings
      }
    };
  }

  /**
   * Get available voices
   */
  getVoices() {
    return Array.from(this.voices.values());
  }

  /**
   * Get voice information
   */
  getVoiceInfo(voice) {
    const voiceId = this.getVoiceId(voice);
    return this.voices.get(voiceId);
  }

  /**
   * Update ElevenLabs-specific configuration
   */
  async onConfigUpdate(oldConfig, newConfig) {
    // If API key changed, reload voices
    if (oldConfig.apiKey !== newConfig.apiKey) {
      await this.loadVoices();
    }

    // If voice changed, validate it exists
    if (oldConfig.voice !== newConfig.voice) {
      try {
        this.getVoiceId(newConfig.voice);
      } catch (error) {
        console.warn(`Invalid voice in config update: ${newConfig.voice}`);
        this.config.voice = oldConfig.voice; // Revert to old voice
      }
    }
  }

  /**
   * Test ElevenLabs connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.config.endpoint}/user`, {
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get voice preview
   */
  async getVoicePreview(voice, text = "Hello, this is a preview of my voice.") {
    const voiceId = this.getVoiceId(voice);
    
    const response = await fetch(
      `${this.config.endpoint}/text-to-speech/${voiceId}/stream-preview`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: this.config.model,
          voice_settings: this.getVoiceSettings({}).voice_settings
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get voice preview: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Get usage statistics
   */
  async getUsageStats() {
    try {
      const response = await fetch(`${this.config.endpoint}/user/subscription`, {
        headers: {
          'xi-api-key': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get usage stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }

  /**
   * Validate API key format
   */
  validateAPIKey(apiKey) {
    return typeof apiKey === 'string' && apiKey.length > 10;
  }

  /**
   * Get recommended voices for language
   */
  getRecommendedVoices(language = 'en-US') {
    const allVoices = this.getVoices();
    
    // Filter by language if available
    const languageVoices = allVoices.filter(voice => 
      !voice.language || voice.language === language
    );

    // Return top voices by popularity or default selection
    return languageVoices.slice(0, 5);
  }

  /**
   * Cleanup ElevenLabs resources
   */
  async onCleanup() {
    await super.onCleanup();
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    this.voices.clear();
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      provider: 'elevenlabs',
      isActive: this.isActive,
      isPlaying: this.isPlaying,
      config: this.getConfig(),
      voicesLoaded: this.voices.size,
      queueLength: this.audioQueue.length
    };
  }
}