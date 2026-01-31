import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { LocalServicesModule } from './local-services/local-services.module';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    AuthModule,
    LocalServicesModule,
    // We'll add RAG, RPA, and WebSocket modules here as we implement them
  ],
})
export class AppModule {}