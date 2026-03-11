/**
 * STT Factory - Creates appropriate STT adapter
 * Factory pattern for different speech-to-text providers
 */

import { STTAdapter } from './adapter.js';
import { DeepgramSTT } from './deepgram.js';
import { LocalSTT } from './local.js';
import { VOSKSTT } from './vosk.js';

export class STTFactory {
  static adapters = new Map([
    ['deepgram', DeepgramSTT],
    ['local', LocalSTT],
    ['vosk', VOSKSTT]
  ]);

  static async create(provider, config = {}) {
    const AdapterClass = this.adapters.get(provider);
    
    if (!AdapterClass) {
      throw new Error(`Unsupported STT provider: ${provider}. Supported providers: ${Array.from(this.adapters.keys()).join(', ')}`);
    }

    try {
      const adapter = new AdapterClass(config);
      await adapter.initialize();
      
      console.log(`Created ${provider} STT adapter`);
      return adapter;
    } catch (error) {
      console.error(`Failed to create ${provider} STT adapter:`, error);
      throw new Error(`Failed to initialize ${provider} STT adapter: ${error.message}`);
    }
  }

  static getSupportedProviders() {
    return Array.from(this.adapters.keys());
  }

  static registerProvider(name, adapterClass) {
    if (!(adapterClass.prototype instanceof STTAdapter)) {
      throw new Error('Provider must extend STTAdapter');
    }
    
    this.adapters.set(name, adapterClass);
    console.log(`Registered STT provider: ${name}`);
  }

  static async testProvider(provider, config = {}) {
    try {
      const adapter = await this.create(provider, config);
      const stats = adapter.getStats();
      
      // Test provider-specific functionality
      let connectionTest = true;
      
      if (provider === 'deepgram') {
        connectionTest = await adapter.testConnection();
      } else if (provider === 'local') {
        connectionTest = LocalSTT.isSupported();
      }
      
      await adapter.cleanup();
      
      return {
        provider,
        supported: true,
        connectionTest,
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

    // Find the best provider based on criteria
    let bestProvider = null;
    let bestScore = -1;

    for (const result of testResults) {
      let score = 0;
      
      // Connection test is most important
      if (result.connectionTest) score += 100;
      
      // VOSK - highest priority (local, free, accurate)
      if (result.provider === 'vosk') score += 80;
      
      // Web Speech API - local fallback
      if (result.provider === 'local') score += 30;
       
      // Deepgram - cloud fallback
      if (result.provider === 'deepgram') score += 20;

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
      case 'deepgram':
        if (!config.apiKey) {
          errors.push('Deepgram API key is required');
        }
        if (config.apiKey && typeof config.apiKey !== 'string') {
          errors.push('Deepgram API key must be a string');
        }
        break;
        
      case 'local':
        // Local STT has minimal config requirements
        if (config.language && typeof config.language !== 'string') {
          errors.push('Language must be a string');
        }
        break;
        
      case 'vosk':
        // VOSK requires server URL
        if (!config.serverUrl) {
          errors.push('VOSK server URL is required');
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
      deepgram: {
        language: 'en-US',
        model: 'nova-2',
        sampleRate: 16000,
        channels: 1,
        endpoint: 'wss://api.deepgram.com/v1/listen'
      },
      local: {
        language: 'en-US',
        continuous: true,
        interimResults: true,
        maxAlternatives: 3
      },
      vosk: {
        language: 'en-US',
        sampleRate: 16000,
        serverUrl: process.env.VOSK_SERVER_URL || 'ws://localhost:9091'
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
    if (fromProvider === 'local' && toProvider === 'deepgram') {
      // Migrate language format if needed
      if (migrated.language) {
        // Local STT uses different language codes sometimes
        const langMap = {
          'en': 'en-US',
          'es': 'es-ES',
          'fr': 'fr-FR'
        };
        migrated.language = langMap[migrated.language] || migrated.language;
      }
    }

    // Remove provider-specific config when moving away
    if (fromProvider === 'deepgram') {
      delete migrated.apiKey;
    }

    return migrated;
  }
}