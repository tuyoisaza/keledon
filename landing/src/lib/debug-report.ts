import { debugLogger } from './debug-logger';
import {
  createEventBuffer,
  clearApplicationState,
  clearApplicationCookies,
  sanitizeDiagnosticPath,
  sanitizeCorrelationId,
  redactDiagnostic,
  type SafeEvent,
} from './diagnostics-core';

type SafeAuthContext = {
  isAuthenticated?: boolean;
  user?: { id?: string; role?: string } | null;
  pathname?: string;
};

type SafeEndpointSummary = {
  id: string;
  method: string;
  path: string;
  expectedStatuses: number[];
  requestExample: string;
  successExample: string;
  errorExamples: string;
};
type SafeBackendSummary = {
  status: string;
  databaseStatus: string;
  migrationStatus: string;
  providers: Record<string, string>;
};

const buffer = createEventBuffer();
let stop: (() => void) | undefined;
let previousRoute: string | undefined;
let endpointSummaries: SafeEndpointSummary[] = [];
let backendSummary: SafeBackendSummary | undefined;

function safeExample(value: unknown): string {
  try { return JSON.stringify(redactDiagnostic(value)).slice(0, 1200); }
  catch { return 'Unavailable'; }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if ('url' in input && typeof input.url === 'string') return input.url;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.href;
  return 'unavailable';
}

function responseCorrelationId(response: Response): string | undefined {
  try {
    return sanitizeCorrelationId(
      response.headers.get('x-correlation-id') ||
      response.headers.get('x-request-id') ||
      response.headers.get('request-id'),
    );
  } catch {
    return undefined;
  }
}

export const debugCapture = {
  getLogs: () => buffer.read(),
  setDebugMode(enabled: boolean) { debugLogger.enable(enabled); },
  clearLogs() { buffer.clear(); endpointSummaries = []; backendSummary = undefined; },
  subscribe: (listener: (events: ReturnType<typeof buffer.read>) => void) => buffer.subscribe(listener),
  recordEvent(event: Omit<SafeEvent, 'timestamp'>) { buffer.add(event); },
  setEndpointDiagnostics(value: unknown) {
    if (!Array.isArray(value)) { endpointSummaries = []; return; }
    endpointSummaries = value.slice(0, 500).flatMap((item): SafeEndpointSummary[] => {
      if (!item || typeof item !== 'object') return [];
      const endpoint = item as Record<string, unknown>;
      if (typeof endpoint.id !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(endpoint.id) ||
          typeof endpoint.method !== 'string' || !/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|ALL)$/.test(endpoint.method) ||
          typeof endpoint.path !== 'string') return [];
      const statuses = Array.isArray(endpoint.expectedStatuses)
        ? endpoint.expectedStatuses.filter((status): status is number => Number.isInteger(status) && status >= 100 && status <= 599).slice(0, 8)
        : [];
      return [{
        id: endpoint.id, method: endpoint.method,
        path: sanitizeDiagnosticPath(endpoint.path), expectedStatuses: statuses,
        requestExample: safeExample(endpoint.sanitizedRequestExample),
        successExample: safeExample(endpoint.sanitizedSuccessExample),
        errorExamples: safeExample(endpoint.sanitizedErrorExamples),
      }];
    });
  },
  setBackendSummary(value: unknown) {
    if (!value || typeof value !== 'object') { backendSummary = undefined; return; }
    const data = value as Record<string, unknown>;
    const database = data.database && typeof data.database === 'object' ? data.database as Record<string, unknown> : {};
    const metered = data.meteredProviders && typeof data.meteredProviders === 'object' ? data.meteredProviders as Record<string, unknown> : {};
    const safeStatus = (status: unknown) => typeof status === 'string' && /^(healthy|degraded|unhealthy|present|unavailable)$/.test(status) ? status : 'unavailable';
    backendSummary = {
      status: safeStatus(data.status),
      databaseStatus: safeStatus(database.status),
      migrationStatus: safeStatus(database.migrations),
      providers: Object.fromEntries(['deepgram', 'openai', 'anthropic'].map(provider => [provider, metered[provider] === 'configured' ? 'configured' : 'not_configured'])),
    };
  },
  clearEndpointDiagnostics() { endpointSummaries = []; backendSummary = undefined; },
  startCapture() {
    if (stop || typeof window === 'undefined') return;
    const cleanups: Array<() => void> = [];
    const onError = () => buffer.add({ kind: 'error', level: 'error' });
    const onRejection = () => buffer.add({ kind: 'rejection', level: 'error' });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    cleanups.push(
      () => window.removeEventListener('error', onError),
      () => window.removeEventListener('unhandledrejection', onRejection),
    );

    if (import.meta.env.DEV) {
      for (const level of ['log', 'info', 'warn', 'error'] as const) {
        const original = console[level];
        const wrapped = (..._args: unknown[]) => {
          // Console arguments can contain names, messages, URLs and credentials. Keep only metadata.
          buffer.add({ kind: 'console', level });
          original.apply(console, _args);
        };
        console[level] = wrapped;
        cleanups.push(() => { if (console[level] === wrapped) console[level] = original; });
      }
    }

    const lifecycleEvents = [
      ['online', 'online'],
      ['offline', 'offline'],
      ['pagehide', 'pagehide'],
      ['pageshow', 'pageshow'],
    ] as const;
    for (const [eventName, outcome] of lifecycleEvents) {
      const listener = () => buffer.add({ kind: 'lifecycle', level: 'info', stage: 'document', outcome });
      window.addEventListener(eventName, listener);
      cleanups.push(() => window.removeEventListener(eventName, listener));
    }

    const originalFetch = window.fetch;
    if (originalFetch) {
      const wrapped: typeof fetch = async (input, init) => {
        const started = performance.now();
        const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
        const endpoint = sanitizeDiagnosticPath(requestUrl(input), window.location.origin);
        try {
          const response = await originalFetch.call(window, input, init);
          buffer.add({
            kind: 'network',
            level: response.ok ? 'info' : 'warn',
            status: response.status,
            method,
            endpoint,
            correlationId: responseCorrelationId(response),
            durationMs: performance.now() - started,
          });
          return response;
        } catch (error) {
          buffer.add({ kind: 'network', level: 'error', method, endpoint, durationMs: performance.now() - started });
          throw error;
        }
      };
      window.fetch = wrapped;
      cleanups.push(() => { if (window.fetch === wrapped) window.fetch = originalFetch; });
    }

    stop = () => { cleanups.reverse().forEach(cleanup => cleanup()); stop = undefined; };
  },
  stopCapture() { stop?.(); },
};

export function recordRoute(pathname: string) {
  const route = sanitizeDiagnosticPath(pathname, window.location.origin);
  if (route === previousRoute) return;
  buffer.add({ kind: 'route', level: 'info', endpoint: route });
  previousRoute = route;
}

export function recordAuthEvent(stage: 'session-check' | 'email-login' | 'google-redirect' | 'oauth-callback', outcome: 'started' | 'success' | 'failure' | 'no-session' | 'reached') {
  buffer.add({ kind: 'auth', level: outcome === 'failure' ? 'warn' : 'info', stage, outcome });
}

function browserDescription(userAgent: string): string {
  const patterns: Array<[RegExp, string]> = [
    [/Edg\/([\d.]+)/, 'Edge'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
  ];
  for (const [pattern, name] of patterns) {
    const match = userAgent.match(pattern);
    if (match) return `${name} ${match[1]}`;
  }
  return 'Unavailable';
}

function apiHostname(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (!configured || configured === '/') return window.location.hostname || 'same-origin';
  try { return new URL(configured).hostname || 'unavailable'; } catch { return 'unavailable'; }
}

function buildEnvironment(): string {
  if (import.meta.env.PROD) return 'production';
  const mode = import.meta.env.MODE;
  return mode && /^[a-z0-9-]{1,24}$/i.test(mode) ? mode : 'development';
}

export function getDebugInfo(context: SafeAuthContext = {}): string {
  const events = buffer.read();
  const diagnosticsAuthorized = debugLogger.isEnabled() && context.isAuthenticated === true && ['admin', 'developer', 'superadmin'].includes(context.user?.role || '');
  const visibleEvents = diagnosticsAuthorized ? events : events.filter(event => event.stage !== 'probe' && event.endpoint !== '/health/deep');
  const recentEvents = visibleEvents.slice(-20);
  const routeHistory = visibleEvents.filter(event => event.kind === 'route').slice(-20);
  const currentRoute = sanitizeDiagnosticPath(context.pathname || window.location.pathname, window.location.origin);
  const priorRoute = routeHistory.length > 1 ? routeHistory[routeHistory.length - 2].endpoint : 'Unavailable';
  const failedRequests = visibleEvents.filter(event => event.kind === 'network' && (event.level === 'error' || (event.status !== undefined && event.status >= 400))).slice(-20);
  const authEvents = visibleEvents.filter(event => event.kind === 'auth').slice(-20);
  const lastAuthFailure = [...authEvents].reverse().find(event => event.outcome === 'failure');
  const currentCorrelationId = [...visibleEvents].reverse().find(event => event.correlationId)?.correlationId || 'Unavailable';
  const meteredCandidates = visibleEvents.filter(event => event.kind === 'network' && /\/(brain|ai|chat|voice|speech|tts|stt)(\/|$)/i.test(event.endpoint || ''));
  const deepHealthEvent = [...visibleEvents].reverse().find(event => event.kind === 'network' && event.endpoint === '/health/deep');
  const lastProbeEvent = [...visibleEvents].reverse().find(event => event.stage === 'probe');
  const visibleDeepHealthEvent = diagnosticsAuthorized ? deepHealthEvent : undefined;
  const visibleProbeEvent = diagnosticsAuthorized ? lastProbeEvent : undefined;
  const lastProbeSummary = visibleProbeEvent?.diagnosticId
    ? endpointSummaries.find(endpoint => endpoint.id === visibleProbeEvent.diagnosticId)
    : undefined;
  const authenticated = context.isAuthenticated === true;
  const safeRole = authenticated && context.user?.role && /^(guest|user|agent|admin|coordinator|superadmin)$/.test(context.user.role)
    ? context.user.role : 'Unavailable';
  const safeUserId = authenticated && context.user?.id
    ? String(context.user.id).slice(0, 128).replace(/[^A-Za-z0-9._:-]/g, '') || 'Unavailable'
    : 'Not authenticated';
  const timezone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unavailable'; } catch { return 'Unavailable'; } })();
  const locale = /^(en|es|pt)(-|$)/i.test(navigator.language) ? navigator.language : 'other';
  const formatEvent = (event: (typeof recentEvents)[number]) => {
    const endpoint = event.endpoint ? ` endpoint=${event.endpoint}` : '';
    const status = event.status === undefined ? '' : ` status=${event.status}`;
    const correlationId = event.correlationId ? ` correlation=${event.correlationId}` : '';
    const stage = event.stage ? ` stage=${event.stage}` : '';
    const outcome = event.outcome ? ` outcome=${event.outcome}` : '';
    const diagnosticId = event.diagnosticId ? ` diagnosticId=${event.diagnosticId}` : '';
    const method = event.method ? ` method=${event.method}` : '';
    const duration = event.durationMs === undefined ? '' : ` durationMs=${event.durationMs}`;
    return `${event.timestamp} ${event.kind}/${event.level}${method}${endpoint}${status}${duration}${stage}${outcome}${diagnosticId}${correlationId}`;
  };
  const failedRequestLines = failedRequests.length
    ? failedRequests.map(event => `- ${event.endpoint || 'Unavailable'} status=${event.status ?? 'Unavailable'} correlation=${event.correlationId || 'Unavailable'}`).join('\n')
    : 'None captured';
  const authSummary = authEvents.map(event => `${event.stage}:${event.outcome}`).join(', ') || 'None captured';
  const screenSize = typeof screen === 'undefined' ? 'Unavailable' : `${screen.width} x ${screen.height}`;
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const recentLogLines = recentEvents.length ? recentEvents.map(formatEvent).join('\n') : 'None captured';
  const recentErrors = recentEvents.filter(event => event.kind === 'error' || event.kind === 'rejection' || (event.kind === 'network' && event.level === 'error'));
  const recentErrorLines = recentErrors.length ? recentErrors.map(formatEvent).join('\n') : 'None captured';
  const failedCorrelationLines = failedRequests.filter(event => event.correlationId).map(event => `- ${event.correlationId}`).join('\n') || 'Unavailable';
  const callbackOutcome = [...authEvents].reverse().find(event => event.stage === 'oauth-callback')?.outcome || 'Not reached';
  const googleRedirect = authEvents.some(event => event.stage === 'google-redirect' && event.outcome === 'started') ? 'Yes' : 'No';
  const oauthHost = import.meta.env.VITE_API_URL ? apiHostname() : window.location.hostname;

  return [
    '=== PHDK Debug Diagnostics Report ===',
    '',
    'Project: KELEDON',
    `Environment: ${buildEnvironment()}`,
    `Version: ${/^\d+\.\d+\.\d+$/.test(__APP_VERSION__) ? 'v' + __APP_VERSION__ : 'Unavailable'}`,
    `Git SHA: ${/^[a-f0-9]{7,40}$/i.test(__GIT_SHA__) ? __GIT_SHA__.slice(0, 12) : 'Unavailable'}`,
    `Build: ${/^\d{4}-\d\d-\d\dT[^\s]{1,40}Z$/.test(__BUILD_TIMESTAMP__) ? __BUILD_TIMESTAMP__ : 'Unavailable'}`,
    `Client: ${new Date().toISOString()}`,
    '',
    `Route: ${currentRoute}`,
    `Previous route: ${priorRoute}`,
    `Locale: ${locale}`,
    `Timezone: ${timezone}`,
    `Browser: ${browserDescription(userAgent)}`,
    `Viewport: ${window.innerWidth} x ${window.innerHeight}`,
    `Screen: ${screenSize}`,
    '',
    `Auth: ${authenticated ? 'authenticated yes' : 'authenticated no'}`,
    `User ID: ${safeUserId}`,
    `Role: ${safeRole}`,
    `Auth route reached: ${routeHistory.some(event => event.endpoint === '/login') ? 'Yes' : 'No'}`,
    `Google OAuth redirect triggered: ${googleRedirect}`,
    `OAuth callback reached: ${callbackOutcome === 'Not reached' ? 'No' : 'Yes'}`,
    `OAuth callback result: ${callbackOutcome}`,
    `OAuth redirect host: ${oauthHost || 'Unavailable'} (host only; no query or state)`,
    `Session detected: ${authenticated ? 'Yes' : 'No'}`,
    `Auth error stage: ${lastAuthFailure?.stage || 'None captured'}`,
    'Auth error code: Unavailable (response bodies are not retained)',
    `Cookie access enabled: ${navigator.cookieEnabled ? 'Yes' : 'No'}`,
    'Auth cookie presence: Not inspected; cookie values and HttpOnly state are not accessible to this report',
    '',
    `Debug mode: ${debugLogger.isEnabled() ? 'on' : 'off'}`,
    'Feature flags: None registered in the client diagnostics contract',
    '',
    `API: ${apiHostname()}`,
    `/health: ${events.filter(event => event.kind === 'network' && event.endpoint === '/health').slice(-1)[0]?.status ?? 'Unavailable (not probed)'}`,
    `/health/deep: ${diagnosticsAuthorized ? visibleDeepHealthEvent?.status ?? 'Unavailable (not probed)' : 'Unavailable or protected'}`,
    `DB provider: ${diagnosticsAuthorized ? 'PostgreSQL/Prisma; connection details withheld' : 'Not exposed to this user'}`,
    `Safe backend diagnostics: ${diagnosticsAuthorized && backendSummary ? `status=${backendSummary.status} database=${backendSummary.databaseStatus} migrations=${backendSummary.migrationStatus}` : 'Unavailable or protected'}`,
    `Metered provider process-environment configuration (tenant credentials not enumerated): ${diagnosticsAuthorized && backendSummary ? Object.entries(backendSummary.providers).map(([provider, status]) => `${provider}=${status}`).join(', ') : 'Unavailable or protected'}`,
    '',
    `Recent frontend logs (${recentEvents.length} of ${visibleEvents.length} available; maximum 100):`,
    recentLogLines,
    '',
    'Recent frontend runtime errors:',
    recentErrorLines,
    '',
    'Recent failed API requests (endpoint and status only):',
    failedRequestLines,
    '',
    'Recent API correlation IDs:',
    failedCorrelationLines,
    `Current correlation ID: ${currentCorrelationId}`,
    `Last endpoint probe: ${visibleProbeEvent ? `id=${visibleProbeEvent.diagnosticId || 'Unavailable'} method=${visibleProbeEvent.method || 'Unavailable'} path=${visibleProbeEvent.endpoint || 'Unavailable'} expected=${visibleProbeEvent.expectedStatus ?? 'Unavailable'} actual=${visibleProbeEvent.status ?? 'Unavailable'} latencyMs=${visibleProbeEvent.durationMs ?? 'Unavailable'} correlation=${visibleProbeEvent.correlationId || 'Unavailable'}` : 'Unavailable (no authorized probe result)'}`,
    `Sanitized request/success/error examples: ${lastProbeSummary ? `id=${lastProbeSummary.id} request=${lastProbeSummary.requestExample} success=${lastProbeSummary.successExample} errors=${lastProbeSummary.errorExamples}` : 'Unavailable (no authorized registered probe result)'}`,
    '',
    `AI-related client API calls in retained window: ${meteredCandidates.length}`,
    `AI-related client API failures: ${meteredCandidates.filter(event => event.level === 'error' || (event.status !== undefined && event.status >= 400)).length}`,
    'Measured server-side usage, retry bounds, usage caps and kill-switch state: Not exposed or not implemented in this API contract',
    '',
    'Recent authentication diagnostics:',
    authSummary,
    '',
    'Reset limitations: Only application-owned browser storage, cache entries, accessible cookies and local auth state can be cleared. Browser-wide HTTP cache and HttpOnly cookies cannot be cleared by this client.',
    '[SENSITIVE VALUES REDACTED]',
    '=== End of Report ===',
  ].join('\n');
}

export async function copyDebugReport(context: SafeAuthContext = {}): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getDebugInfo(context));
    buffer.add({ kind: 'action', level: 'info', stage: 'copy-report', outcome: 'success' });
    return true;
  } catch {
    buffer.add({ kind: 'action', level: 'error', stage: 'copy-report', outcome: 'failure' });
    return false;
  }
}

export async function resetApplicationState() {
  return clearApplicationState({
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    caches: window.caches,
    clearCookies: () => clearApplicationCookies(document, window.location.pathname),
    clearEvents: () => { buffer.clear(); debugLogger.clear(); },
  });
}

debugCapture.startCapture();
if (import.meta.hot) import.meta.hot.dispose(() => debugCapture.stopCapture());
