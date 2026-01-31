import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient, SupabaseClientOptions } from '@supabase/supabase-js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: (configService: ConfigService) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.warn('[Supabase] Missing Supabase environment variables');
          // For development, provide fallback
          return createClient('http://localhost:3001', supabaseKey, {
            auth: {
              autoRefreshToken: true,
              persistSession: true
            }
          });
        }
        
        return createClient(supabaseUrl, supabaseKey, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            pkceAdminSecret: process.env.SUPABASE_ADMIN_SECRET
          },
          db: {
            schema: 'public',
            tables: {
              users: true,
              user_sessions: true,
              user_preferences: true
            }
          }
        });
      },
    },
  exports: ['SUPABASE_CLIENT'],
})
export class SupabaseModule {}