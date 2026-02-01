import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MinimalSupabaseService } from '../supabase/minimal-supabase.service';

@Module({
  controllers: [AuthController],
  providers: [MinimalSupabaseService],
  exports: [MinimalSupabaseService],
})
export class AuthModule {}