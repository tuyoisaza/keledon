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
  CloseCallDto,
  CreateCallDto,
  CreateCallEventDto,
  DecideCallDto,
  EscalateCallDto,
  TranscriptTurnDto,
} from './dto/calls.dto';

interface CallSessionMetadata {
  callId: string;
  deviceId?: string;
  teamId?: string;
  keledonId?: string;
  state: string;
  language: string;
  caller?: Record<string, unknown>;
  activeVendorId?: string;
  activeFlowId?: string;
  turnCount: number;
  transcript: Array<Record<string, unknown>>;
  finalReport?: string;
  startedAt: string;
  lastTransitionAt: string;
  closedAt?: string;
  closeReason?: string;
  escalatedAt?: string;
  [key: string]: unknown;
}

interface AuthenticatedActor {
  userId?: string;
  email?: string;
  role?: string;
}

interface ActorContext {
  userId?: string;
  teamId?: string;
  companyId?: string;
  role?: string;
}

const ALLOWED_CALL_STATES = new Set([
  'call_received',
  'listening',
  'transcribing',
  'thinking',
  'answer_ready',
  'action_required',
  'reporting',
  'closed',
  'escalated',
  'failed',
]);

const ALLOWED_CALL_EVENT_TYPES = new Set([
  'call.received',
  'call.connected',
  'call.report.generated',
  'call.closed',
  'call.escalated',
  'stt.transcript.partial',
  'stt.transcript.final',
  'brain.intent.detected',
  'brain.answer.generated',
  'rpa.command.issued',
  'browser.command.issued',
  'browser.command.claimed',
  'browser.command.result',
  'rpa.step.completed',
  'rpa.step.failed',
]);

const ALLOWED_CALL_EVENT_SOURCES = new Set([
  'browser',
  'cloud',
  'stt',
  'provider',
  'system',
  'agent',
]);

const ALLOWED_CALL_TRANSITIONS = new Set([
  'call_received->call_received',
  'call_received->listening',
  'call_received->transcribing',
  'call_received->thinking',
  'call_received->action_required',
  'call_received->reporting',
  'call_received->closed',
  'call_received->escalated',
  'listening->listening',
  'listening->transcribing',
  'listening->thinking',
  'listening->action_required',
  'listening->reporting',
  'listening->closed',
  'listening->escalated',
  'transcribing->transcribing',
  'transcribing->thinking',
  'transcribing->action_required',
  'transcribing->answer_ready',
  'transcribing->reporting',
  'transcribing->closed',
  'transcribing->escalated',
  'thinking->thinking',
  'thinking->answer_ready',
  'thinking->action_required',
  'thinking->reporting',
  'thinking->closed',
  'thinking->escalated',
  'answer_ready->answer_ready',
  'answer_ready->thinking',
  'answer_ready->action_required',
  'answer_ready->reporting',
  'answer_ready->closed',
  'answer_ready->escalated',
  'action_required->action_required',
  'action_required->thinking',
  'action_required->reporting',
  'action_required->closed',
  'action_required->escalated',
  'reporting->reporting',
  'reporting->closed',
  'reporting->escalated',
  'escalated->escalated',
  'closed->closed',
  'failed->failed',
]);

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly decisionEngineService: DecisionEngineService,
    private readonly escalationService: EscalationService,
  ) {}

  async createCall(dto: CreateCallDto, actor?: AuthenticatedActor) {
    this.assertNonEmptyString(dto.deviceId, 'deviceId');
    this.assertOptionalString(dto.userId, 'userId');
    this.assertOptionalString(dto.teamId, 'teamId');
    this.assertOptionalString(dto.state, 'state');
    this.assertOptionalRecord(dto.metadata, 'metadata');
    this.assertOptionalRecord(dto.caller, 'caller');

    const actorContext = await this.resolveActorContext(actor);
    const device = await this.requireAccessibleDevice(
      dto.deviceId,
      actorContext,
    );
    const resolvedUserId = this.resolveUserId(dto.userId, actorContext);
    const resolvedTeamId = await this.resolveTeamId(
      dto.teamId,
      actorContext,
      device.userId,
    );
    const initialState = dto.state || 'call_received';
    this.assertAllowedState(initialState, 'state');

    const now = new Date().toISOString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const metadata: CallSessionMetadata = {
      ...(dto.metadata || {}),
      callId: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      deviceId: dto.deviceId,
      teamId: resolvedTeamId,
      keledonId: dto.keledonId,
      state: initialState,
      language: dto.language || 'es-MX',
      caller: dto.caller,
      activeVendorId: dto.activeVendorId,
      activeFlowId: dto.activeFlowId,
      turnCount: 0,
      transcript: [],
      startedAt: now,
      lastTransitionAt: now,
    };

    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: resolvedUserId || null,
        teamId: resolvedTeamId || null,
        status: metadata.state,
        metadata: JSON.stringify(metadata),
      },
    });

    await this.appendCallEvent(
      session.id,
      {
        type: 'call.received',
        source: 'browser',
        stateAfter: metadata.state,
        correlationId: metadata.callId,
        data: {
          deviceId: dto.deviceId,
          caller: dto.caller,
        },
      },
      actor,
    );

    return this.getCall(session.id, actor);
  }

  async getCall(sessionId: string, actor?: AuthenticatedActor) {
    this.assertNonEmptyString(sessionId, 'sessionId');
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, name: true } },
        team: {
          select: {
            id: true,
            name: true,
            brand: { select: { companyId: true } },
          },
        },
        flowRuns: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.assertSessionAccess(session, actor);
    const metadata = this.parseMetadata(session.metadata);
    const events = session.events.map((event) => ({
      ...event,
      payload: this.parseJson(event.payload),
    }));

    return {
      ...session,
      metadata,
      events,
      transcript: Array.isArray(metadata.transcript) ? metadata.transcript : [],
      currentState: metadata.state || session.status || 'unknown',
    };
  }

  async appendCallEvent(
    sessionId: string,
    dto: CreateCallEventDto,
    actor?: AuthenticatedActor,
  ) {
    this.assertNonEmptyString(sessionId, 'sessionId');
    this.assertNonEmptyString(dto.type, 'type');
    this.assertAllowedEventType(dto.type);
    this.assertAllowedEventSource(dto.source || 'cloud');
    this.assertOptionalRecord(dto.data, 'data');
    this.assertOptionalRecord(dto.metadata, 'metadata');

    const session = await this.requireSession(sessionId);
    await this.assertSessionAccess(session, actor);
    const metadata = this.parseMetadata(session.metadata);
    this.validateStateTransition(
      dto.stateAfter ||
        dto.stateBefore ||
        metadata.state ||
        session.status ||
        null,
      dto.stateBefore || metadata.state || session.status || null,
    );
    const eventPayload = {
      schemaVersion: 1,
      correlationId: dto.correlationId || metadata.callId || sessionId,
      stateBefore: dto.stateBefore || metadata.state || session.status || null,
      stateAfter:
        dto.stateAfter ||
        dto.stateBefore ||
        metadata.state ||
        session.status ||
        null,
      source: dto.source || 'cloud',
      data: dto.data || {},
      metadata: dto.metadata || {},
      timestamp: dto.timestamp || new Date().toISOString(),
    };

    const persistedEvent = await this.prisma.event.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        sessionId,
        type: dto.type,
        payload: JSON.stringify(eventPayload),
      },
    });

    if (eventPayload.stateAfter && eventPayload.stateAfter !== metadata.state) {
      await this.updateSessionState(sessionId, eventPayload.stateAfter, {
        metadata,
      });
    }

    return {
      ...persistedEvent,
      payload: eventPayload,
    };
  }

  async appendTranscript(
    sessionId: string,
    dto: TranscriptTurnDto,
    actor?: AuthenticatedActor,
  ) {
    this.assertNonEmptyString(sessionId, 'sessionId');
    this.assertNonEmptyString(dto.text, 'text');
    this.assertOptionalString(dto.language, 'language');
    this.assertOptionalString(dto.source, 'source');
    this.assertOptionalRecord(dto.metadata, 'metadata');

    const session = await this.requireSession(sessionId);
    await this.assertSessionAccess(session, actor);
    const metadata = this.parseMetadata(session.metadata);
    const nextTranscript = Array.isArray(metadata.transcript)
      ? [...metadata.transcript]
      : [];
    const transcriptTurn = {
      text: dto.text,
      language: dto.language || metadata.language || 'es-MX',
      confidence: dto.confidence ?? null,
      source: dto.source || 'stt',
      isFinal: dto.isFinal ?? true,
      timestamp: new Date().toISOString(),
      metadata: dto.metadata || {},
    };

    nextTranscript.push(transcriptTurn);
    metadata.transcript = nextTranscript;
    metadata.language = transcriptTurn.language;
    metadata.turnCount = (metadata.turnCount || 0) + 1;

    if (transcriptTurn.isFinal) {
      metadata.state = 'transcribing';
      metadata.lastTransitionAt = transcriptTurn.timestamp;
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: transcriptTurn.isFinal ? 'transcribing' : session.status,
        metadata: JSON.stringify(metadata),
      },
    });

    const eventType = transcriptTurn.isFinal
      ? 'stt.transcript.final'
      : 'stt.transcript.partial';
    const event = await this.appendCallEvent(
      sessionId,
      {
        type: eventType,
        source: transcriptTurn.source,
        stateBefore: session.status || metadata.state,
        stateAfter: transcriptTurn.isFinal ? 'transcribing' : metadata.state,
        data: transcriptTurn,
      },
      actor,
    );

    return {
      sessionId,
      turnCount: metadata.turnCount,
      transcript: transcriptTurn,
      event,
    };
  }

  async decide(
    sessionId: string,
    dto: DecideCallDto,
    actor?: AuthenticatedActor,
  ) {
    this.assertNonEmptyString(sessionId, 'sessionId');
    this.assertOptionalString(dto.text, 'text');
    this.assertOptionalString(dto.provider, 'provider');
    this.assertOptionalRecord(dto.metadata, 'metadata');

    const session = await this.requireSession(sessionId);
    await this.assertSessionAccess(session, actor);
    const metadata = this.parseMetadata(session.metadata);
    const previousState = metadata.state || session.status || 'listening';
    const transcript = Array.isArray(metadata.transcript)
      ? metadata.transcript
      : [];
    const text =
      dto.text || String(transcript[transcript.length - 1]?.text ?? '').trim();

    if (!text) {
      throw new BadRequestException(
        'No transcript text available for decisioning',
      );
    }

    await this.updateSessionState(sessionId, 'thinking', { metadata });
    await this.appendCallEvent(
      sessionId,
      {
        type: 'brain.intent.detected',
        source: 'cloud',
        stateBefore: previousState,
        stateAfter: 'thinking',
        data: {
          text,
          provider: dto.provider || 'api',
        },
      },
      actor,
    );

    const decision = await this.decisionEngineService.processTextInput(
      sessionId,
      text,
      dto.confidence ?? 0.8,
      dto.provider || 'api',
      {
        teamId: metadata.teamId || session.teamId,
        deviceId: metadata.deviceId,
        keledonId: metadata.keledonId,
        language: metadata.language,
        ...(dto.metadata || {}),
      },
    );

    let flowRun = null;
    if (decision.command.type === 'ui_steps' && decision.command.flow_id) {
      flowRun = await this.prisma.flowRun.create({
        data: {
          sessionId,
          flowId: decision.command.flow_id,
          status: 'pending',
          result: JSON.stringify({
            commandId: decision.command.command_id,
            createdBy: 'calls.decide',
          }),
        },
      });
    }

    if (flowRun) {
      decision.command.flow_run_id = flowRun.id;
    }

    const nextState =
      decision.command.type === 'ui_steps'
        ? 'action_required'
        : decision.command.type === 'stop'
          ? 'reporting'
          : 'answer_ready';

    await this.appendCallEvent(
      sessionId,
      {
        type:
          decision.command.type === 'ui_steps'
            ? 'rpa.command.issued'
            : 'brain.answer.generated',
        source: 'cloud',
        stateBefore: 'thinking',
        stateAfter: nextState,
        data: {
          command: decision.command,
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          flowRunId: flowRun?.id || null,
        },
      },
      actor,
    );

    if (decision.command.type === 'ui_steps') {
      await this.prisma.event.create({
        data: {
          id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          sessionId,
          type: 'browser.command.issued',
          payload: JSON.stringify({
            id: decision.command.command_id,
            sessionId,
            flowRunId: flowRun?.id || null,
            type: 'rpa.executeFlow',
            priority: 'normal',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            payload: {
              flowId: decision.command.flow_id,
              steps: decision.command.ui_steps || [],
              metadata: decision.command.metadata || {},
            },
            metadata: {
              deviceId: metadata.deviceId,
              source: 'calls.decide',
            },
          }),
        },
      });
    }

    return {
      sessionId,
      state: nextState,
      flowRun,
      decision,
    };
  }

  async close(
    sessionId: string,
    dto: CloseCallDto,
    actor?: AuthenticatedActor,
  ) {
    this.assertNonEmptyString(sessionId, 'sessionId');
    this.assertOptionalString(dto.reason, 'reason');
    this.assertOptionalString(dto.finalReport, 'finalReport');
    this.assertOptionalRecord(dto.metadata, 'metadata');

    const session = await this.requireSession(sessionId);
    await this.assertSessionAccess(session, actor);
    const metadata = this.parseMetadata(session.metadata);
    const now = new Date().toISOString();
    const previousState = metadata.state || session.status || 'reporting';
    metadata.finalReport = dto.finalReport || metadata.finalReport;
    metadata.closedAt = now;
    metadata.closeReason = dto.reason || 'completed';

    await this.appendCallEvent(
      sessionId,
      {
        type: 'call.report.generated',
        source: 'cloud',
        stateBefore: previousState,
        stateAfter: 'reporting',
        data: {
          finalReport: dto.finalReport || null,
          reason: dto.reason || 'completed',
        },
      },
      actor,
    );

    await this.appendCallEvent(
      sessionId,
      {
        type: 'call.closed',
        source: 'cloud',
        stateBefore: 'reporting',
        stateAfter: 'closed',
        data: {
          reason: dto.reason || 'completed',
        },
      },
      actor,
    );

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        metadata: JSON.stringify({
          ...this.parseMetadata(
            (await this.requireSession(sessionId)).metadata,
          ),
          ...(dto.metadata || {}),
          finalReport: metadata.finalReport,
          closedAt: now,
          closeReason: metadata.closeReason,
          state: 'closed',
          lastTransitionAt: now,
        }),
      },
    });

    return this.getCall(sessionId, actor);
  }

  async escalate(
    sessionId: string,
    dto: EscalateCallDto,
    actor?: AuthenticatedActor,
  ) {
    this.assertNonEmptyString(sessionId, 'sessionId');
    this.assertNonEmptyString(dto.trigger, 'trigger');
    this.assertOptionalString(dto.triggerType, 'triggerType');
    this.assertOptionalString(dto.transcript, 'transcript');
    this.assertOptionalString(dto.instruction, 'instruction');
    this.assertOptionalRecord(dto.metadata, 'metadata');

    const session = await this.requireSession(sessionId);
    await this.assertSessionAccess(session, actor);
    const metadata = this.parseMetadata(session.metadata);
    const previousState = metadata.state || session.status || 'thinking';
    const now = new Date().toISOString();
    const escalation = await this.escalationService.create({
      sessionId,
      teamId: metadata.teamId || session.teamId || undefined,
      deviceId: metadata.deviceId ? String(metadata.deviceId) : undefined,
      trigger: dto.trigger,
      triggerType: dto.triggerType || 'manual',
      transcript: dto.transcript,
      metadata: {
        instruction: dto.instruction,
        ...(dto.metadata || {}),
      },
    });

    await this.appendCallEvent(
      sessionId,
      {
        type: 'call.escalated',
        source: 'cloud',
        stateBefore: previousState,
        stateAfter: 'escalated',
        data: {
          escalationId: escalation.id,
          trigger: dto.trigger,
          instruction: dto.instruction || 'transfer_to_human',
        },
      },
      actor,
    );

    await this.prisma.event.create({
      data: {
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        sessionId,
        type: 'browser.command.issued',
        payload: JSON.stringify({
          id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          sessionId,
          flowRunId: null,
          type: 'call.transfer',
          priority: 'urgent',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          payload: {
            instruction: dto.instruction || 'transfer_to_human',
            escalationId: escalation.id,
          },
          metadata: {
            deviceId: metadata.deviceId,
            source: 'calls.escalate',
          },
        }),
      },
    });

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'escalated',
        metadata: JSON.stringify({
          ...this.parseMetadata(
            (await this.requireSession(sessionId)).metadata,
          ),
          escalatedAt: now,
          state: 'escalated',
          lastTransitionAt: now,
        }),
      },
    });

    return {
      escalation,
      call: await this.getCall(sessionId, actor),
    };
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
