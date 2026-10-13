import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../services/session.service';
import { DecisionEngineService } from '../services/decision-engine.service';
import { EscalationService } from '../services/escalation.service';
import {
  ALLOWED_CALL_EVENT_SOURCES,
  ALLOWED_CALL_EVENT_TYPES,
  ALLOWED_CALL_STATES,
  ALLOWED_CALL_TRANSITIONS,
  type ActorContext,
  type AuthenticatedActor,
  type CallSessionMetadata,
} from './calls.types';
import {
  createCall as createCallMethod,
  getCall as getCallMethod,
  appendCallEvent as appendCallEventMethod,
  appendTranscript as appendTranscriptMethod,
} from './calls-record.methods';
import {
  decide as decideMethod,
  close as closeMethod,
  escalate as escalateMethod,
} from './calls-lifecycle.methods';
import {
  CloseCallDto,
  CreateCallDto,
  CreateCallEventDto,
  DecideCallDto,
  EscalateCallDto,
  TranscriptTurnDto,
} from './dto/calls.dto';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly decisionEngineService: DecisionEngineService,
    private readonly escalationService: EscalationService,
  ) {}

  createCall(dto: CreateCallDto, actor?: AuthenticatedActor) {
    return createCallMethod.call(this, dto, actor);
  }

  getCall(sessionId: string, actor?: AuthenticatedActor) {
    return getCallMethod.call(this, sessionId, actor);
  }

  appendCallEvent(
    sessionId: string,
    dto: CreateCallEventDto,
    actor?: AuthenticatedActor,
  ) {
    return appendCallEventMethod.call(this, sessionId, dto, actor);
  }

  appendTranscript(
    sessionId: string,
    dto: TranscriptTurnDto,
    actor?: AuthenticatedActor,
  ) {
    return appendTranscriptMethod.call(this, sessionId, dto, actor);
  }

  decide(sessionId: string, dto: DecideCallDto, actor?: AuthenticatedActor) {
    return decideMethod.call(this, sessionId, dto, actor);
  }

  close(sessionId: string, dto: CloseCallDto, actor?: AuthenticatedActor) {
    return closeMethod.call(this, sessionId, dto, actor);
  }

  escalate(
    sessionId: string,
    dto: EscalateCallDto,
    actor?: AuthenticatedActor,
  ) {
    return escalateMethod.call(this, sessionId, dto, actor);
  }

  private async requireSessionFromStore(sessionId: string) {
    return this.requireSession(sessionId);
  }

  private async updateSessionState(
    sessionId: string,
    state: string,
    options?: { metadata?: CallSessionMetadata },
  ) {
    const session = await this.requireSession(sessionId);
    const metadata = options?.metadata || this.parseMetadata(session.metadata);
    metadata.state = state;
    metadata.lastTransitionAt = new Date().toISOString();

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: state,
        metadata: JSON.stringify(metadata),
      },
    });
  }

  private parseMetadata(
    metadata: string | null | undefined,
  ): CallSessionMetadata {
    const parsed = this.parseJson(metadata);
    return {
      callId: String(parsed.callId || ''),
      state: String(parsed.state || 'standby'),
      language: String(parsed.language || 'es-MX'),
      turnCount: Number(parsed.turnCount || 0),
      transcript: Array.isArray(parsed.transcript) ? parsed.transcript : [],
      startedAt: String(parsed.startedAt || new Date().toISOString()),
      lastTransitionAt: String(
        parsed.lastTransitionAt || new Date().toISOString(),
      ),
      ...parsed,
    };
  }

  private async assertSessionAccess(session: any, actor?: AuthenticatedActor) {
    if (!actor?.userId) {
      return;
    }

    const actorContext = await this.resolveActorContext(actor);
    const metadata = this.parseMetadata(session.metadata);
    const sessionTeamId = metadata.teamId || session.teamId || null;
    const sessionUserId = session.userId || null;
    const sessionCompanyId = session.team?.brand?.companyId || null;

    const userMatches = Boolean(
      actorContext.userId &&
      sessionUserId &&
      actorContext.userId === sessionUserId,
    );
    const teamMatches = Boolean(
      actorContext.teamId &&
      sessionTeamId &&
      actorContext.teamId === sessionTeamId,
    );
    const companyMatches = Boolean(
      actorContext.companyId &&
      sessionCompanyId &&
      actorContext.companyId === sessionCompanyId,
    );
    const deviceMatches = Boolean(
      metadata.deviceId &&
      (await this.canAccessDevice(String(metadata.deviceId), actorContext)),
    );

    if (!userMatches && !teamMatches && !companyMatches && !deviceMatches) {
      throw new ForbiddenException(
        `Session ${session.id} is not accessible to this user`,
      );
    }
  }

  private async requireSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        team: { select: { id: true, brand: { select: { companyId: true } } } },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
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

  private async requireAccessibleDevice(deviceId: string, actor: ActorContext) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        user: {
          select: {
            id: true,
            companyId: true,
            teamId: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (!actor.userId) {
      return device;
    }

    const sameUser = Boolean(device.userId && device.userId === actor.userId);
    const sameTeam = Boolean(
      device.user?.teamId &&
      actor.teamId &&
      device.user.teamId === actor.teamId,
    );
    const sameCompany = Boolean(
      actor.companyId &&
      ((device.user?.companyId && device.user.companyId === actor.companyId) ||
        (device.organizationId && device.organizationId === actor.companyId)),
    );

    if (!sameUser && !sameTeam && !sameCompany) {
      throw new ForbiddenException(
        `Device ${deviceId} is not accessible to this user`,
      );
    }

    return device;
  }

  private async canAccessDevice(deviceId: string, actor: ActorContext) {
    try {
      await this.requireAccessibleDevice(deviceId, actor);
      return true;
    } catch {
      return false;
    }
  }

  private resolveUserId(dtoUserId: string | undefined, actor: ActorContext) {
    if (actor.userId && dtoUserId && dtoUserId !== actor.userId) {
      throw new ForbiddenException(
        'dto.userId does not match authenticated user',
      );
    }

    return actor.userId || dtoUserId;
  }

  private async resolveTeamId(
    dtoTeamId: string | undefined,
    actor: ActorContext,
    deviceUserId?: string | null,
  ) {
    if (actor.teamId && dtoTeamId && dtoTeamId !== actor.teamId) {
      throw new ForbiddenException(
        'dto.teamId does not match authenticated user team',
      );
    }

    if (dtoTeamId) {
      await this.assertTeamAccessible(dtoTeamId, actor);
      return dtoTeamId;
    }

    if (actor.teamId) {
      return actor.teamId;
    }

    if (!deviceUserId) {
      return undefined;
    }

    const deviceUser = await this.prisma.user.findUnique({
      where: { id: deviceUserId },
      select: { teamId: true },
    });

    const teamId = deviceUser?.teamId || undefined;
    if (teamId) {
      await this.assertTeamAccessible(teamId, actor);
    }

    return teamId;
  }

  private async assertTeamAccessible(teamId: string, actor: ActorContext) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        brand: { select: { companyId: true } },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    if (actor.teamId && actor.teamId !== teamId) {
      throw new ForbiddenException(
        `Team ${teamId} is not accessible to this user`,
      );
    }

    if (
      actor.companyId &&
      team.brand?.companyId &&
      actor.companyId !== team.brand.companyId
    ) {
      throw new ForbiddenException(
        `Team ${teamId} is not accessible to this company`,
      );
    }
  }

  private assertAllowedEventType(type: string) {
    if (!ALLOWED_CALL_EVENT_TYPES.has(type)) {
      throw new BadRequestException(`Unsupported call event type: ${type}`);
    }
  }

  private assertAllowedEventSource(source: string) {
    if (!ALLOWED_CALL_EVENT_SOURCES.has(source)) {
      throw new BadRequestException(`Unsupported call event source: ${source}`);
    }
  }

  private assertAllowedState(state: string, fieldName: string) {
    if (!ALLOWED_CALL_STATES.has(state)) {
      throw new BadRequestException(`Unsupported ${fieldName}: ${state}`);
    }
  }

  private validateStateTransition(
    nextState: string | null,
    previousState: string | null,
  ) {
    if (!nextState) {
      return;
    }

    this.assertAllowedState(nextState, 'stateAfter');
    if (!previousState) {
      return;
    }

    this.assertAllowedState(previousState, 'stateBefore');
    const transition = `${previousState}->${nextState}`;
    if (!ALLOWED_CALL_TRANSITIONS.has(transition)) {
      throw new BadRequestException(
        `Unsupported call state transition: ${transition}`,
      );
    }
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

  private parseJson(value: string | null | undefined): Record<string, any> {
    if (!value) {
      return {};
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      this.logger.warn(
        `Failed to parse JSON metadata: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    }
  }
}
