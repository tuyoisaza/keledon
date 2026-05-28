import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateEscalationParams {
  sessionId?: string;
  teamId?: string;
  deviceId?: string;
  trigger: string;
  triggerType?: string;
  transcript?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEscalationParams {
  status?: string;
  acknowledgedBy?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateEscalationParams): Promise<any> {
    this.logger.log(`Creating escalation log for trigger: ${params.trigger}`);

    try {
      const escalation = await this.prisma.escalationLog.create({
        data: {
          sessionId: params.sessionId || null,
          teamId: params.teamId || null,
          deviceId: params.deviceId || null,
          trigger: params.trigger,
          triggerType: params.triggerType || 'keyword',
          transcript: params.transcript || null,
          status: 'triggered',
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        }
      });

      this.logger.log(`Escalation created in DB: ${escalation.id}`);
      return escalation;
    } catch (error) {
      this.logger.error(`Failed to create escalation in DB: ${error.message}`);
      throw new Error(`Escalation creation failed: ${error.message}`);
    }
  }

  async getById(id: string): Promise<any | null> {
    try {
      return await this.prisma.escalationLog.findUnique({
        where: { id }
      });
    } catch (error) {
      this.logger.error(`Failed to get escalation from DB: ${error.message}`);
      throw new Error(`Escalation retrieval failed: ${error.message}`);
    }
  }

  async getBySessionId(sessionId: string): Promise<any[]> {
    try {
      return await this.prisma.escalationLog.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.logger.error(`Failed to get escalations from DB: ${error.message}`);
      throw new Error(`Escalation retrieval failed: ${error.message}`);
    }
  }

  async getByTeamId(teamId: string, limit = 100): Promise<any[]> {
    try {
      return await this.prisma.escalationLog.findMany({
        where: { teamId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error(`Failed to get escalations from DB: ${error.message}`);
      throw new Error(`Escalation retrieval failed: ${error.message}`);
    }
  }

  async getActive(limit = 100): Promise<any[]> {
    try {
      return await this.prisma.escalationLog.findMany({
        where: { status: 'triggered' },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error(`Failed to get active escalations from DB: ${error.message}`);
      throw new Error(`Escalation retrieval failed: ${error.message}`);
    }
  }

  async acknowledge(id: string, acknowledgedBy: string): Promise<any> {
    const escalation = await this.getById(id);
    if (!escalation) {
      throw new NotFoundException(`Escalation ${id} not found`);
    }

    try {
      return await this.prisma.escalationLog.update({
        where: { id },
        data: {
          status: 'acknowledged',
          acknowledgedBy,
          acknowledgedAt: new Date(),
        }
      });
    } catch (error) {
      this.logger.error(`Failed to acknowledge escalation in DB: ${error.message}`);
      throw new Error(`Escalation acknowledge failed: ${error.message}`);
    }
  }

  async resolve(id: string): Promise<any> {
    const escalation = await this.getById(id);
    if (!escalation) {
      throw new NotFoundException(`Escalation ${id} not found`);
    }

    try {
      return await this.prisma.escalationLog.update({
        where: { id },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        }
      });
    } catch (error) {
      this.logger.error(`Failed to resolve escalation in DB: ${error.message}`);
      throw new Error(`Escalation resolve failed: ${error.message}`);
    }
  }

  async abort(id: string, reason?: string): Promise<any> {
    const escalation = await this.getById(id);
    if (!escalation) {
      throw new NotFoundException(`Escalation ${id} not found`);
    }

    try {
      const metadata = escalation.metadata ? JSON.parse(escalation.metadata) : {};
      metadata.abortReason = reason || 'user_abort';
      
      return await this.prisma.escalationLog.update({
        where: { id },
        data: {
          status: 'aborted',
          metadata: JSON.stringify(metadata),
        }
      });
    } catch (error) {
      this.logger.error(`Failed to abort escalation in DB: ${error.message}`);
      throw new Error(`Escalation abort failed: ${error.message}`);
    }
  }

  async getStats(teamId?: string): Promise<{
    total: number;
    triggered: number;
    acknowledged: number;
    resolved: number;
    aborted: number;
  }> {
    try {
      const where = teamId ? { teamId } : {};
      
      const [total, triggered, acknowledged, resolved, aborted] = await Promise.all([
        this.prisma.escalationLog.count({ where }),
        this.prisma.escalationLog.count({ where: { ...where, status: 'triggered' } }),
        this.prisma.escalationLog.count({ where: { ...where, status: 'acknowledged' } }),
        this.prisma.escalationLog.count({ where: { ...where, status: 'resolved' } }),
        this.prisma.escalationLog.count({ where: { ...where, status: 'aborted' } }),
      ]);

      return { total, triggered, acknowledged, resolved, aborted };
    } catch (error) {
      this.logger.error(`Failed to get escalation stats: ${error.message}`);
      throw new Error(`Escalation stats failed: ${error.message}`);
    }
  }
}