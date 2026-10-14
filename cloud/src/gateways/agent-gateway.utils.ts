import { v4 as uuidv4 } from 'uuid';
import { propagation, ROOT_CONTEXT, Context } from '@opentelemetry/api';
import { AgentSocketData, CommandSocketData } from './agent-gateway.types';
import { CloudCommand } from '../contracts/events';

export function isValidAgentEvent(event: AgentSocketData): boolean {
  return !!(
    event.event_id &&
    event.session_id &&
    event.timestamp &&
    ['text_input', 'ui_result', 'system'].includes(event.type) &&
    event.payload
  );
}

export function isValidAgentCommand(command: CommandSocketData): boolean {
  return !!(
    command.command_id &&
    command.session_id &&
    command.timestamp &&
    ['say', 'ui_steps', 'mode', 'stop'].includes(command.type) &&
    command.payload
  );
}

export function generateAgentUUID(): string {
  return uuidv4();
}

export function extractContextFromMetadata(
  metadata: Record<string, unknown> | undefined,
): Context {
  const traceparent = metadata?.traceparent;
  const tracestate = metadata?.tracestate;
  if (typeof traceparent !== 'string' || !traceparent) return ROOT_CONTEXT;

  const carrier: Record<string, string> = { traceparent };
  if (typeof tracestate === 'string' && tracestate) {
    carrier.tracestate = tracestate;
  }
  return propagation.extract(ROOT_CONTEXT, carrier);
}

export function injectTraceMetadata(
  command: CloudCommand,
  traceId: string,
  decisionId?: string,
  traceparent?: string,
  tracestate?: string,
): void {
  const metadata = {
    ...(command.metadata ?? {}),
    trace_id: traceId,
    ...(decisionId ? { decision_id: decisionId } : {}),
    ...(traceparent ? { traceparent } : {}),
    ...(tracestate ? { tracestate } : {}),
  };
  command.metadata = metadata;
  if (command.say) {
    command.say.metadata = { ...(command.say.metadata ?? {}), ...metadata };
  }
}
