/**
 * OpenAI TTS Provider - Cloud-based Text-to-Speech
 * Implements TTS with interruptible speech synthesis using OpenAI
 */

export class OpenAITTS {
  constructor() {
    this.apiKey = null;
    this.model = 'tts-1';
    this.voice = 'alloy';
    this.currentUtterances = new Map();
  }

  /**
   * Initialize OpenAI provider
   */
  async initialize(config) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'tts-1';
    this.voice = config.voice || 'alloy';
    
    // Validate API key format
    if (!this.validateAPIKey(config.apiKey)) {
      throw new Error('Invalid OpenAI API key format');
    }

    console.log('OpenAI TTS initialized');
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
      voice: options.voiceId || this.voice,
      model: this.model,
      speed: options.speed || 1.0,
      metadata: {
        session_id: options.session_id,
        agent_id: options.agent_id,
        created_at: new Date().toISOString(),
        provider: 'openai'
      },
      interruptible: options.interruptible !== false
    };

    // Store utterance for later cancellation
    this.currentUtterances.set(utteranceId, utterance);

    // Create mock utterance object with event handling
    const mockUtterance = {
      id: utteranceId,
      text: utterance.text,
      voice: utterance.voice,
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
   * Synthesize speech using OpenAI API
   */
  async speak(utterance) {
    try {
      console.log(`OpenAI TTS: "${utterance.text.substring(0, 50)}..."`);
      
      // Simulate API call to OpenAI
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
   * Simulate OpenAI API call (would be real HTTP request)
   */
  async synthesizeAudio(utterance) {
    // Simulate OpenAI API call
    // In production, this would be: POST https://api.openai.com/v1/audio/speech
    
    const request = {
      model: utterance.model || this.model,
      input: utterance.text,
      voice: utterance.voice || this.voice,
      response_format: 'mp3',
      speed: utterance.speed || 1.0
    };

    // Mock API response with base64 audio data
    // In production, this would return real audio from OpenAI
    const mockAudioData = this.generateMockAudio(utterance.text);
    const audioUrl = `data:audio/mpeg;base64,${mockAudioData}`;
    
    console.log('OpenAI TTS: Audio synthesized (mock for development)');
    
    return audioUrl;
  }

  /**
   * Generate mock audio data (for development)
   */
  generateMockAudio(text) {
    // Create a simple audio pattern based on text
    // This is a mock implementation - real implementation would use OpenAI API
    const seed = text.length + text.charCodeAt(0);
    const pattern = new Array(2048).fill(0).map((_, i) => 
      Math.sin((i + seed * 2) * 0.008) * 127 + 128
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
      console.log('OpenAI TTS: Speech interrupted');
      
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
    // OpenAI API keys start with 'sk-' and are typically 48+ characters
    return typeof apiKey === 'string' && 
           apiKey.startsWith('sk-') && 
           apiKey.length >= 48;
  }

  /**
   * Get available voices
   */
  async getVoices() {
    // Mock voice list - in production would query OpenAI API
    return [
      { id: 'alloy', name: 'Alloy', language: 'en-US', gender: 'neutral' },
      { id: 'echo', name: 'Echo', language: 'en-US', gender: 'neutral' },
      { id: 'fable', name: 'Fable', language: 'en-US', gender: 'neutral' },
      { id: 'onyx', name: 'Onyx', language: 'en-US', gender: 'male' },
      { id: 'nova', name: 'Nova', language: 'en-US', gender: 'female' },
      { id: 'shimmer', name: 'Shimmer', language: 'en-US', gender: 'female' }
    ];
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      name: 'OpenAI',
      version: '1.0.0',
      capabilities: ['text-to-speech', 'multiple-voices', 'speed-control'],
      interruptible: true,
      maxTextLength: 4096
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
    console.log('OpenAI TTS: Cleanup complete');
  }
}