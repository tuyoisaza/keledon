import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentEvent } from '../contracts/events';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(agentId: string, metadata?: {
    tab_url?: string;
    tab_title?: string;
    name?: string;
    userId?: string;
    teamId?: string;
  }): Promise<any> {
    this.logger.log(`Creating session for agent: ${agentId}`);

    try {
      const session = await this.prisma.session.create({
        data: {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'active',
          userId: metadata?.userId || null,
          teamId: metadata?.teamId || null,
          metadata: JSON.stringify(metadata || {}),
        }
      });
      
      this.logger.log(`Session created in DB: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create session in DB: ${error.message}`);
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });
      return session;
    } catch (error) {
      this.logger.error(`Failed to get session from DB: ${error.message}`);
      throw new Error(`Session retrieval failed: ${error.message}`);
    }
  }

  async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { status }
      });
    } catch (error) {
      this.logger.error(`Failed to update session in DB: ${error.message}`);
      throw new Error(`Session update failed: ${error.message}`);
    }
  }

  async persistEvent(sessionId: string, event: AgentEvent): Promise<any> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new BadRequestException(`Session ${sessionId} does not exist - cannot persist event`);
    }

    try {
      const persistedEvent = await this.prisma.event.create({
        data: {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sessionId: sessionId,
          type: event.event_type,
          payload: JSON.stringify(event.payload || {}),
        }
      });

      await this.updateSessionTimestamp(sessionId);
      this.logger.log(`Event persisted to DB: ${persistedEvent.id}`);
      return persistedEvent;
    } catch (error) {
      this.logger.error(`Failed to persist event to DB: ${error.message}`);
      throw new Error(`Event persistence failed: ${error.message}`);
    }
  }

  async getSessionEvents(sessionId: string): Promise<any[]> {
    try {
      const dbEvents = await this.prisma.event.findMany({
        where: { sessionId: sessionId },
        orderBy: { createdAt: 'asc' }
      });
      return dbEvents;
    } catch (error) {
      this.logger.error(`Failed to get events from DB: ${error.message}`);
      throw new Error(`Event retrieval failed: ${error.message}`);
    }
  }

  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() }
      });
    } catch (error) {
      this.logger.error(`Failed to update session timestamp in DB: ${error.message}`);
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId }
      });
      return !!session;
    } catch (error) {
      this.logger.error(`Failed to validate session in DB: ${error.message}`);
      return false;
    }
  }

  async findAll(): Promise<any[]> {
    try {
      const dbSessions = await this.prisma.session.findMany();
      return dbSessions;
    } catch (error) {
      this.logger.error(`Failed to get sessions from DB: ${error.message}`);
      throw new Error(`Session listing failed: ${error.message}`);
    }
  }

  async remove(sessionId: string): Promise<void> {
    try {
      await this.prisma.event.deleteMany({
        where: { sessionId: sessionId }
      });
      await this.prisma.session.delete({
        where: { id: sessionId }
      });
    } catch (error) {
      this.logger.error(`Failed to delete from DB: ${error.message}`);
      throw new Error(`Session deletion failed: ${error.message}`);
    }
  }
}
