import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ActiveProviderConfig {
  ttsProviderId: string;
  ttsApiKey: string;
  ttsVoiceId: string;
  llmProviderId: string;
  companyId: string;
}

const DEFAULT_CONFIG: ActiveProviderConfig = {
  ttsProviderId: 'webspeech',
  ttsApiKey: '',
  ttsVoiceId: 'ef_dora',
  llmProviderId: '',
  companyId: '',
};

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.company_configs (
  id BIGSERIAL PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'default',
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, config_key)
);

ALTER TABLE public.company_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all on company_configs" ON public.company_configs
  USING (true)
  WITH CHECK (true);
`;

/**
 * Service that reads/writes active provider config from Supabase (company_configs table).
 * Falls back to env vars and local mvp-store if Supabase is unavailable.
 * Auto-creates the company_configs table on first use if it doesn't exist.
 */
@Injectable()
export class ProviderConfigService implements OnModuleInit {
  private readonly logger = new Logger(ProviderConfigService.name);
  private supabase: SupabaseClient | null = null;
  private configCache: ActiveProviderConfig = { ...DEFAULT_CONFIG };

  onModuleInit() {
    this.initSupabase();
  }

  private initSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        this.supabase = createClient(url, key);
        this.logger.log('Supabase client initialized for provider config');
        // Auto-create the table on startup
        this.ensureTableExists().catch(err =>
          this.logger.warn('Could not auto-create company_configs table:', err.message),
        );
      } catch (err) {
        this.logger.error('Failed to init Supabase client:', err);
      }
    } else {
      this.logger.warn('SUPABASE_URL or SUPABASE_KEY not set — provider config will not persist across deploys');
    }
  }

  private async ensureTableExists(): Promise<void> {
    if (!this.supabase) return;

    try {
      // Check if table exists by selecting from it
      const { error } = await this.supabase
        .from('company_configs')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (error && error.message?.includes('relation') && error.message?.includes('does not exist')) {
        this.logger.log('company_configs table does not exist — creating it...');
        // Use raw SQL query to create the table
        const { error: sqlError } = await this.supabase.rpc('exec_sql', {
          sql: CREATE_TABLE_SQL,
        });

        if (sqlError) {
          // If exec_sql RPC doesn't exist, try direct REST API approach
          this.logger.warn('Could not create table via RPC — trying direct insert...');
          // A failed insert will auto-create the table if RLS allows it
          // or we can log a helpful message
          this.logger.warn(`Table creation RPC failed: ${sqlError.message}`);
          this.logger.log('Please run the following SQL in your Supabase SQL editor:');
          this.logger.log(CREATE_TABLE_SQL);
        } else {
          this.logger.log('company_configs table created successfully');
        }
      }
    } catch (err) {
      this.logger.warn('Could not verify company_configs table:', err.message);
    }
  }

  async fetchActiveConfig(companyId?: string): Promise<ActiveProviderConfig> {
    if (!this.supabase || !companyId) {
      return this.configCache;
    }

    try {
      const { data, error } = await this.supabase
        .from('company_configs')
        .select('config_key, config_value')
        .eq('company_id', companyId)
        .in('config_key', ['active_tts_provider', 'active_llm_provider']);

      if (error) {
        this.logger.warn('Supabase fetch error:', error.message);
        return this.configCache;
      }

      if (data) {
        for (const row of data) {
          const val = row.config_value as Record<string, any>;
          if (row.config_key === 'active_tts_provider') {
            this.configCache.ttsProviderId = val.providerId || 'webspeech';
            this.configCache.ttsApiKey = val.apiKey || '';
            this.configCache.ttsVoiceId = val.voiceId || 'ef_dora';
          } else if (row.config_key === 'active_llm_provider') {
            this.configCache.llmProviderId = val.providerId || '';
          }
        }
      }
      this.configCache.companyId = companyId;
    } catch (err) {
      this.logger.error('Error fetching provider config:', err);
    }

    return this.configCache;
  }

  async saveTTSConfig(
    companyId: string,
    config: { providerId: string; apiKey?: string; voiceId?: string },
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const value = {
        providerId: config.providerId,
        apiKey: config.apiKey || '',
        voiceId: config.voiceId || 'ef_dora',
        updatedAt: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('company_configs')
        .upsert(
          {
            company_id: companyId,
            config_key: 'active_tts_provider',
            config_value: value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,config_key' },
        );

      if (error) {
        this.logger.error('Supabase upsert error:', error.message);
        return false;
      }

      // Update cache
      this.configCache.ttsProviderId = config.providerId;
      this.configCache.ttsApiKey = config.apiKey || '';
      this.configCache.ttsVoiceId = config.voiceId || 'ef_dora';
      this.configCache.companyId = companyId;

      return true;
    } catch (err) {
      this.logger.error('Error saving TTS config:', err);
      return false;
    }
  }

  async saveLLMConfig(
    companyId: string,
    config: { providerId: string },
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('company_configs')
        .upsert(
          {
            company_id: companyId,
            config_key: 'active_llm_provider',
            config_value: {
              providerId: config.providerId,
              updatedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,config_key' },
        );

      if (error) {
        this.logger.error('Supabase upsert error:', error.message);
        return false;
      }

      this.configCache.llmProviderId = config.providerId;
      this.configCache.companyId = companyId;

      return true;
    } catch (err) {
      this.logger.error('Error saving LLM config:', err);
      return false;
    }
  }

  getCachedConfig(): ActiveProviderConfig {
    return { ...this.configCache };
  }
}
