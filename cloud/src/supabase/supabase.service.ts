import { Injectable } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { ConfigService } from '../config/config.service';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly config: ConfigService;

  constructor(config: ConfigService) {
    this.config = config;
    
    const supabaseUrl = config.getSupabaseConfig().url;
    const supabaseKey = config.getSupabaseConfig().key;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Supabase] Missing configuration, using local development settings');
    }
    
    this.client = createClient(supabaseUrl || 'http://localhost:54321', supabaseKey || 'your-development-key');
  }

  async signUp(email: string, password: string, name?: string) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email
          }
        }
      });

      if (error) {
        console.error('[Supabase] Sign up error:', error);
        throw new Error(`Registration failed: ${error.message}`);
      }

      console.log('[Supabase] User signed up successfully:', data);
      return data;
    } catch (error) {
      console.error('[Supabase] Sign up unexpected error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: true
        }
      });

      if (error) {
        console.error('[Supabase] Sign in error:', error);
        throw new Error(`Login failed: ${error.message}`);
      }

      console.log('[Supabase] User signed in successfully:', data);
      return data;
    } catch (error) {
      console.error('[Supabase] Sign in unexpected error:', error);
      throw error;
    }
  }

  async signOut(token?: string) {
    try {
      if (token) {
        const { error } = await this.client.auth.signOut({ token });
        if (error) {
          console.error('[Supabase] Sign out error:', error);
          throw new Error(`Logout failed: ${error.message}`);
        }
      } else {
        const { error } = await this.client.auth.signOut();
        if (error) {
          console.error('[Supabase] Sign out error:', error);
          throw new Error(`Logout failed: ${error.message}`);
        }
      }
      
      console.log('[Supabase] User signed out successfully');
    } catch (error) {
      console.error('[Supabase] Sign out unexpected error:', error);
      throw error;
    }
  }

  async verifyToken(token: string) {
    try {
      const { data, error } = await this.client.auth.getUser(token);
      
      if (error) {
        console.error('[Supabase] Token verification error:', error);
        throw new Error(`Token verification failed: ${error.message}`);
      }

      return {
        user: data.user,
        valid: true
      };
    } catch (error) {
      console.error('[Supabase] Token verification unexpected error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      
      if (error) {
        console.error('[Supabase] Get current user error:', error);
        throw new Error(`Failed to get current user: ${error.message}`);
      }

      return user || null;
    } catch (error) {
      console.error('[Supabase] Get current user unexpected error:', error);
      throw error;
    }
  }

  async resetPassword(email: string) {
    try {
      const { data, error } = await this.client.auth.resetPasswordForEmail(email);
      
      if (error) {
        console.error('[Supabase] Password reset error:', error);
        throw new Error(`Password reset failed: ${error.message}`);
      }

      console.log('[Supabase] Password reset email sent:', data);
      return data;
    } catch (error) {
      console.error('[Supabase] Password reset unexpected error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const { data, error } = await this.client.auth.refreshSession(refreshToken);
      
      if (error) {
        console.error('[Supabase] Token refresh error:', error);
        throw new Error(`Token refresh failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[Supabase] Token refresh unexpected error:', error);
      throw error;
    }
  }

  // Session management for RAG
  async createSession(userId: string, metadata?: any) {
    try {
      const { data, error } = await this.client
        .from('user_sessions')
        .insert({
          user_id: userId,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          metadata: metadata || {}
        });

      if (error) {
        console.error('[Supabase] Create session error:', error);
        throw new Error(`Session creation failed: ${error.message}`);
      }

      console.log('[Supabase] Session created:', data);
      return data;
    } catch (error) {
      console.error('[Supabase] Create session unexpected error:', error);
      throw error;
    }
  }

  async getSession(sessionId: string) {
    try {
      const { data, error } = await this.client
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('[Supabase] Get session error:', error);
        throw new Error(`Failed to get session: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[Supabase] Get session unexpected error:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: any) {
    try {
      const { data, error } = await this.client
        .from('user_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) {
        console.error('[Supabase] Update session error:', error);
        throw new Error(`Session update failed: ${error.message}`);
      }

      console.log('[Supabase] Session updated:', data);
      return data;
    } catch (error) {
      console.error('[Supabase] Update session unexpected error:', error);
      throw error;
    }
  }
}