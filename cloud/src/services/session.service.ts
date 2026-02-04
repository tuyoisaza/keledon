import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AgentEvent } from '../contracts/events';

// Simple interfaces for in-memory storage
interface Session {
  id: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  tab_url?: string;
  tab_title?: string;
  metadata?: Record<string, any>;
}

interface Event {
  id: string;
  session_id: string;
  event_type: string;
  payload: any;
  ts: string;
  agent_id: string;
  created_at: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  
  // In-memory storage for bootability
  private sessions = new Map<string, Session>();
  private events = new Map<string, Event[]>();

  constructor() {}

  /**
   * Create a new session with real UUID
   */
  async create(agentId: string, metadata?: {
    tab_url?: string;
    tab_title?: string;
    name?: string;
  }): Promise<Session> {
    this.logger.log(`Creating session for agent: ${agentId}`);

    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    const session: Session = {
      id: sessionId,
      agent_id: agentId,
      status: 'active',
      tab_url: metadata?.tab_url,
      tab_title: metadata?.tab_title,
      created_at: now,
      updated_at: now,
      metadata: metadata || {}
    };

    // Store in memory
    this.sessions.set(sessionId, session);
    this.events.set(sessionId, []);
    
    this.logger.log(`Session created in memory: ${sessionId}`);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: Session['status']): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const now = new Date().toISOString();
    session.status = status;
    session.updated_at = now;

    this.sessions.set(sessionId, session);
  }

  /**
   * Persist an event to memory
   */
  async persistEvent(sessionId: string, event: AgentEvent): Promise<Event> {
    if (!this.sessions.has(sessionId)) {
      throw new BadRequestException(`Session ${sessionId} does not exist - cannot persist event`);
    }

    const persistedEvent: Event = {
      id: uuidv4(),
      session_id: sessionId,
      event_type: event.event_type,
      payload: event.payload,
      ts: event.ts,
      agent_id: event.agent_id,
      created_at: new Date().toISOString()
    };

    const sessionEvents = this.events.get(sessionId) || [];
    sessionEvents.push(persistedEvent);
    this.events.set(sessionId, sessionEvents);
    
    // Update session timestamp
    await this.updateSessionTimestamp(sessionId);
    
    this.logger.log(`Event persisted to memory: ${persistedEvent.id}`);
    return persistedEvent;
  }

  /**
   * Get all events for a session
   */
  async getSessionEvents(sessionId: string): Promise<Event[]> {
    return this.events.get(sessionId) || [];
  }

  /**
   * Update session timestamp
   */
  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.updated_at = now;
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Validate session exists
   */
  validateSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all sessions
   */
  async findAll(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete session
   */
  async remove(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.events.delete(sessionId);
  }
}