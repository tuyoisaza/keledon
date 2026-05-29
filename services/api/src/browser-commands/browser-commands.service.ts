import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommandResultDto } from './dto/browser-commands.dto';

export interface BrowserCommandEnvelope {
  id: string;
  sessionId: string;
  flowRunId?: string | null;
  type: string;
  priority?: string;
  expiresAt?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

import { AuthenticatedActor } from '../types/auth.types';

interface ActorContext {
  userId?: string;
  teamId?: string;
  companyId?: string;
  role?: string;
}

const ALLOWED_COMMAND_RESULT_STATUSES = new Set([
  'completed',
  'failed',
  'partial',
]);

@Injectable()
export class BrowserCommandsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextCommand(deviceId: string, actor?: AuthenticatedActor) {
    this.assertNonEmptyString(deviceId, 'deviceId');
    await this.requireAccessibleDevice(deviceId, actor);

    const sessions = await this.prisma.session.findMany({
      where: {
        status: {
          notIn: ['closed', 'failed'],
        },
      },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    const nextPending = this.findNextPendingCommand(sessions, deviceId);

    if (!nextPending) {
      return {
        deviceId,
        command: null,
      };
    }

    await this.prisma.event.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        sessionId: nextPending.sessionId,
        type: 'browser.command.claimed',
        payload: JSON.stringify({
          commandId: nextPending.command.id,
          metadata: {
            deviceId,
            claimedAt: new Date().toISOString(),
            source: 'browser-commands.getNextCommand',
          },
        }),
      },
    });

    return {
      deviceId,
      sessionId: nextPending.sessionId,
      command: nextPending.command,
    };
  }

  async recordCommandResult(
    deviceId: string,
    dto: CommandResultDto,
    actor?: AuthenticatedActor,
  ) {
    this.assertNonEmptyString(deviceId, 'deviceId');
    this.assertNonEmptyString(dto.commandId, 'commandId');
    this.assertOptionalString(dto.startedAt, 'startedAt');
    this.assertOptionalString(dto.completedAt, 'completedAt');
    this.assertOptionalString(dto.error ?? undefined, 'error');
    this.assertOptionalRecord(dto.extracted, 'extracted');
    this.assertOptionalRecord(dto.metadata, 'metadata');
    this.assertEvidence(dto.evidence);

    if (!ALLOWED_COMMAND_RESULT_STATUSES.has(dto.status)) {
      throw new BadRequestException(`Unsupported status: ${dto.status}`);
    }

    await this.requireAccessibleDevice(deviceId, actor);
    const sessions = await this.prisma.session.findMany({
      include: {
        events: {
          where: {
            OR: [
              { type: 'browser.command.claimed' },
              { type: 'browser.command.issued' },
              { type: 'browser.command.result' },
            ],
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: 200,
    });

    const matchedSession = sessions.find((session) =>
      this.findIssuedCommand(session.events, dto.commandId, deviceId),
    );

    if (!matchedSession) {
      throw new NotFoundException(
        `Command ${dto.commandId} not found for device ${deviceId}`,
      );
    }

    const existingResult = this.findExistingResultEvent(
      matchedSession.events,
      dto.commandId,
    );
    if (existingResult) {
      return {
        sessionId: matchedSession.id,
        duplicate: true,
        event: existingResult,
      };
    }

    const issuedCommand = matchedSession.events.find((event) => {
      if (event.type !== 'browser.command.issued' || !event.payload) {
        return false;
      }
      const payload = this.parseJson(event.payload);
      return (
        payload.id === dto.commandId && payload.metadata?.deviceId === deviceId
      );
    });

    const resultEvent = await this.prisma.event.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        sessionId: matchedSession.id,
        type: 'browser.command.result',
        payload: JSON.stringify({
          commandId: dto.commandId,
          status: dto.status,
          startedAt: dto.startedAt || null,
          completedAt: dto.completedAt || new Date().toISOString(),
          evidence: dto.evidence || [],
          extracted: dto.extracted || {},
          error: dto.error || null,
          metadata: {
            deviceId,
            ...(dto.metadata || {}),
          },
        }),
      },
    });

    const commandPayload = issuedCommand?.payload
      ? this.parseJson(issuedCommand.payload)
      : {};
    const flowRunId = this.findFlowRunId(matchedSession.events, dto.commandId);
    if (flowRunId) {
      await this.prisma.flowRun.update({
        where: { id: flowRunId },
        data: {
          status:
            dto.status === 'completed'
              ? 'completed'
              : dto.status === 'failed'
                ? 'failed'
                : 'running',
          completedAt: dto.status === 'partial' ? null : new Date(),
          error: dto.error || null,
          result: JSON.stringify({
            commandId: dto.commandId,
            deviceId,
            previousCommand: commandPayload,
            extracted: dto.extracted || {},
            evidence: dto.evidence || [],
          }),
        },
      });
    }

    await this.prisma.event.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        sessionId: matchedSession.id,
        type:
          dto.status === 'failed' ? 'rpa.step.failed' : 'rpa.step.completed',
        payload: JSON.stringify({
          commandId: dto.commandId,
          deviceId,
          status: dto.status,
          extracted: dto.extracted || {},
          error: dto.error || null,
        }),
      },
    });

    return {
      sessionId: matchedSession.id,
      duplicate: false,
      event: {
        ...resultEvent,
        payload: this.parseJson(resultEvent.payload),
      },
    };
  }

  private findNextPendingCommand(
    sessions: Array<{
      id: string;
      metadata: string | null;
      events: Array<{ type: string; payload: string | null; createdAt?: Date }>;
    }>,
    deviceId: string,
  ) {
    const candidates = sessions.flatMap((session) => {
      const sessionMetadata = this.parseJson(session.metadata);
      const sessionMatchesDevice = sessionMetadata.deviceId === deviceId;

      return session.events
        .filter(
          (event) =>
            event.type === 'browser.command.issued' && Boolean(event.payload),
        )
        .map((event) => {
          const command = this.parseJson(
            event.payload,
          ) as BrowserCommandEnvelope;
          return {
            sessionId: session.id,
            eventCreatedAt: event.createdAt
              ? new Date(event.createdAt).getTime()
              : 0,
            command,
            sessionMatchesDevice,
          };
        })
        .filter(
          ({ command, sessionMatchesDevice }) =>
            Boolean(command.id) &&
            (command.metadata?.deviceId === deviceId || sessionMatchesDevice) &&
            !this.isExpired(command) &&
            !this.commandHasResult(session.events, command.id) &&
            !this.commandHasBeenClaimed(session.events, command.id, deviceId),
        );
    });

    candidates.sort(
      (left, right) => left.eventCreatedAt - right.eventCreatedAt,
    );
    return candidates[0] || null;
  }

  private findPendingCommandForLegacyReaders(
    events: Array<{ type: string; payload: string | null }>,
    deviceId: string,
  ) {
    const issued = events
      .filter((event) => event.type === 'browser.command.issued')
      .map((event) => this.parseJson(event.payload) as BrowserCommandEnvelope)
      .filter(
        (command) => command.id && command.metadata?.deviceId === deviceId,
      )
      .filter((command) => !this.isExpired(command));

    const completed = new Set(
      events
        .filter((event) => event.type === 'browser.command.result')
        .map((event) => this.parseJson(event.payload).commandId)
        .filter(Boolean),
    );

    return issued.find((command) => !completed.has(command.id)) || null;
  }

  private commandHasResult(
    events: Array<{ type: string; payload: string | null }>,
    commandId: string,
  ) {
    return Boolean(this.findExistingResultEvent(events, commandId));
  }

  private commandHasBeenClaimed(
    events: Array<{ type: string; payload: string | null }>,
    commandId: string,
    deviceId: string,
  ) {
    return events.some((event) => {
      if (event.type !== 'browser.command.claimed' || !event.payload) {
        return false;
      }

      const payload = this.parseJson(event.payload);
      return (
        payload.commandId === commandId &&
        payload.metadata?.deviceId === deviceId
      );
    });
  }

  private findIssuedCommand(
    events: Array<{ type: string; payload: string | null }>,
    commandId: string,
    deviceId: string,
  ) {
    return events.some((event) => {
      if (event.type !== 'browser.command.issued' || !event.payload) {
        return false;
      }

      const payload = this.parseJson(event.payload);
      return (
        payload.id === commandId && payload.metadata?.deviceId === deviceId
      );
    });
  }

  private findExistingResultEvent(
    events: Array<{
      id?: string;
      type: string;
      payload: string | null;
      createdAt?: Date;
    }>,
    commandId: string,
  ) {
    const existing = events.find((event) => {
      if (event.type !== 'browser.command.result' || !event.payload) {
        return false;
      }

      const payload = this.parseJson(event.payload);
      return payload.commandId === commandId;
    });

    if (!existing) {
      return null;
    }

    return {
      ...existing,
      payload: this.parseJson(existing.payload),
    };
  }

  private isExpired(command: BrowserCommandEnvelope) {
    return Boolean(
      command.expiresAt && new Date(command.expiresAt).getTime() <= Date.now(),
    );
  }

  private findPendingCommand(
    events: Array<{ type: string; payload: string | null }>,
    deviceId: string,
  ) {
    const issued = events
      .filter((event) => event.type === 'browser.command.issued')
      .map((event) => this.parseJson(event.payload) as BrowserCommandEnvelope)
      .filter(
        (command) => command.id && command.metadata?.deviceId === deviceId,
      )
      .filter(
        (command) =>
          !command.expiresAt ||
          new Date(command.expiresAt).getTime() > Date.now(),
      );

    const completed = new Set(
      events
        .filter((event) => event.type === 'browser.command.result')
        .map((event) => this.parseJson(event.payload).commandId)
        .filter(Boolean),
    );

    return issued.find((command) => !completed.has(command.id)) || null;
  }

  private findFlowRunId(
    events: Array<{ type: string; payload: string | null }>,
    commandId: string,
  ) {
    const issued = events.find((event) => {
      if (event.type !== 'browser.command.issued') {
        return false;
      }
      const payload = this.parseJson(event.payload);
      return payload.id === commandId;
    });

    if (!issued?.payload) {
      return null;
    }

    return this.parseJson(issued.payload).flowRunId || null;
  }

  private parseJson(value: string | null | undefined): Record<string, any> {
    if (!value) {
      return {};
    }

    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private async resolveActorContext(
    actor?: AuthenticatedActor,
  ): Promise<ActorContext> {
    if (!actor?.userId) {
      return { role: actor?.role };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      select: {
        id: true,
        role: true,
        companyId: true,
        teamId: true,
        team: {
          select: {
            id: true,
            brand: { select: { companyId: true } },
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException(
        `Authenticated user ${actor.userId} was not found`,
      );
    }

    return {
      userId: user.id,
      teamId: user.teamId || user.team?.id || undefined,
      companyId: user.companyId || user.team?.brand?.companyId || undefined,
      role: user.role || actor.role,
    };
  }

  private async requireAccessibleDevice(
    deviceId: string,
    actor?: AuthenticatedActor,
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        user: {
          select: {
            id: true,
            teamId: true,
            companyId: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (!actor?.userId) {
      return device;
    }

    const actorContext = await this.resolveActorContext(actor);
    const sameUser = Boolean(
      device.userId && device.userId === actorContext.userId,
    );
    const sameTeam = Boolean(
      actorContext.teamId &&
      device.user?.teamId &&
      actorContext.teamId === device.user.teamId,
    );
    const sameCompany = Boolean(
      actorContext.companyId &&
      ((device.user?.companyId &&
        actorContext.companyId === device.user.companyId) ||
        (device.organizationId &&
          actorContext.companyId === device.organizationId)),
    );

    if (!sameUser && !sameTeam && !sameCompany) {
      throw new ForbiddenException(
        `Device ${deviceId} is not accessible to this user`,
      );
    }

    return device;
  }

  private assertNonEmptyString(value: string | undefined, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  private assertOptionalString(value: string | undefined, fieldName: string) {
    if (value !== undefined && typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
  }

  private assertOptionalRecord(
    value: Record<string, unknown> | undefined,
    fieldName: string,
  ) {
    if (
      value !== undefined &&
      (typeof value !== 'object' || value === null || Array.isArray(value))
    ) {
      throw new BadRequestException(`${fieldName} must be an object`);
    }
  }

  private assertEvidence(evidence: CommandResultDto['evidence']) {
    if (evidence === undefined) {
      return;
    }

    if (!Array.isArray(evidence)) {
      throw new BadRequestException('evidence must be an array');
    }

    for (const item of evidence) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.type !== 'string' ||
        !item.type.trim()
      ) {
        throw new BadRequestException('evidence entries must include a type');
      }
    }
  }
}
