import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { getRuntimeTier, isManagedProductionTier } from '../config/runtime-tier';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: (_configService: ConfigService) => {
        const runtimeTier = getRuntimeTier();
        const supabaseUrl = process.env.KELEDON_SUPABASE_URL;
        const supabaseKey = process.env.KELEDON_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error(`[Supabase] Missing Supabase environment variables for tier ${runtimeTier}`);
        }

        if (isManagedProductionTier(runtimeTier)) {
          const parsed = new URL(supabaseUrl);
          if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase())) {
            throw new Error('[Supabase] PRODUCTION_MANAGED cannot use localhost Supabase endpoint.');
          }
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
  ],
  exports: ['SUPABASE_CLIENT'],
})
export class SupabaseModule {}
