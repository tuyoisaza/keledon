import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SimpleSupabaseService {
  private readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    const supabaseUrl = config.get('SUPABASE_URL');
    const supabaseKey = config.get('SUPABASE_ANON_KEY');
    
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async signUp(email: string, password: string, name?: string) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email }
      }
    });

    if (error) throw new Error(`Registration failed: ${error.message}`);
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(`Login failed: ${error.message}`);
    return data;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(`Logout failed: ${error.message}`);
  }

  async getCurrentUser() {
    const { data: { user }, error } = await this.client.auth.getUser();
    if (error) throw new Error(`Failed to get user: ${error.message}`);
    return user;
  }
}