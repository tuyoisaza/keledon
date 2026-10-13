import { useEffect, useState } from 'react';
import { Bug, Play, RefreshCw } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { debugCapture } from '@/lib/debug-report';
import { useTranslation } from '@/context/I18nContext';

type EndpointDiagnostic = {
  id: string;
  method: string;
  path: string;
  purpose: string;
  authRequired: boolean;
  requiredRoles: string[];
  probeMode: 'safe_read' | 'validation_only' | 'dry_run' | 'manual_only';
  expectedStatuses: number[];
  sanitizedRequestExample: Record<string, unknown> | null;
  sanitizedSuccessExample: Record<string, unknown>;
  sanitizedErrorExamples: Array<Record<string, unknown>>;
};

type DeepHealth = {
  status: string;
  version: string;
  gitSha: string;
  buildTimestamp: string;
  endpointDiagnostics: EndpointDiagnostic[];
  database?: { status: string; migrations: string };
  meteredProviders?: Record<string, string | number>;
  latestSafeProbes?: ProbeEvidence[];
};

type ProbeEvidence = {
  id: string;
  status: 'pass' | 'fail';
  method: string;
  path: string;
  httpStatus: number;
  latencyMs: number;
  correlationId: string;
};

export default function ManagementDebugPage() {
  const { t } = useTranslation();
  const text = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)), t(key));
  const [debugMode, setDebugMode] = useState(() => {
    const saved = localStorage.getItem('keldon-debug-mode');
    return import.meta.env.DEV || saved === 'true';
  });
  const [health, setHealth] = useState<DeepHealth | null>(null);
  const [probeResults, setProbeResults] = useState<Record<string, ProbeEvidence>>({});
  const [loading, setLoading] = useState(debugMode);
  const [running, setRunning] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadHealth = async (signal?: AbortSignal) => {
    setLoading(true);
    setRequestFailed(false);
    try {
      const response = await fetch(`${API_URL}/health/deep`, { headers: authHeaders(), signal });
      if (!response.ok) throw new Error('Diagnostics unavailable');
      const body = await response.json() as DeepHealth;
      debugCapture.setEndpointDiagnostics(body.endpointDiagnostics);
      debugCapture.setBackendSummary(body);
      setHealth(body);
      setProbeResults(Object.fromEntries((body.latestSafeProbes || []).map((probe) => [probe.id, probe])));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setRequestFailed(true);
      debugCapture.setEndpointDiagnostics([]);
      debugCapture.setBackendSummary(undefined);
      setHealth(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (!debugMode) {
      setLoading(false);
      setHealth(null);
      setProbeResults({});
      debugCapture.clearEndpointDiagnostics();
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setRequestFailed(false);
    void fetch(`${API_URL}/health/deep`, { headers: authHeaders(), signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Diagnostics unavailable');
        const body = await response.json() as DeepHealth;
        debugCapture.setEndpointDiagnostics(body.endpointDiagnostics);
        debugCapture.setBackendSummary(body);
        setHealth(body);
        setProbeResults(Object.fromEntries((body.latestSafeProbes || []).map((probe) => [probe.id, probe])));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setRequestFailed(true);
        debugCapture.setEndpointDiagnostics([]);
        debugCapture.setBackendSummary(undefined);
        setHealth(null);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [debugMode]);

  const handleDebugToggle = (enabled: boolean) => {
    setDebugMode(enabled);
    localStorage.setItem('keldon-debug-mode', String(enabled));
    debugCapture.setDebugMode(enabled);
    if (!enabled) debugCapture.clearEndpointDiagnostics();
  };

  const executeProbe = async (endpoint: EndpointDiagnostic) => {
    const id = endpoint.id;
    try {
      const response = await fetch(`${API_URL}/health/deep/probes/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!response.ok) throw new Error('Probe unavailable');
      const evidence = await response.json() as ProbeEvidence;
      debugCapture.recordEvent({
        kind: 'action', level: evidence.status === 'pass' ? 'info' : 'warn',
        endpoint: '/health/deep', status: evidence.httpStatus,
        correlationId: evidence.correlationId, method: 'POST', durationMs: evidence.latencyMs,
        stage: 'probe', outcome: evidence.status, diagnosticId: evidence.id,
        expectedStatus: endpoint.expectedStatuses[0],
      });
      setProbeResults((current) => ({ ...current, [id]: evidence }));
    } catch {
      debugCapture.recordEvent({
        kind: 'action', level: 'error', endpoint: '/health/deep', method: 'POST',
        stage: 'probe', outcome: 'unavailable', diagnosticId: id,
        expectedStatus: endpoint.expectedStatuses[0],
      });
      setProbeResults((current) => ({ ...current, [id]: {
        id, status: 'fail', method: 'POST', path: `/health/deep/probes/${id}`,
        httpStatus: 0, latencyMs: 0, correlationId: 'unavailable',
      } }));
    }
  };

  const runProbe = async (endpoint: EndpointDiagnostic) => {
    setRunning(true);
    try { await executeProbe(endpoint); }
    finally { setRunning(false); }
  };

  const runnable = (endpoint: EndpointDiagnostic) => ['safe_read', 'validation_only', 'dry_run'].includes(endpoint.probeMode);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('diagnostics.debugTitle')}</h1>
        <p className="mt-1 text-muted-foreground">{t('diagnostics.debugDescription')}</p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-semibold text-foreground">{t('diagnostics.debugMode')}</h2>
          <p className="text-sm text-muted-foreground">{t('diagnostics.debugModeDescription')}</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" checked={debugMode} onChange={(event) => handleDebugToggle(event.target.checked)} className="peer sr-only" />
          <span className="after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full h-6 w-11 rounded-full bg-muted transition-colors after:content-[''] peer-checked:bg-primary" />
        </label>
      </div>

      {debugMode ? <section className="space-y-4 rounded-xl border border-border bg-card p-4" aria-labelledby="endpoint-diagnostics-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="endpoint-diagnostics-heading" className="font-semibold text-foreground">{t('diagnostics.endpointDiagnostics')}</h2>
            <p className="text-sm text-muted-foreground">{t('diagnostics.noAutomaticProbes')}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadHealth()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50">
              <RefreshCw size={15} aria-hidden="true" /> {t('diagnostics.refresh')}
            </button>
            <button type="button" onClick={async () => {
              setRunning(true);
              try { for (const endpoint of health?.endpointDiagnostics.filter(runnable) ?? []) await executeProbe(endpoint); }
              finally { setRunning(false); }
            }} disabled={loading || running || !health?.endpointDiagnostics.some(runnable)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">
              <Play size={15} aria-hidden="true" /> {t('diagnostics.runSafeProbes')}
            </button>
          </div>
        </div>

        {loading && <p role="status" className="text-sm text-muted-foreground">{t('diagnostics.loading')}</p>}
        {!loading && requestFailed && <p role="alert" className="text-sm text-destructive">{t('diagnostics.unavailable')}</p>}
        {!loading && health && <p className="text-xs text-muted-foreground">{text('diagnostics.apiBuild', { version: health.version, sha: health.gitSha, build: health.buildTimestamp })}</p>}
        {health?.endpointDiagnostics.map((endpoint) => {
          const evidence = probeResults[endpoint.id];
          return (
            <article key={endpoint.id} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-mono text-sm font-semibold">{endpoint.method} {endpoint.path}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{endpoint.purpose}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{text('diagnostics.endpointAuth', { auth: endpoint.authRequired ? endpoint.requiredRoles.join(', ') : t('diagnostics.public'), mode: endpoint.probeMode, statuses: endpoint.expectedStatuses.join(', ') })}</p>
                </div>
                {runnable(endpoint) && <button type="button" disabled={running} onClick={() => void runProbe(endpoint)} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">{t('diagnostics.test')}</button>}
              </div>
              <div className="grid gap-3 text-xs sm:grid-cols-3">
                <div><h4 className="mb-1 font-semibold">{t('diagnostics.request')}</h4><pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{JSON.stringify(endpoint.sanitizedRequestExample ?? {}, null, 2)}</pre></div>
                <div><h4 className="mb-1 font-semibold">{t('diagnostics.success')}</h4><pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{JSON.stringify(endpoint.sanitizedSuccessExample, null, 2)}</pre></div>
                <div><h4 className="mb-1 font-semibold">{t('diagnostics.errors')}</h4><pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{JSON.stringify(endpoint.sanitizedErrorExamples, null, 2)}</pre></div>
              </div>
              <p aria-live="polite" className="text-xs text-muted-foreground">{evidence ? text('diagnostics.lastProbe', { status: evidence.status, httpStatus: evidence.httpStatus || t('diagnostics.unavailableShort'), latency: evidence.latencyMs, correlation: evidence.correlationId }) : t('diagnostics.probeNotRun')}</p>
            </article>
          );
        })}
        {!loading && health?.endpointDiagnostics.length === 0 && <p className="text-sm text-muted-foreground">{t('diagnostics.noEndpoints')}</p>}
      </section> : <p className="text-sm text-muted-foreground">{t('diagnostics.debugModeRequired')}</p>}

      {!debugMode && <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground"><Bug size={18} aria-hidden="true" /> {t('diagnostics.panelOff')}</div>}
    </div>
  );
}
