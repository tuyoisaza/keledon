import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AgentEvent } from '../contracts/events';
import { DatabaseService, DatabaseSession, DatabaseEvent } from './database.service';

// Phase 2: Database-backed session service
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Create a new session in Supabase (Phase 2: persistent)
   */
  async create(agentId: string, metadata?: {
    tab_url?: string;
    tab_title?: string;
    name?: string;
  }): Promise<DatabaseSession> {
    this.logger.log(`Creating session for agent: ${agentId}`);

    return await this.databaseService.createSession(agentId, metadata);
  }

  /**
   * Get session by ID from database
   */
  async getSession(sessionId: string): Promise<DatabaseSession | null> {
    return await this.databaseService.getSession(sessionId);
  }

  /**
   * Update session status in database
   */
  async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    await this.databaseService.updateSessionStatus(sessionId, status);
  }

  /**
   * Persist an event to database (Phase 2: persistent storage)
   */
  async persistEvent(sessionId: string, event: AgentEvent): Promise<DatabaseEvent> {
    // Validate session exists in database
    const session = await this.databaseService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException(`Session ${sessionId} does not exist - cannot persist event`);
    }

    const persistedEvent = await this.databaseService.persistEvent(sessionId, {
      event_type: event.event_type,
      payload: event.payload,
      ts: event.ts,
      agent_id: event.agent_id
    });
    
    this.logger.log(`Event persisted to database: ${persistedEvent.id}`);
    return persistedEvent;
  }

  /**
   * Get all events for a session from database
   */
  async getSessionEvents(sessionId: string): Promise<DatabaseEvent[]> {
    return await this.databaseService.getSessionEvents(sessionId);
  }

  /**
   * Validate session exists in database
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.databaseService.getSession(sessionId);
    return session !== null;
  }

  /**
   * Get all sessions from database
   */
  async findAll(): Promise<DatabaseSession[]> {
    return await this.databaseService.findAllSessions();
  }

  /**
   * Delete session from database
   */
  async remove(sessionId: string): Promise<void> {
    await this.databaseService.removeSession(sessionId);
  }
}