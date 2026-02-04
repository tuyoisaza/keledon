import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, Event } from '../entities';
import { CreateSessionDto, UpdateSessionDto } from '../dto';
import { v4 as uuidv4 } from 'uuid';
import { AgentEvent } from '../contracts/events';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  
  // Fallback in-memory storage for compatibility
  private sessions = new Map<string, Session>();
  private events = new Map<string, Event[]>();

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

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
    
    const session = this.sessionRepository.create({
      id: sessionId,
      agent_id: agentId,
      name: metadata?.name || `Session ${Date.now()}`,
      status: 'active',
      tab_url: metadata?.tab_url,
      tab_title: metadata?.tab_title,
      created_at: now,
      updated_at: now,
      metadata: metadata || {}
    });

    // Try database first, fallback to memory
    try {
      const savedSession = await this.sessionRepository.save(session);
      this.sessions.set(savedSession.id, savedSession);
      this.events.set(savedSession.id, []);
      this.logger.log(`Session created in DB: ${savedSession.id}`);
      return savedSession;
    } catch (error) {
      // Fallback to in-memory
      this.sessions.set(sessionId, session);
      this.events.set(sessionId, []);
      this.logger.warn(`Session created in memory (DB failed): ${sessionId}`);
      return session;
    }
  }

  /**
   * Get session by ID (checks both DB and memory)
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Check memory first for performance
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId) || null;
    }

    // Check database
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId }
      });
      
      if (session) {
        this.sessions.set(sessionId, session);
        return session;
      }
    } catch (error) {
      this.logger.error(`Failed to get session from DB: ${error.message}`);
    }

    return null;
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: Session['status']): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const now = new Date().toISOString();
    session.status = status;
    session.updated_at = now;

    // Update database if possible
    try {
      await this.sessionRepository.update(sessionId, { status, updated_at: now });
    } catch (error) {
      this.logger.warn(`Failed to update session in DB, using memory: ${error.message}`);
    }

    // Always update memory
    this.sessions.set(sessionId, session);
  }

  /**
   * Persist an event to both DB and memory
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

    // Try database first
    try {
      const savedEvent = await this.eventRepository.save(persistedEvent);
      
      // Update memory cache
      const sessionEvents = this.events.get(sessionId) || [];
      sessionEvents.push(savedEvent);
      this.events.set(sessionId, sessionEvents);
      
      // Update session timestamp
      await this.updateSessionTimestamp(sessionId);
      
      this.logger.log(`Event persisted to DB: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      // Fallback to memory only
      const sessionEvents = this.events.get(sessionId) || [];
      sessionEvents.push(persistedEvent);
      this.events.set(sessionId, sessionEvents);
      
      await this.updateSessionTimestamp(sessionId);
      
      this.logger.warn(`Event persisted to memory only (DB failed): ${persistedEvent.id}`);
      return persistedEvent;
    }
  }

  /**
   * Get all events for a session
   */
  async getSessionEvents(sessionId: string): Promise<Event[]> {
    // Try database first
    try {
      const dbEvents = await this.eventRepository.find({
        where: { session_id: sessionId },
        order: { created_at: 'ASC' }
      });
      
      if (dbEvents.length > 0) {
        this.events.set(sessionId, dbEvents);
        return dbEvents;
      }
    } catch (error) {
      this.logger.warn(`Failed to get events from DB, using memory: ${error.message}`);
    }

    // Fallback to memory
    return this.events.get(sessionId) || [];
  }

  /**
   * Update session timestamp
   */
  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    
    try {
      await this.sessionRepository.update(sessionId, { updated_at: now });
    } catch (error) {
      this.logger.warn(`Failed to update session timestamp in DB: ${error.message}`);
    }

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
    try {
      const dbSessions = await this.sessionRepository.find();
      return dbSessions;
    } catch (error) {
      this.logger.warn(`Failed to get sessions from DB, using memory: ${error.message}`);
      return Array.from(this.sessions.values());
    }
  }

  /**
   * Delete session
   */
  async remove(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.delete(sessionId);
      await this.eventRepository.delete({ session_id: sessionId });
    } catch (error) {
      this.logger.warn(`Failed to delete from DB, using memory only: ${error.message}`);
    }

    this.sessions.delete(sessionId);
    this.events.delete(sessionId);
  }
}