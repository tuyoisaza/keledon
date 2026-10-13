import { v4 as uuidv4 } from 'uuid';
import { propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import type { AgentSocketData, CommandSocketData } from './agent-socket.types';

export function isValidAgentEvent(event: AgentSocketData): boolean {
  return Boolean(
    event.event_id &&
    event.session_id &&
    event.timestamp &&
    ['text_input', 'ui_result', 'system'].includes(event.type) &&
    event.payload,
  );
}

export function isValidAgentCommand(command: CommandSocketData): boolean {
  return Boolean(
    command.command_id &&
    command.session_id &&
    command.timestamp &&
    ['say', 'ui_steps', 'mode', 'stop'].includes(command.type) &&
    command.payload,
  );
}

export function newAgentMessageId(): string {
  return uuidv4();
}

export function extractAgentTraceContext(
  metadata: Record<string, any> | undefined,
) {
  const traceparent = metadata?.traceparent;
  const tracestate = metadata?.tracestate;
  if (!traceparent) return ROOT_CONTEXT;
  const carrier: Record<string, string> = { traceparent };
  if (tracestate) carrier.tracestate = tracestate;
  return propagation.extract(ROOT_CONTEXT, carrier);
}

export function injectAgentTraceMetadata(
  command: Record<string, any>,
  traceId: string,
  decisionId?: string,
  traceparent?: string,
  tracestate?: string,
): void {
  const metadata = {
    ...(command.metadata || {}),
    trace_id: traceId,
    ...(decisionId ? { decision_id: decisionId } : {}),
    ...(traceparent ? { traceparent } : {}),
    ...(tracestate ? { tracestate } : {}),
  };
  command.metadata = metadata;
  if (command.say && typeof command.say === 'object')
    command.say.metadata = { ...metadata };
}
