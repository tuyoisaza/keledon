import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type EscalationRecord = Prisma.EscalationLogGetPayload<object>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

  async create(params: CreateEscalationParams): Promise<EscalationRecord> {
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
        },
      });

      this.logger.log(`Escalation created in DB: ${escalation.id}`);
      return escalation;
    } catch (error: unknown) {
      return this.fail('Escalation creation failed', error);
    }
  }

  async getById(id: string): Promise<EscalationRecord | null> {
    try {
      return await this.prisma.escalationLog.findUnique({
        where: { id },
      });
    } catch (error: unknown) {
      return this.fail('Escalation retrieval failed', error);
    }
  }

  async getBySessionId(sessionId: string): Promise<EscalationRecord[]> {
    try {
      return await this.prisma.escalationLog.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: unknown) {
      return this.fail('Escalation retrieval failed', error);
    }
  }

  async getByTeamId(teamId: string, limit = 100): Promise<EscalationRecord[]> {
    try {
      return await this.prisma.escalationLog.findMany({
        where: { teamId },
        orderBy: { createdAt: 'desc' },
        take: this.boundedLimit(limit),
      });
    } catch (error: unknown) {
      return this.fail('Escalation retrieval failed', error);
    }
  }

  async getActive(limit = 100): Promise<EscalationRecord[]> {
    try {
      return await this.prisma.escalationLog.findMany({
        where: { status: 'triggered' },
        orderBy: { createdAt: 'desc' },
        take: this.boundedLimit(limit),
      });
    } catch (error: unknown) {
      return this.fail('Escalation retrieval failed', error);
    }
  }

  async acknowledge(
    id: string,
    acknowledgedBy: string,
  ): Promise<EscalationRecord> {
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
        },
      });
    } catch (error: unknown) {
      return this.fail('Escalation acknowledgement failed', error);
    }
  }

  async resolve(id: string): Promise<EscalationRecord> {
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
        },
      });
    } catch (error: unknown) {
      return this.fail('Escalation resolution failed', error);
    }
  }

  async abort(id: string, reason?: string): Promise<EscalationRecord> {
    const escalation = await this.getById(id);
    if (!escalation) {
      throw new NotFoundException(`Escalation ${id} not found`);
    }

    try {
      let parsed: unknown;
      try {
        parsed = escalation.metadata ? JSON.parse(escalation.metadata) : {};
      } catch {
        parsed = {};
      }
      const metadata = isRecord(parsed) ? parsed : {};
      metadata.abortReason = reason || 'user_abort';

      return await this.prisma.escalationLog.update({
        where: { id },
        data: {
          status: 'aborted',
          metadata: JSON.stringify(metadata),
        },
      });
    } catch (error: unknown) {
      return this.fail('Escalation abort failed', error);
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

      const [total, triggered, acknowledged, resolved, aborted] =
        await Promise.all([
          this.prisma.escalationLog.count({ where }),
          this.prisma.escalationLog.count({
            where: { ...where, status: 'triggered' },
          }),
          this.prisma.escalationLog.count({
            where: { ...where, status: 'acknowledged' },
          }),
          this.prisma.escalationLog.count({
            where: { ...where, status: 'resolved' },
          }),
          this.prisma.escalationLog.count({
            where: { ...where, status: 'aborted' },
          }),
        ]);

      return { total, triggered, acknowledged, resolved, aborted };
    } catch (error: unknown) {
      return this.fail('Escalation stats failed', error);
    }
  }

  private boundedLimit(limit: number): number {
    if (!Number.isFinite(limit)) return 100;
    return Math.min(100, Math.max(1, Math.floor(limit)));
  }

  private fail(message: string, cause: unknown): never {
    this.logger.error(message);
    throw new Error(message, { cause });
  }
}
