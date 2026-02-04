import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Phase 2: Database interfaces for KELEDON persistence
export interface DatabaseSession {
  id: string;
  agent_id: string;
  status: string;
  tab_url?: string;
  tab_title?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseEvent {
  id: string;
  session_id: string;
  event_type: string;
  payload: any;
  ts: string;
  agent_id: string;
  created_at: string;
}

export interface DatabaseAgent {
  id: string;
  name: string;
  status: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private client: SupabaseClient;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    this.supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY') || 
                     this.configService.get<string>('SUPABASE_SERVICE_KEY') ||
                     this.configService.get<string>('SUPABASE_KEY');

    // Phase 2: Both SUPABASE_URL and SUPABASE_ANON_KEY/SERVICE_KEY are REQUIRED
    if (!this.supabaseUrl || !this.supabaseKey) {
      const error = 'SUPABASE_URL and SUPABASE_ANON_KEY/SERVICE_KEY are required in Phase 2';
      this.logger.error(error);
      throw new Error(error);
    }

    this.logger.log(`Initializing Supabase client at: ${this.supabaseUrl}`);
    
    try {
      this.client = createClient(this.supabaseUrl, this.supabaseKey);
      
      // Test connectivity
      await this.testConnection();
      
      // Ensure tables exist
      await this.ensureTables();
      
      this.logger.log('✅ Phase 2 DATABASE-READY: Supabase connected successfully');
      
    } catch (error) {
      this.logger.error(`Failed to connect to Supabase: ${error.message}`);
      // Phase 2: Fail fast if Supabase is unavailable
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
  }

  private async testConnection() {
    try {
      const { data, error } = await this.client
        .from('_tables')
        .select('count')
        .limit(1);
      
      // We expect this to fail (no _tables table), but it confirms connection works
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      
      this.logger.log('Supabase connection test successful');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        this.logger.log('Supabase connection test successful (tables not created yet)');
        return;
      }
      throw error;
    }
  }

  private async ensureTables() {
    const tables = [
      {
        name: 'sessions',
        sql: `
          CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            tab_url TEXT,
            tab_title TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'events',
        sql: `
          CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}',
            ts TIMESTAMPTZ NOT NULL,
            agent_id TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'agents',
        sql: `
          CREATE TABLE IF NOT EXISTS agents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'idle',
            capabilities TEXT[] DEFAULT '{}',
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      }
    ];

    for (const table of tables) {
      try {
        const { error } = await this.client.rpc('exec_sql', { sql: table.sql });
        if (error) {
          this.logger.warn(`Table creation warning for ${table.name}: ${error.message}`);
        } else {
          this.logger.log(`Table ensured: ${table.name}`);
        }
      } catch (error) {
        this.logger.warn(`Could not create table ${table.name}: ${error.message}`);
      }
    }
  }

  // === SESSION OPERATIONS ===

  async createSession(agentId: string, metadata?: {
    tab_url?: string;
    tab_title?: string;
    name?: string;
  }): Promise<DatabaseSession> {
    const { data, error } = await this.client
      .from('sessions')
      .insert({
        agent_id: agentId,
        status: 'active',
        tab_url: metadata?.tab_url,
        tab_title: metadata?.tab_title,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    this.logger.log(`Session created in Supabase: ${data.id}`);
    return data;
  }

  async getSession(sessionId: string): Promise<DatabaseSession | null> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  }

  async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    const { error } = await this.client
      .from('sessions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async findAllSessions(): Promise<DatabaseSession[]> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async removeSession(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  // === EVENT OPERATIONS ===

  async persistEvent(sessionId: string, event: {
    event_type: string;
    payload: any;
    ts: string;
    agent_id: string;
  }): Promise<DatabaseEvent> {
    const { data, error } = await this.client
      .from('events')
      .insert({
        session_id: sessionId,
        event_type: event.event_type,
        payload: event.payload,
        ts: event.ts,
        agent_id: event.agent_id
      })
      .select()
      .single();

    if (error) throw error;
    
    // Update session timestamp
    await this.updateSessionTimestamp(sessionId);
    
    return data;
  }

  async getSessionEvents(sessionId: string): Promise<DatabaseEvent[]> {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from('sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
  }

  // === AGENT OPERATIONS ===

  async createAgent(name: string, capabilities?: string[]): Promise<DatabaseAgent> {
    const { data, error } = await this.client
      .from('agents')
      .insert({
        name,
        status: 'idle',
        capabilities: capabilities || []
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateAgentStatus(agentId: string, status: string): Promise<void> {
    const { error } = await this.client
      .from('agents')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);

    if (error) throw error;
  }

  async getAgent(agentId: string): Promise<DatabaseAgent | null> {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // === HEALTH CHECK ===

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('sessions')
        .select('count')
        .limit(1);
      
      // Even if table doesn't exist, connection is working
      return !error || error.code === 'PGRST116';
    } catch (error) {
      this.logger.error(`Supabase health check failed: ${error.message}`);
      return false;
    }
  }

  getSupabaseUrl(): string {
    return this.supabaseUrl;
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}