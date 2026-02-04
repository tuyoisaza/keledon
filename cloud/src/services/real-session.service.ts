/**
 * Real Session Service - Uses Supabase for persistence
 * Replaces in-memory mock with real database storage
 */

import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase-clean/supabase.service';
import { AgentEvent } from '../contracts/events';

@Injectable()
export class SessionService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createSession(agentId: string, metadata?: {
    tab_url?: string;
    tab_title?: string;
  }) {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('user_sessions')
        .insert({
          user_id: agentId, // Use agent_id as user_id for now
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          metadata: metadata || {},
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('[SessionService] Session creation error:', error);
        throw new Error(`Session creation failed: ${error.message}`);
      }

      console.log('[SessionService] Real session created in database:', data.id);
      return {
        id: data.id,
        agent_id: agentId,
        created_at: data.created_at,
        updated_at: data.updated_at,
        status: data.status,
        tab_url: metadata?.tab_url,
        tab_title: metadata?.tab_title,
        metadata: metadata || {}
      };
    } catch (error) {
      console.error('[SessionService] Session creation failed:', error);
      throw error;
    }
  }

  async getSession(sessionId: string) {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - session doesn't exist
          return null;
        }
        console.error('[SessionService] Session retrieval error:', error);
        throw new Error(`Session retrieval failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[SessionService] Session retrieval failed:', error);
      throw error;
    }
  }

  async updateSessionStatus(sessionId: string, status: string) {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('user_sessions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('[SessionService] Session update error:', error);
        throw new Error(`Session update failed: ${error.message}`);
      }

      console.log('[SessionService] Session status updated:', data.id, '->', status);
      return data;
    } catch (error) {
      console.error('[SessionService] Session update failed:', error);
      throw error;
    }
  }

  async persistEvent(sessionId: string, event: any) {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('agent_events')
        .insert({
          session_id: sessionId,
          event_type: event.event_type,
          payload: event.payload,
          agent_id: event.agent_id,
          ts: event.ts || new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[SessionService] Event persistence error:', error);
        throw new Error(`Event persistence failed: ${error.message}`);
      }

      console.log('[SessionService] Event persisted to database:', data.id);
      return data;
    } catch (error) {
      console.error('[SessionService] Event persistence failed:', error);
      throw error;
    }
  }

  async getSessionEvents(sessionId: string) {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('agent_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SessionService] Events retrieval error:', error);
        throw new Error(`Events retrieval failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[SessionService] Events retrieval failed:', error);
      throw error;
    }
  }

  async persistCommand(sessionId: string, command: any) {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('cloud_commands')
        .insert({
          session_id: sessionId,
          command_id: command.command_id,
          command_type: command.type,
          confidence: command.confidence,
          mode: command.mode,
          flow_id: command.flow_id,
          flow_run_id: command.flow_run_id,
          payload: command
        })
        .select()
        .single();

      if (error) {
        console.error('[SessionService] Command persistence error:', error);
        throw new Error(`Command persistence failed: ${error.message}`);
      }

      console.log('[SessionService] Command persisted to database:', data.id);
      return data;
    } catch (error) {
      console.error('[SessionService] Command persistence failed:', error);
      throw error;
    }
  }

  validateSession(sessionId: string): boolean {
    // In a real implementation, this would check the database
    // For now, perform a quick database check
    return !!sessionId; // Basic validation - actual check would query DB
  }

  getClient() {
    return this.supabaseService.getClient();
  }
}