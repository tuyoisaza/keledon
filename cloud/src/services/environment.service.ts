import { Injectable, Logger } from '@nestjs/common';

export type Environment = 'local' | 'production';
export type Phase = 'BOOTABLE' | 'VECTOR-READY' | 'DATABASE-READY';

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);
  
  /**
   * Get current environment from NODE_ENV
   */
  getEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV;
    
    if (!nodeEnv) {
      throw new Error('NODE_ENV is required and must be "local" or "production"');
    }
    
    if (!['local', 'production'].includes(nodeEnv)) {
      throw new Error(`Invalid NODE_ENV: "${nodeEnv}". Must be "local" or "production"`);
    }
    
    return nodeEnv as Environment;
  }
  
  /**
   * Determine current phase based on available services
   */
  getPhase(): Phase {
    const hasQdrant = !!process.env.QDRANT_URL;
    const hasSupabase = !!process.env.SUPABASE_URL;
    
    if (hasSupabase) return 'DATABASE-READY';
    if (hasQdrant) return 'VECTOR-READY';
    return 'BOOTABLE';
  }
  
  /**
   * Validate required variables for current phase
   */
  validateCurrentPhase(): void {
    const environment = this.getEnvironment();
    const phase = this.getPhase();
    
    // Phase 0 - BOOTABLE requirements
    if (!process.env.CLOUD_PORT) {
      throw new Error('CLOUD_PORT is required for BOOTABLE phase');
    }
    
    if (!process.env.CORS_ORIGINS) {
      throw new Error('CORS_ORIGINS is required for BOOTABLE phase');
    }
    
    // Phase 1 - VECTOR-READY requirements
    if (phase !== 'BOOTABLE') {
      if (!process.env.QDRANT_URL) {
        throw new Error('QDRANT_URL is required for VECTOR-READY phase');
      }
      
      // Production requires API key for Qdrant
      if (environment === 'production' && !process.env.QDRANT_API_KEY) {
        throw new Error('QDRANT_API_KEY is required for production VECTOR-READY phase');
      }
    }
    
    // Phase 2 - DATABASE-READY requirements
    if (phase === 'DATABASE-READY') {
      if (!process.env.SUPABASE_URL) {
        throw new Error('SUPABASE_URL is required for DATABASE-READY phase');
      }
      
      if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
        throw new Error('SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY is required for DATABASE-READY phase');
      }
    }
  }
  
  /**
   * Log environment and phase information
   */
  logEnvironmentInfo(): void {
    const environment = this.getEnvironment();
    const phase = this.getPhase();
    
    this.logger.log(`🌍 ENVIRONMENT: ${environment.toUpperCase()}`);
    this.logger.log(`🚀 PHASE: ${phase}`);
    
    // Log service availability
    if (phase !== 'BOOTABLE') {
      this.logger.log(`🔍 QDRANT: ${process.env.QDRANT_URL}`);
    }
    
    if (phase === 'DATABASE-READY') {
      this.logger.log(`💾 SUPABASE: ${process.env.SUPABASE_URL}`);
    }
  }
  
  /**
   * Get environment-specific defaults
   */
  getDefaults() {
    const environment = this.getEnvironment();
    
    if (environment === 'local') {
      return {
        qdrantUrl: 'http://localhost:6333',
        supabaseUrl: 'http://localhost:54321',
        whisperUrl: 'http://localhost:8000/stt/whisper',
        whisperXUrl: 'http://localhost:8000/stt/whisperx',
        coquiTtsUrl: 'http://localhost:8000/tts/coqui',
        qwen3TtsUrl: 'http://localhost:8000/tts/qwen3',
        rpaUrl: 'http://localhost:8000/rpa',
      };
    }
    
    // Production defaults
    return {
      qdrantUrl: process.env.QDRANT_URL,
      supabaseUrl: process.env.SUPABASE_URL,
      whisperUrl: 'https://keledon.tuyoisaza.com/stt/whisper',
      whisperXUrl: 'https://keledon.tuyoisaza.com/stt/whisperx',
      coquiTtsUrl: 'https://keledon.tuyoisaza.com/tts/coqui',
      qwen3TtsUrl: 'https://keledon.tuyoisaza.com/tts/qwen3',
      rpaUrl: 'https://keledon.tuyoisaza.com/rpa',
    };
  }
}