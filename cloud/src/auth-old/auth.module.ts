import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { EnhancedAuthController } from './enhanced-auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '../config/config.service';

@Module({
  controllers: [
    AuthController,
    EnhancedAuthController,
  ],
  providers: [
    AuthService,
    SupabaseService,
    ConfigService,
  ],
  exports: [
    AuthService,
    SupabaseService,
    ConfigService,
  ],
})
export class AuthModule {}