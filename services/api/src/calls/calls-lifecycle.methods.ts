import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedActor } from './calls.types';
import type { CallsServiceContext } from './calls.context';
import { CloseCallDto, DecideCallDto, EscalateCallDto } from './dto/calls.dto';
export async function decide(
  this: CallsServiceContext,
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
  const lastTranscriptText = transcript[transcript.length - 1]?.text;
  const text =
    dto.text ||
    (typeof lastTranscriptText === 'string' ? lastTranscriptText.trim() : '');

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

export async function close(
  this: CallsServiceContext,
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
        ...this.parseMetadata((await this.requireSession(sessionId)).metadata),
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

export async function escalate(
  this: CallsServiceContext,
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
        ...this.parseMetadata((await this.requireSession(sessionId)).metadata),
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
