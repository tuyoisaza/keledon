import type { DefaultEventsMap, Socket } from 'socket.io';
import type { RuntimeIdentity } from './runtime-identity';

export interface AgentRuntimeSocketData {
  runtimeIdentity?: RuntimeIdentity;
}

export type AgentSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  AgentRuntimeSocketData
>;

interface AgentEventBase {
  event_id: string;
  session_id: string;
  timestamp: string;
  command_id?: string;
  agent_id?: string;
}

export type AgentSocketData =
  | (AgentEventBase & {
      type: 'text_input';
      payload: {
        text: string;
        confidence?: number;
        provider?: string;
        metadata?: Record<string, unknown>;
        [key: string]: unknown;
      };
    })
  | (AgentEventBase & {
      type: 'ui_result';
      payload: {
        results?: unknown[];
        error?: unknown;
        [key: string]: unknown;
      };
    })
  | (AgentEventBase & {
      type: 'system';
      payload: {
        event: string;
        data?: unknown;
        [key: string]: unknown;
      };
    });

export interface CommandSocketData {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'say' | 'ui_steps' | 'mode' | 'stop';
  payload: Record<string, unknown>;
}
