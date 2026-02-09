import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRuntimeTier, isManagedProductionTier } from '../config/runtime-tier';

@Injectable()
export class MinimalSupabaseService {
  private supabase: SupabaseClient;
  private supabaseUrl: string;

  constructor(config: ConfigService) {
    const runtimeTier = getRuntimeTier();
    this.supabaseUrl =
      config.get('KELEDON_SUPABASE_URL') ||
      config.get('SUPABASE_URL') ||
      (runtimeTier === 'DEV_LOCAL' ? 'http://localhost:54321' : '');
    const supabaseKey =
      config.get('KELEDON_SUPABASE_ANON_KEY') ||
      config.get('SUPABASE_ANON_KEY') ||
      (runtimeTier === 'DEV_LOCAL' ? 'your-development-key' : '');

    if (!supabaseKey || supabaseKey.includes('REDACTED') || supabaseKey === 'your-development-key') {
      throw new Error('SUPABASE_ANON_KEY must be configured with real Supabase API key');
    }

    if (isManagedProductionTier(runtimeTier)) {
      const parsed = new URL(this.supabaseUrl);
      if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase())) {
        throw new Error('PRODUCTION_MANAGED cannot use localhost Supabase URL');
      }
    }

    this.supabase = createClient(this.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });

    console.log(`[Real Supabase] Initialized with URL: ${this.supabaseUrl}`);
  }

  async signUp(email: string, password: string, name?: string) {
    try {
      console.log(`[Real Supabase] Signing up: ${email}`);
      
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email
          }
        }
      });

      if (error) {
        console.error('[Real Supabase] Sign up error:', error);
        throw new Error(`Sign up failed: ${error.message}`);
      }

      console.log('[Real Supabase] Sign up successful');
      return {
        user: data.user,
        session: data.session
      };

    } catch (error) {
      console.error('[Real Supabase] Sign up exception:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      console.log(`[Real Supabase] Signing in: ${email}`);
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('[Real Supabase] Sign in error:', error);
        throw new Error(`Sign in failed: ${error.message}`);
      }

      console.log('[Real Supabase] Sign in successful');
      return {
        user: data.user,
        session: data.session
      };

    } catch (error) {
      console.error('[Real Supabase] Sign in exception:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      console.log('[Real Supabase] Signing out');
      
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        console.error('[Real Supabase] Sign out error:', error);
        throw new Error(`Sign out failed: ${error.message}`);
      }

      console.log('[Real Supabase] Sign out successful');

    } catch (error) {
      console.error('[Real Supabase] Sign out exception:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      console.log('[Real Supabase] Getting current user');
      
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        console.error('[Real Supabase] Get current user error:', error);
        return null;
      }

      if (!user) {
        console.log('[Real Supabase] No current user');
        return null;
      }

      console.log(`[Real Supabase] Current user: ${user.email}`);
      return user;

    } catch (error) {
      console.error('[Real Supabase] Get current user exception:', error);
      return null;
    }
  }

  async verifyToken(token: string) {
    try {
      console.log('[Real Supabase] Verifying token');
      
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error) {
        console.error('[Real Supabase] Token verification error:', error);
        return {
          valid: false,
          error: error.message
        };
      }

      if (!data.user) {
        console.log('[Real Supabase] Invalid token - no user found');
        return {
          valid: false,
          error: 'Invalid token'
        };
      }

      console.log('[Real Supabase] Token verification successful');
      return {
        valid: true,
        user: data.user
      };

    } catch (error) {
      console.error('[Real Supabase] Token verification exception:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getSupabaseUrl(): string {
    return this.supabaseUrl;
  }
}
