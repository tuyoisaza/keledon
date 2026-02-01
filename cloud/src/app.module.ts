import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { EnhancedTTSModule } from './tts/enhanced-tts.module';

@Module({
  imports: [
    ConfigModule,
    EnhancedTTSModule,
    // Temporarily exclude auth/supabase modules to focus on TTS
    // SupabaseModule,
    // AuthModule,
    // LocalServicesModule,
    // We'll add RAG, RPA, and WebSocket modules here as we implement them
  ],
})
export class AppModule {}