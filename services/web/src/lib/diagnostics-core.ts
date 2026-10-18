/** Public-safe diagnostics: never retain arbitrary console arguments or request bodies. */
export type SafeEvent = {
  timestamp: string;
  kind: 'console' | 'error' | 'rejection' | 'network' | 'action' | 'route' | 'lifecycle' | 'auth';
  level: 'log' | 'info' | 'warn' | 'error';
  status?: number;
  endpoint?: string;
  correlationId?: string;
  method?: string;
  durationMs?: number;
  stage?: string;
  outcome?: string;
  diagnosticId?: string;
  expectedStatus?: number;
};

const PRIVATE_KEY = /password|passwd|secret|token|authorization|cookie|credential|api.?key|\bkey\b|email|phone|address|username|user.?id|company|team|vendor|name|url/i;
export function redactDiagnostic(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 6) return '[depth limit]';
  if (typeof value === 'string') return value
    .replace(/(?:https?|wss?|keledon):\/\/[^\s"'<>]+/gi, '[url]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[redacted]')
    .replace(/\b(?:sk|pk)[-_][A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/((?:password|secret|token|api[_-]?key|key|authorization)\s*[:=]\s*)[^,;\s]+/gi, '$1[redacted]')
    .slice(0, 2000);
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value !== 'object') return '[unsupported]';
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 100).map(item => redactDiagnostic(item, depth + 1, seen));
  return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) =>
    [key, PRIVATE_KEY.test(key) ? '[redacted]' : redactDiagnostic(item, depth + 1, seen)]));
}

const SAFE_PATH_SEGMENTS = new Set([
  'api', 'auth', 'login', 'logout', 'me', 'google', 'callback', 'register', 'verify',
  'users', 'companies', 'brands', 'teams', 'vendors', 'keledons', 'flows', 'providers',
  'sessions', 'history', 'live', 'brain', 'chat', 'voice', 'speech', 'tts', 'stt',
  'transcribe', 'speak', 'ai', 'prompts', 'consumption', 'usage', 'knowledge', 'documents',
  'categories', 'devices', 'profile', 'management', 'admin', 'dashboard', 'launch-keledon',
  'work-stats', 'knowledge-stats', 'vector-store', 'status', 'debug', 'health', 'deep',
  'create', 'update', 'delete', 'list', 'search', 'current', 'config', 'settings', 'metrics',
]);

/** Keep static route names useful while replacing tenant-owned slugs and record identifiers. */
export function sanitizeDiagnosticPath(value: string, base = 'http://diagnostics.invalid'): string {
  try {
    const url = new URL(value, base);
    const parts = url.pathname.split('/').filter(Boolean).map(part => {
      const normalized = part.toLowerCase();
      return SAFE_PATH_SEGMENTS.has(normalized) ? normalized : '[redacted]';
    });
    return '/' + parts.join('/');
  } catch {
    return '[unavailable]';
  }
}

export function sanitizeCorrelationId(value: string | null | undefined): string | undefined {
  if (!value || value.length > 128 || /^(?:Bearer\s|eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$)/i.test(value) || !/^[A-Za-z0-9._:-]+$/.test(value)) return undefined;
  return value;
}

export function createEventBuffer(limit = 100) {
  const events: SafeEvent[] = [];
  const listeners = new Set<(events: SafeEvent[]) => void>();
  const notify = () => listeners.forEach(listener => listener(events.map(event => ({ ...event }))));
  return {
    add(event: Omit<SafeEvent, 'timestamp'>) {
      // Explicit allowlist: arbitrary input text, URLs and identifiers never enter the buffer.
      const safe: SafeEvent = { timestamp: new Date().toISOString(), kind: event.kind, level: event.level };
      if (Number.isFinite(event.status)) safe.status = event.status;
      if (Number.isFinite(event.durationMs)) safe.durationMs = Math.max(0, Math.round(event.durationMs!));
      if (event.method && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(event.method)) safe.method = event.method;
      if (event.endpoint) safe.endpoint = sanitizeDiagnosticPath(event.endpoint);
      const correlationId = sanitizeCorrelationId(event.correlationId);
      if (correlationId) safe.correlationId = correlationId;
      if (event.stage && /^[a-z-]{1,40}$/.test(event.stage)) safe.stage = event.stage;
      if (event.outcome && /^[a-z-]{1,40}$/.test(event.outcome)) safe.outcome = event.outcome;
      if (event.diagnosticId && /^[A-Za-z0-9._:-]{1,100}$/.test(event.diagnosticId)) safe.diagnosticId = event.diagnosticId;
      if (Number.isFinite(event.expectedStatus)) safe.expectedStatus = event.expectedStatus;
      events.push(safe);
      if (events.length > limit) events.splice(0, events.length - limit);
      notify();
    },
    read: () => events.map(event => ({ ...event })),
    clear: () => { events.length = 0; notify(); },
    subscribe(listener: (events: SafeEvent[]) => void) {
      listeners.add(listener);
      listener(events.map(event => ({ ...event })));
      return () => { listeners.delete(listener); };
    },
  };
}

interface StorageLike {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  removeItem(key: string): void;
}
export const isOwnedKey = (key: string) =>
  /^(keledon[-_:])/i.test(key) || ['auth_token', 'user_email', 'user_name'].includes(key);

function clearOwnedStorage(storage: StorageLike) {
  const names = Array.from({ length: storage.length }, (_, i) => storage.key(i))
    .filter((key): key is string => !!key && isOwnedKey(key))
    // Preserve the active auth token if an earlier owned-key removal fails.
    .sort((a, b) => Number(a === 'auth_token') - Number(b === 'auth_token'));
  for (const key of names) {
    storage.removeItem(key);
    if (storage.getItem(key) !== null) throw new Error('Application storage was not cleared');
  }
  return names.length;
}

export async function clearApplicationState(adapters: {
  localStorage: StorageLike;
  sessionStorage: StorageLike;
  caches?: Pick<CacheStorage, 'keys' | 'delete'>;
  clearCookies?: () => void;
  clearEvents?: () => void;
}) {
  // Complete fallible cache/cookie/diagnostic work before removing app storage or authentication.
  const hadSession = !!adapters.sessionStorage.getItem('auth_token');
  let cachesCleared = 0;
  if (adapters.caches) {
    const owned = (await adapters.caches.keys()).filter(name => /^keledon[-_:]/i.test(name));
    for (const name of owned) await adapters.caches.delete(name);
    const remaining = await adapters.caches.keys();
    if (owned.some(name => remaining.includes(name))) throw new Error('Application cache was not cleared');
    cachesCleared = owned.length;
  }
  adapters.clearCookies?.();
  adapters.clearEvents?.();
  const cleared = clearOwnedStorage(adapters.localStorage) + clearOwnedStorage(adapters.sessionStorage);
  return { cleared, cachesCleared, hadSession };
}

export function clearApplicationCookies(doc: Pick<Document, 'cookie'>, pathname: string) {
  const paths = new Set(['/']);
  const segments = pathname.split('/').filter(Boolean);
  for (let i = 1; i <= segments.length; i++) paths.add('/' + segments.slice(0, i).join('/'));
  const owned = doc.cookie.split(';').map(cookie => cookie.split('=')[0].trim()).filter(isOwnedKey);
  for (const name of owned) for (const path of paths)
    doc.cookie = name + '=; Max-Age=0; Path=' + path + '; SameSite=Lax';
  if (doc.cookie.split(';').some(cookie => owned.includes(cookie.split('=')[0].trim())))
    throw new Error('Some application cookies are inaccessible; reset incomplete');
}
