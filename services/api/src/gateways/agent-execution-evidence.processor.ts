import { Logger } from '@nestjs/common';
import { context, SpanStatusCode, type Context, type Tracer } from '@opentelemetry/api';
import { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../services/session.service';
import { ownsRuntimeSession } from './runtime-identity';
import { ExecutionEvidence } from '../contracts/events';
import { KELEDON_TRACE_SPANS } from '../telemetry/trace-model';
import { AGENT_EXEC_ATTRS } from '../telemetry/decision-evidence';

export class AgentExecutionEvidenceProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly logger: Logger,
    private readonly tracer: Tracer,
    private readonly extractContext: (metadata: Record<string, any> | undefined) => Context,
  ) {}

  async processExecutionEvidence(
    client: Socket,
    evidence: ExecutionEvidence,
  ): Promise<void> {
    if (!await ownsRuntimeSession(this.prisma, client.data.runtimeIdentity, evidence?.session_id)) { client.emit('error', { message: 'Invalid session scope' }); return; }
    const requiredFields = [
      'event',
      'session_id',
      'decision_id',
      'trace_id',
      'command_type',
      'tab_id',
      'execution_result',
    ] as const;

    for (const field of requiredFields) {
      if (!evidence?.[field]) {
        throw new Error(`execution.evidence missing required field: ${field}`);
      }
    }

    if (String(evidence.decision_id).trim().toLowerCase() === 'unknown') {
      throw new Error(
        'execution.evidence malformed: decision_id must be real and non-placeholder',
      );
    }

    if (String(evidence.trace_id).trim().toLowerCase() === 'unknown') {
      throw new Error(
        'execution.evidence malformed: trace_id must be real and non-placeholder',
      );
    }

    const executionStatus =
      evidence.execution_status || evidence.execution_result;
    if (!executionStatus) {
      throw new Error(
        'execution.evidence missing required field: execution_status',
      );
    }

    const extractedContext = this.extractContext(
      evidence?.metadata,
    );

    await context.with(extractedContext, async () => {
      await this.tracer.startActiveSpan(
        KELEDON_TRACE_SPANS.AGENT_EXEC,
        async (span) => {
          try {
            span.setAttribute(
              'session_id',
              String(evidence?.session_id || 'unknown'),
            );
            span.setAttribute(
              AGENT_EXEC_ATTRS.EVENT,
              String(evidence?.event || 'unknown'),
            );
            span.setAttribute(
              AGENT_EXEC_ATTRS.DECISION_ID,
              String(evidence?.decision_id || 'unknown'),
            );
            span.setAttribute(
              AGENT_EXEC_ATTRS.TRACE_ID,
              String(evidence?.trace_id || 'unknown'),
            );
            span.setAttribute(
              'command_id',
              String(evidence?.command_id || 'unknown'),
            );
            span.setAttribute(
              AGENT_EXEC_ATTRS.COMMAND_TYPE,
              String(evidence?.command_type || 'unknown'),
            );
            span.setAttribute(
              AGENT_EXEC_ATTRS.TAB_ID,
              String(evidence?.tab_id || 'unknown'),
            );
            span.setAttribute(
              AGENT_EXEC_ATTRS.EXECUTION_RESULT,
              String(evidence?.execution_result || 'unknown'),
            );
            span.setAttribute(
              AGENT_EXEC_ATTRS.EXECUTION_STATUS,
              String(executionStatus),
            );
            span.setAttribute(
              'outcome',
              String(evidence?.outcome || 'unknown'),
            );
            span.setAttribute('latency_ms', Number(evidence?.latency_ms || 0));

            if (executionStatus !== 'success') {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `Extension execution reported ${executionStatus}`,
              });
            }

            this.logger.log(
              `[C10] execution.evidence ${evidence.event} decision_id=${evidence.decision_id} trace_id=${evidence.trace_id} command_type=${evidence.command_type} tab_id=${evidence.tab_id} result=${evidence.execution_result}`,
            );

            await this.sessionService.persistEvent(evidence.session_id, {
              session_id: evidence.session_id,
              event_type: 'ui_result',
              agent_id: client.id,
              ts: evidence.completed_at,
              payload: {
                kind: 'execution_evidence',
                decision_id: evidence.decision_id,
                trace_id: evidence.trace_id,
                command_id: evidence.command_id,
                event: evidence.event,
                command_type: evidence.command_type,
                tab_id: evidence.tab_id,
                execution_result: evidence.execution_result,
                execution_status: executionStatus,
                execution_timestamp: evidence.execution_timestamp,
                outcome: evidence.outcome,
                started_at: evidence.started_at,
                completed_at: evidence.completed_at,
                latency_ms: evidence.latency_ms,
                evidence: evidence.evidence,
              },
            });
          } catch (error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error instanceof Error ? error.message : String(error),
            });
            throw error;
          } finally {
            span.end();
          }
        },
      );
    });
  }

}
