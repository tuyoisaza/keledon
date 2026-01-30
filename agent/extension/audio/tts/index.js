/**
 * TTS Factory - Creates appropriate TTS adapter
 * Factory pattern for different text-to-speech providers
 */

import { TTSAdapter } from './adapter.js';
import { ElevenLabsTTS } from './elevenlabs.js';
import { LocalTTS } from './local.js';

export class TTSFactory {
  static adapters = new Map([
    ['elevenlabs', ElevenLabsTTS],
    ['local', LocalTTS]
  ]);

  static async create(provider, config = {}) {
    const AdapterClass = this.adapters.get(provider);
    
    if (!AdapterClass) {
      throw new Error(`Unsupported TTS provider: ${provider}. Supported providers: ${Array.from(this.adapters.keys()).join(', ')}`);
    }

    try {
      const adapter = new AdapterClass(config);
      await adapter.initialize();
      
      console.log(`Created ${provider} TTS adapter`);
      return adapter;
    } catch (error) {
      console.error(`Failed to create ${provider} TTS adapter:`, error);
      throw new Error(`Failed to initialize ${provider} TTS adapter: ${error.message}`);
    }
  }

  static getSupportedProviders() {
    return Array.from(this.adapters.keys());
  }

  static registerProvider(name, adapterClass) {
    if (!(adapterClass.prototype instanceof TTSAdapter)) {
      throw new Error('Provider must extend TTSAdapter');
    }
    
    this.adapters.set(name, adapterClass);
    console.log(`Registered TTS provider: ${name}`);
  }

  static async testProvider(provider, config = {}) {
    try {
      const adapter = await this.create(provider, config);
      const stats = adapter.getStats();
      
      // Test provider-specific functionality
      let connectionTest = true;
      let voicesLoaded = false;
      
      if (provider === 'elevenlabs') {
        connectionTest = await adapter.testConnection();
        voicesLoaded = stats.voicesLoaded > 0;
      } else if (provider === 'local') {
        connectionTest = LocalTTS.isSupported();
        voicesLoaded = stats.voicesLoaded;
      }
      
      await adapter.cleanup();
      
      return {
        provider,
        supported: true,
        connectionTest,
        voicesLoaded,
        stats,
        config: adapter.getConfig()
      };
    } catch (error) {
      return {
        provider,
        supported: false,
        error: error.message,
        config
      };
    }
  }

  static async getBestProvider(config = {}) {
    const testResults = [];
    
    // Test all supported providers
    for (const provider of this.getSupportedProviders()) {
      const result = await this.testProvider(provider, config[provider] || {});
      testResults.push(result);
    }

    // Find best provider based on criteria
    let bestProvider = null;
    let bestScore = -1;

    for (const result of testResults) {
      let score = 0;
      
      // Connection test is most important
      if (result.connectionTest) score += 100;
      
      // Voice availability is important for TTS
      if (result.voicesLoaded) score += 50;
      
      // Prefer cloud providers for quality
      if (result.provider === 'elevenlabs') score += 40;
      
      // Prefer local for privacy/no latency
      if (result.provider === 'local') score += 25;

      if (score > bestScore) {
        bestScore = score;
        bestProvider = result;
      }
    }

    return bestProvider;
  }

  /**
   * Validate configuration for a provider
   */
  static validateConfig(provider, config) {
    const errors = [];

    switch (provider) {
      case 'elevenlabs':
        if (!config.apiKey) {
          errors.push('ElevenLabs API key is required');
        }
        if (config.apiKey && typeof config.apiKey !== 'string') {
          errors.push('ElevenLabs API key must be a string');
        }
        break;
        
      case 'local':
        // Local TTS has minimal config requirements
        if (config.voice && typeof config.voice !== 'string') {
          errors.push('Voice name must be a string');
        }
        if (config.rate && (config.rate < 0.1 || config.rate > 10)) {
          errors.push('Rate must be between 0.1 and 10');
        }
        if (config.pitch && (config.pitch < -20 || config.pitch > 20)) {
          errors.push('Pitch must be between -20 and 20');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended configuration for provider
   */
  static getRecommendedConfig(provider) {
    const configs = {
      elevenlabs: {
        voice: 'rachel',
        model: 'eleven_monolingual_v1',
        language: 'en-US',
        speed: 1.0,
        pitch: 0.0,
        volume: 1.0,
        format: 'mp3',
        outputFormat: 'mp3_44100_128',
        endpoint: 'https://api.elevenlabs.io/v1'
      },
      local: {
        voice: 'default',
        language: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      }
    };

    return configs[provider] || {};
  }

  /**
   * Migrate configuration from one provider to another
   */
  static migrateConfig(fromProvider, toProvider, config) {
    const migrated = { ...config };

    // Handle provider-specific migrations
    if (fromProvider === 'local' && toProvider === 'elevenlabs') {
      // Map local voices to ElevenLabs voices if possible
      if (migrated.voice) {
        const voiceMap = {
          'female': 'rachel',
          'male': 'domi',
          'default': 'rachel'
        };
        migrated.voice = voiceMap[migrated.voice.toLowerCase()] || migrated.voice;
      }
    }

    // Remove provider-specific config when moving away
    if (fromProvider === 'elevenlabs') {
      delete migrated.apiKey;
    }

    // Map rate/speed if needed
    if (fromProvider === 'local' && toProvider === 'elevenlabs') {
      if (migrated.rate) {
        migrated.speed = migrated.rate; // Local uses 'rate', ElevenLabs uses 'speed'
        delete migrated.rate;
      }
    }

    // Map speed/rate if needed
    if (fromProvider === 'elevenlabs' && toProvider === 'local') {
      if (migrated.speed) {
        migrated.rate = migrated.speed; // ElevenLabs uses 'speed', local uses 'rate'
        delete migrated.speed;
      }
    }

    return migrated;
  }

  /**
   * Get voice comparison between providers
   */
  static async compareVoices(providers, config = {}) {
    const comparison = {};
    
    for (const provider of providers) {
      try {
        const result = await this.testProvider(provider, config[provider] || {});
        comparison[provider] = {
          supported: result.supported,
          voicesLoaded: result.voicesLoaded,
          voiceCount: result.stats?.voicesLoaded || 0,
          quality: this.getVoiceQuality(provider),
          latency: this.getEstimatedLatency(provider),
          privacy: this.getPrivacyLevel(provider)
        };
      } catch (error) {
        comparison[provider] = {
          supported: false,
          error: error.message
        };
      }
    }

    return comparison;
  }

  static getVoiceQuality(provider) {
    const qualityScores = {
      'elevenlabs': 9,
      'local': 5
    };
    return qualityScores[provider] || 3;
  }

  static getEstimatedLatency(provider) {
    const latencyScores = {
      'local': 50, // ~50ms
      'elevenlabs': 300 // ~300ms round trip
    };
    return latencyScores[provider] || 500;
  }

  static getPrivacyLevel(provider) {
    const privacyScores = {
      'local': 10, // Fully private
      'elevenlabs': 3 // Cloud processing
    };
    return privacyScores[provider] || 1;
  }
}