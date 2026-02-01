import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly config = {
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
    wsUrl: process.env.WS_URL || 'ws://localhost:3001',
    supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'your-development-key',
    supabaseAdminSecret: process.env.SUPABASE_ADMIN_SECRET,
    environment: process.env.NODE_ENV || 'development',
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
        qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
        qdrantApiKey: process.env.QDRANT_API_KEY,
        embeddingsModel: process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small'
      }
    }
  };

  constructor() {
    console.log('[Config] Configuration loaded:', this.config);
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
    return this.config.services?.vectorStore || { url: 'http://localhost:3020', collection: 'keledo' };
  }

  // For backward compatibility
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }
}