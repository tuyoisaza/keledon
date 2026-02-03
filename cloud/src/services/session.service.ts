import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, Event } from '../entities';
import { CreateSessionDto, UpdateSessionDto } from '../dto';
import { v4 as uuidv4 } from 'uuid';

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
  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    this.logger.log(`Creating session for agent: ${createSessionDto.agent_id}`);

    const session = this.sessionRepository.create({
      id: uuidv4(), // Real UUID generation
      name: createSessionDto.name || `Session ${Date.now()}`,
      status: 'active',
      agent_id: createSessionDto.agent_id,
      metadata: createSessionDto.metadata || {},
      started_at: new Date(),
      last_activity_at: new Date(),
      event_count: 0,
      user_id: createSessionDto.user_id,
    });

    const savedSession = await this.sessionRepository.save(session);
    this.logger.log(`Created session: ${savedSession.id}`);
    
    return savedSession;
  }

  /**
   * Get session by ID
   */
  async findById(id: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['events', 'user'],
    });

    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }

    return session;
  }

  /**
   * Get session by agent ID
   */
  async findByAgentId(agentId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { agent_id: agentId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get all sessions for a user
   */
  async findByUserId(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { user_id: userId },
      relations: ['events', 'user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get active sessions
   */
  async findActive(): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { status: 'active' },
      relations: ['user'],
      order: { last_activity_at: 'DESC' },
    });
  }

  /**
   * Update session
   */
  async update(id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
    const session = await this.findById(id);
    
    Object.assign(session, updateSessionDto);
    session.last_activity_at = new Date();
    
    const updatedSession = await this.sessionRepository.save(session);
    this.logger.log(`Updated session: ${id}`);
    
    return updatedSession;
  }

  /**
   * End session
   */
  async endSession(id: string, reason?: string): Promise<Session> {
    const session = await this.findById(id);
    
    session.status = 'ended';
    session.ended_at = new Date();
    session.last_activity_at = new Date();
    
    if (reason) {
      session.metadata = {
        ...session.metadata,
        end_reason: reason,
      };
    }
    
    const endedSession = await this.sessionRepository.save(session);
    this.logger.log(`Ended session: ${id}, reason: ${reason}`);
    
    return endedSession;
  }

  /**
   * Add event to session
   */
  async addEvent(sessionId: string, eventData: Partial<Event>): Promise<Event> {
    const session = await this.findById(sessionId);
    
    if (session.status !== 'active') {
      throw new BadRequestException(`Cannot add event to ${session.status} session`);
    }

    const event = this.eventRepository.create({
      id: uuidv4(),
      session_id: sessionId,
      type: eventData.type,
      payload: eventData.payload,
      agent_id: eventData.agent_id || session.agent_id,
      timestamp: eventData.timestamp || new Date(),
      processing_status: 'pending',
    });

    const savedEvent = await this.eventRepository.save(event);

    // Update session event count and last activity
    await this.sessionRepository.increment({ id: sessionId }, 'event_count', 1);
    await this.sessionRepository.update(sessionId, { 
      last_activity_at: new Date() 
    });

    this.logger.log(`Added event ${savedEvent.id} to session ${sessionId}`);
    
    return savedEvent;
  }

  /**
   * Get events for session
   */
  async getEvents(sessionId: string, limit = 100): Promise<Event[]> {
    return this.eventRepository.find({
      where: { session_id: sessionId },
      order: { timestamp: 'ASC' },
      take: limit,
    });
  }

  /**
   * Get session statistics
   */
  async getStatistics(sessionId: string): Promise<any> {
    const session = await this.findById(sessionId);
    const events = await this.getEvents(sessionId);
    
    const stats = {
      session_id: sessionId,
      status: session.status,
      event_count: events.length,
      duration_ms: session.started_at ? 
        Date.now() - session.started_at.getTime() : 0,
      event_types: events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {}),
      last_activity: session.last_activity_at,
    };

    return stats;
  }

  /**
   * Delete session
   */
  async remove(id: string): Promise<void> {
    const session = await this.findById(id);
    await this.sessionRepository.remove(session);
    this.logger.log(`Deleted session: ${id}`);
  }
}