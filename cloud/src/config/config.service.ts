import { Injectable } from '@nestjs/common';
import { getRuntimeTier, isManagedProductionTier, resolveServiceEndpoints } from './runtime-tier';

@Injectable()
export class ConfigService {
  private readonly runtimeTier = getRuntimeTier();
  private readonly endpoints = resolveServiceEndpoints(this.runtimeTier);

  private readonly config = {
    backendUrl: this.endpoints.cloudBaseUrl,
    wsUrl: process.env.WS_URL || this.endpoints.cloudBaseUrl.replace(/^http/i, 'ws'),
    environment: this.runtimeTier,
    port: parseInt(process.env.PORT || '3001', 10),
    database: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    },
    services: {
      tts: {
        provider: process.env.TTS_PROVIDER || 'elevenlabs',
        elevenLabsKey: process.env.ELEVENLABS_API_KEY,
      },
      stt: {
        provider: process.env.STT_PROVIDER || 'vosk',
        voskPort: parseInt(process.env.VOSK_PORT || '9090', 10),
        voskWsPort: parseInt(process.env.VOSK_WS_PORT || '9091', 10),
        voskModelPath: process.env.VOSK_MODEL_PATH || './models',
        voskSampleRate: parseInt(process.env.VOSK_SAMPLE_RATE || '16000', 10),
      },
      rpa: {
        provider: process.env.RPA_PROVIDER || 'playwright',
        headless: process.env.RPA_HEADLESS === 'true',
      },
      vectorStore: {
        provider: process.env.VECTOR_STORE_PROVIDER || 'qdrant',
        qdrantUrl: process.env.QDRANT_URL || this.endpoints.qdrantUrl,
        qdrantApiKey: process.env.QDRANT_API_KEY,
        qdrantCollection: process.env.QDRANT_COLLECTION || 'keledon',
        embeddingsModel: process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small',
      },
    },
    featureFlags: {
      vectorStore: process.env.ENABLE_VECTOR_STORE !== 'false',
      realTts: process.env.ENABLE_REAL_TTS !== 'false',
      realStt: process.env.ENABLE_REAL_STT !== 'false',
      rpa: process.env.ENABLE_RPA !== 'false',
      realAuth: process.env.ENABLE_REAL_AUTH !== 'false',
      otel: process.env.ENABLE_OTEL !== 'false',
    },
  };

  constructor() {
    console.log('[Config] Configuration loaded for tier:', this.runtimeTier);
  }

  getBackendUrl(): string {
    return this.config.backendUrl;
  }

  getWsUrl(): string {
    return this.config.wsUrl;
  }

  getEnvironment(): string {
    return this.config.environment;
  }

  getPort(): number {
    return this.config.port;
  }

  getDatabaseConfig() {
    return this.config.database;
  }

  getServicesConfig() {
    return this.config.services;
  }

  getSttConfig() {
    return this.config.services.stt;
  }

  getTtsConfig() {
    return this.config.services.tts;
  }

  getRpaConfig() {
    return this.config.services.rpa;
  }

  getVectorStoreConfig() {
    return this.config.services.vectorStore;
  }

  getFeatureFlags() {
    return this.config.featureFlags;
  }

  isDevelopment(): boolean {
    return this.config.environment === 'DEV_LOCAL';
  }

  isProduction(): boolean {
    return isManagedProductionTier(this.runtimeTier);
  }

  isFeatureEnabled(feature: keyof typeof this.config.featureFlags): boolean {
    return this.config.featureFlags[feature];
  }
}
