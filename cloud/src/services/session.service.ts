import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Event } from '../entities/event.entity';
import { CreateSessionDto, UpdateSessionDto } from '../dto';
import { v4 as uuidv4 } from 'uuid';
import { AgentEvent } from '../contracts/events';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

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

    // DATABASE-READY: No fallback to in-memory storage
    try {
      const savedSession = await this.sessionRepository.save(session);
      this.logger.log(`Session created in DB: ${savedSession.id}`);
      return savedSession;
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to create session in DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Session creation failed - Supabase connection required`);
    }
  }

  /**
   * Get session by ID (DATABASE-READY: Supabase only)
   */
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId }
      });
      
      return session || null;
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to get session from DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Session retrieval failed - Supabase connection required`);
    }
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

    // DATABASE-READY: Update database only
    try {
      await this.sessionRepository.update(sessionId, { status, updated_at: now });
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to update session in DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Session update failed - Supabase connection required`);
    }
  }

  /**
   * Persist an event to both DB and memory
   */
  async persistEvent(sessionId: string, event: AgentEvent): Promise<Event> {
    const session = await this.getSession(sessionId);
    if (!session) {
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

// DATABASE-READY: Persist to database only
    try {
      const savedEvent = await this.eventRepository.save(persistedEvent);
       
      // Update session timestamp
      await this.updateSessionTimestamp(sessionId);
       
      this.logger.log(`Event persisted to DB: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to persist event to DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Event persistence failed - Supabase connection required`);
    }
  }

/**
   * Get all events for a session (DATABASE-READY: Supabase only)
   */
  async getSessionEvents(sessionId: string): Promise<Event[]> {
    try {
      const dbEvents = await this.eventRepository.find({
        where: { session_id: sessionId },
        order: { created_at: 'ASC' }
      });
       
      return dbEvents;
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to get events from DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Event retrieval failed - Supabase connection required`);
    }
  }

/**
   * Update session timestamp (DATABASE-READY: Supabase only)
   */
  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
     
    try {
      await this.sessionRepository.update(sessionId, { updated_at: now });
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to update session timestamp in DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Session timestamp update failed - Supabase connection required`);
    }
  }

  /**
   * Validate session exists (DATABASE-READY: Supabase only)
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId }
      });
      return !!session;
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to validate session in DB: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all sessions (DATABASE-READY: Supabase only)
   */
  async findAll(): Promise<Session[]> {
    try {
      const dbSessions = await this.sessionRepository.find();
      return dbSessions;
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to get sessions from DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Session listing failed - Supabase connection required`);
    }
  }

  /**
   * Delete session (DATABASE-READY: Supabase only)
   */
  async remove(sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.delete(sessionId);
      await this.eventRepository.delete({ session_id: sessionId });
    } catch (error) {
      this.logger.error(`DATABASE-READY: Failed to delete from DB: ${error.message}`);
      throw new Error(`DATABASE-READY: Session deletion failed - Supabase connection required`);
    }
  }
}