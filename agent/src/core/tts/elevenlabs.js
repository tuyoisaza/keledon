/**
 * ElevenLabs TTS Provider - Cloud-based Text-to-Speech
 * Implements TTS with interruptible speech synthesis
 */

export class ElevenLabsTTS {
  constructor() {
    this.apiKey = null;
    this.voiceId = 'default';
    this.voiceSettings = {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 'default',
      use_speaker_boost: true
    };
    this.currentUtterances = new Map();
  }

  /**
   * Initialize ElevenLabs provider
   */
  async initialize(config) {
    if (!config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    this.apiKey = config.apiKey;
    this.voiceId = config.voiceId || 'default';
    
    // Validate API key format
    if (!this.validateAPIKey(config.apiKey)) {
      throw new Error('Invalid ElevenLabs API key format');
    }

    console.log('ElevenLabs TTS initialized');
  }

  /**
   * Create utterance for speech synthesis
   */
  async createUtterance(text, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for TTS');
    }

    const utteranceId = crypto.randomUUID();
    
    const utterance = {
      id: utteranceId,
      text: text.trim(),
      voiceId: options.voiceId || this.voiceId,
      voiceSettings: {
        ...this.voiceSettings,
        ...options.voiceSettings
      },
      metadata: {
        session_id: options.session_id,
        agent_id: options.agent_id,
        created_at: new Date().toISOString(),
        provider: 'elevenlabs'
      },
      interruptible: options.interruptible !== false
    };

    // Store utterance for later cancellation
    this.currentUtterances.set(utteranceId, utterance);

    // Create mock utterance object with event handling
    const mockUtterance = {
      id: utteranceId,
      text: utterance.text,
      voiceId: utterance.voiceId,
      on: (event, handler) => {
        // Store event handlers
        if (!utterance.eventHandlers) {
          utterance.eventHandlers = new Map();
        }
        if (!utterance.eventHandlers.has(event)) {
          utterance.eventHandlers.set(event, []);
        }
        utterance.eventHandlers.get(event).push(handler);
      },
      emit: (event, data) => {
        if (!utterance.eventHandlers || !utterance.eventHandlers.has(event)) return;
        utterance.eventHandlers.get(event).forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in utterance event handler for ${event}:`, error);
          }
        });
      }
    };

    return mockUtterance;
  }

  /**
   * Synthesize speech using ElevenLabs API
   */
  async speak(utterance) {
    try {
      console.log(`ElevenLabs TTS: "${utterance.text.substring(0, 50)}..."`);
      
      // Simulate API call to ElevenLabs
      const audioUrl = await this.synthesizeAudio(utterance);
      
      // Create audio and play
      const audio = new Audio(audioUrl);
      
      // Set up event handling
      audio.addEventListener('play', () => {
        utterance.emit('start', { utterance });
      });

      audio.addEventListener('ended', () => {
        utterance.emit('end', { utterance });
        this.currentUtterances.delete(utterance.id);
      });

      audio.addEventListener('error', (error) => {
        utterance.emit('error', { error, utterance });
      });

      // Start playback
      await audio.play();
      
      return { success: true, audioUrl, utterance };

    } catch (error) {
      utterance.emit('error', { error, utterance });
      throw error;
    }
  }

  /**
   * Simulate ElevenLabs API call (would be real HTTP request)
   */
  async synthesizeAudio(utterance) {
    // Simulate ElevenLabs API call
    // In production, this would be: POST https://api.elevenlabs.io/v1/text-to-speech
    
    const request = {
      text: utterance.text,
      voice_id: utterance.voiceId,
      voice_settings: utterance.voiceSettings,
      model_id: 'eleven_monolingual_v1',
      output_format: 'mp3_44100_128'
    };

    // Mock API response with base64 audio data
    // In production, this would return real audio from ElevenLabs
    const mockAudioData = this.generateMockAudio(utterance.text);
    const audioUrl = `data:audio/mpeg;base64,${mockAudioData}`;
    
    console.log('ElevenLabs TTS: Audio synthesized (mock for development)');
    
    return audioUrl;
  }

  /**
   * Generate mock audio data (for development)
   */
  generateMockAudio(text) {
    // Create a simple audio pattern based on text
    // This is a mock implementation - real implementation would use ElevenLabs API
    const seed = text.length + text.charCodeAt(0);
    const pattern = new Array(1024).fill(0).map((_, i) => 
      Math.sin((i + seed) * 0.01) * 127 + 128
    );
    
    // Simple base64 encoding (mock)
    return btoa(String.fromCharCode(...pattern));
  }

  /**
   * Cancel/interrupt current speech
   */
  async cancel(utterance) {
    if (!utterance || !this.currentUtterances.has(utterance.id)) {
      return { success: false, error: 'Utterance not found' };
    }

    try {
      // Remove utterance from tracking
      this.currentUtterances.delete(utterance.id);
      
      // Emit interruption event
      utterance.emit('error', { 
        error: 'Speech interrupted',
        utterance 
      });

      // In real implementation, would cancel the audio playback
      console.log('ElevenLabs TTS: Speech interrupted');
      
      return { success: true, message: 'Speech cancelled' };

    } catch (error) {
      console.error('Failed to cancel speech:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate API key format
   */
  validateAPIKey(apiKey) {
    // ElevenLabs API keys are typically 32+ characters
    return typeof apiKey === 'string' && 
           apiKey.length >= 32 && 
           /^[a-zA-Z0-9]+$/.test(apiKey);
  }

  /**
   * Get available voices
   */
  async getVoices() {
    // Mock voice list - in production would query ElevenLabs API
    return [
      { id: 'default', name: 'Default Voice', language: 'en-US' },
      { id: 'rachel', name: 'Rachel', language: 'en-US' },
      { id: 'adam', name: 'Adam', language: 'en-US' },
      { id: 'bella', name: 'Bella', language: 'en-US' }
    ];
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(settings) {
    this.voiceSettings = { ...this.voiceSettings, ...settings };
    console.log('ElevenLabs TTS: Voice settings updated');
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      name: 'ElevenLabs',
      version: '1.0.0',
      capabilities: ['text-to-speech', 'voice-cloning', 'emotion-control'],
      interruptible: true,
      maxTextLength: 5000
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Cancel all active utterances
    for (const [utteranceId, utterance] of this.currentUtterances) {
      try {
        await this.cancel(utterance);
      } catch (error) {
        console.error(`Failed to cancel utterance ${utteranceId}:`, error);
      }
    }
    
    this.currentUtterances.clear();
    console.log('ElevenLabs TTS: Cleanup complete');
  }
}