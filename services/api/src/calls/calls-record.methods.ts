import { NotFoundException } from '@nestjs/common';
import {
  type AuthenticatedActor,
  type CallSessionMetadata,
} from './calls.types';
import type { CallsServiceContext } from './calls.context';
import {
  CreateCallDto,
  CreateCallEventDto,
  TranscriptTurnDto,
} from './dto/calls.dto';
export async function createCall(
  this: CallsServiceContext,
  dto: CreateCallDto,
  actor?: AuthenticatedActor,
) {
  this.assertNonEmptyString(dto.deviceId, 'deviceId');
  this.assertOptionalString(dto.userId, 'userId');
  this.assertOptionalString(dto.teamId, 'teamId');
  this.assertOptionalString(dto.state, 'state');
  this.assertOptionalRecord(dto.metadata, 'metadata');
  this.assertOptionalRecord(dto.caller, 'caller');

  const actorContext = await this.resolveActorContext(actor);
  const device = await this.requireAccessibleDevice(dto.deviceId, actorContext);
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

export async function getCall(
  this: CallsServiceContext,
  sessionId: string,
  actor?: AuthenticatedActor,
) {
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

export async function appendCallEvent(
  this: CallsServiceContext,
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

export async function appendTranscript(
  this: CallsServiceContext,
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
