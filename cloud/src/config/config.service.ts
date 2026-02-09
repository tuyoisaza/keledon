import { Injectable } from '@nestjs/common';
import { getRuntimeTier, isManagedProductionTier, resolveServiceEndpoints } from './runtime-tier';

@Injectable()
export class ConfigService {
  private readonly runtimeTier = getRuntimeTier();
  private readonly endpoints = resolveServiceEndpoints(this.runtimeTier);
  private readonly supabaseAnonKey = this.resolveSupabaseAnonKey();

  private readonly config = {
    backendUrl: this.endpoints.cloudBaseUrl,
    wsUrl: process.env.WS_URL || this.endpoints.cloudBaseUrl.replace(/^http/i, 'ws'),
    supabaseUrl: this.endpoints.supabaseUrl,
    supabaseKey: this.supabaseAnonKey,
    supabaseAdminSecret: process.env.SUPABASE_ADMIN_SECRET,
    environment: this.runtimeTier,
    port: parseInt(process.env.PORT || '3001', 10),
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'keledon'
    },
    services: {
      tts: {
        provider: process.env.TTS_PROVIDER || 'mock',
        elevenLabsKey: process.env.ELEVENLABS_API_KEY,
        qwenModel: process.env.QWEN_MODEL || 'qwen-tts'
      },
      stt: {
        provider: process.env.STT_PROVIDER || 'mock',
        deepgramKey: process.env.DEEPGRAM_API_KEY,
        whisperModel: process.env.WHISPER_MODEL || 'whisper-1'
      },
      rpa: {
        provider: process.env.RPA_PROVIDER || 'playwright',
        headless: process.env.RPA_HEADLESS === 'true'
      },
      vectorStore: {
        provider: process.env.VECTOR_STORE_PROVIDER || 'supabase',
        qdrantUrl: this.endpoints.qdrantUrl,
        qdrantApiKey: process.env.QDRANT_API_KEY,
        embeddingsModel: process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small'
      }
    }
  };

  constructor() {
    console.log('[Config] Configuration loaded:', this.config);
  }

  private resolveSupabaseAnonKey(): string {
    const canonical = (process.env.KELEDON_SUPABASE_ANON_KEY || '').trim();
    const legacy = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '').trim();
    const key = canonical || legacy;

    if (isManagedProductionTier(this.runtimeTier) && !canonical) {
      throw new Error('[Config] KELEDON_SUPABASE_ANON_KEY is required in PRODUCTION_MANAGED.');
    }

    if (isManagedProductionTier(this.runtimeTier) && !key) {
      throw new Error('[Config] Supabase anon key is required in PRODUCTION_MANAGED.');
    }

    return key || 'your-development-key';
  }

  getBackendUrl(): string {
    return this.config.backendUrl;
  }

  getWsUrl(): string {
    return this.config.wsUrl;
  }

  getSupabaseConfig() {
    return {
      url: this.config.supabaseUrl,
      key: this.config.supabaseKey,
      adminSecret: this.config.supabaseAdminSecret
    };
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

  getVectorStoreConfig() {
    return this.config.services?.vectorStore || { url: this.endpoints.qdrantUrl, collection: 'keledo' };
  }

  // For backward compatibility
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isProduction(): boolean {
    return isManagedProductionTier(this.runtimeTier);
  }
}
