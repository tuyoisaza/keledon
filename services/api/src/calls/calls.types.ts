export interface CallSessionMetadata {
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

export interface AuthenticatedActor {
  userId?: string;
  email?: string;
  role?: string;
}

export interface ActorContext {
  userId?: string;
  teamId?: string;
  companyId?: string;
  role?: string;
}

export const ALLOWED_CALL_STATES = new Set([
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

export const ALLOWED_CALL_EVENT_TYPES = new Set([
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

export const ALLOWED_CALL_EVENT_SOURCES = new Set([
  'browser',
  'cloud',
  'stt',
  'provider',
  'system',
  'agent',
]);

export const ALLOWED_CALL_TRANSITIONS = new Set([
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
