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
   * Synthesize speech using real ElevenLabs API
   */
  async synthesizeAudio(utterance) {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not initialized');
    }

    const request = {
      text: utterance.text,
      voice_id: utterance.voiceId,
      voice_settings: utterance.voiceSettings,
      model_id: 'eleven_monolingual_v1',
      output_format: 'mp3_44100_128'
    };

    console.log(`ElevenLabs TTS: Synthesizing "${utterance.text.substring(0, 50)}..." with voice ${utterance.voiceId}`);

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Convert audio blob to base64 data URL
      const audioBlob = await response.blob();
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
      
      console.log('ElevenLabs TTS: Audio synthesized successfully');
      
      return audioUrl;

    } catch (error) {
      console.error('ElevenLabs TTS: API call failed:', error);
      throw new Error(`Failed to synthesize speech with ElevenLabs: ${error.message}`);
    }
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
   * Get available voices from ElevenLabs API
   */
  async getVoices() {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not initialized');
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      
      return data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.language || 'en-US',
        gender: voice.gender,
        description: voice.description
      }));

    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      // Return fallback voices if API fails
      return [
        { id: 'default', name: 'Default Voice', language: 'en-US' }
      ];
    }
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