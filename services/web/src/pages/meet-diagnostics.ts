export type Layer = 'SESSION' | 'MEET' | 'STT' | 'KNOWLEDGE' | 'BRAIN' | 'TTS' | 'CRM' | 'INTERFACE' | 'LIFECYCLE';
export type Diagnostic = { at: string; layer: Layer; event: string; elapsedMs?: number; status?: number; bytes?: number; count?: number; generation?: number; code?: string };
// Deliberate projection: callers cannot export prompts, tokens, URLs, transcripts or raw exceptions.
export function diagnostic(layer: Layer, event: string, data: Partial<Diagnostic> = {}): Diagnostic {
  const row: Diagnostic = { at: new Date().toISOString(), layer, event: /^[A-Z_]{1,48}$/.test(event) ? event : 'EVENT' };
  for (const key of ['elapsedMs', 'status', 'bytes', 'count', 'generation'] as const) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) row[key] = Math.round(value);
  }
  if (data.code && /^(?:MEET_(?:PREPARE|STT|BRAIN)_(?:TIMEOUT|UNAVAILABLE|HTTP_\d{3})|FOUND|NOT_FOUND|NEEDS_ASSISTANCE|OBSERVED|OBSERVED_AFTER_ACTION|SURFACE_OPENED|STALE_OBSERVATION|SURFACE_SCOPE_EXPIRED|SURFACE_SCOPE_DENIED|ACTION_POLICY_DENIED|UNSUPPORTED_ACTION|UNSUPPORTED_OPERATION|EXECUTOR_UNAVAILABLE|NATIVE_EXECUTOR_UNAVAILABLE|NO_AUTHORIZED_WINDOW|LOCAL_CONSENT_REQUIRED|OPEN_SURFACE_REQUIRED|CONTROL_REVOKED|WINDOWS_EXECUTOR_REQUIRED|WEB_EXECUTOR_UNAVAILABLE)$/.test(data.code)) row.code = data.code;
  return row;
}
