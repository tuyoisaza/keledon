import { debugLogger } from './debug-logger';
import { createEventBuffer, clearApplicationState, clearApplicationCookies } from './diagnostics-core';

const buffer = createEventBuffer();
let stop: (() => void) | undefined;
export const debugCapture = {
  getLogs: () => buffer.read(),
  clearLogs: () => buffer.clear(),
  startCapture() {
    if (stop || typeof window === 'undefined') return;
    const cleanups: Array<() => void> = [];
    // Always record error categories, never exception messages, stack URLs or arbitrary arguments.
    const onError = () => buffer.add({ kind: 'error', level: 'error' });
    const onRejection = () => buffer.add({ kind: 'rejection', level: 'error' });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    cleanups.push(() => window.removeEventListener('error', onError), () => window.removeEventListener('unhandledrejection', onRejection));
    if (import.meta.env.DEV) {
      for (const level of ['log', 'info', 'warn', 'error'] as const) {
        const original = console[level];
        const wrapped = (...args: unknown[]) => {
          buffer.add({ kind: 'console', level });
          original.apply(console, args);
        };
        console[level] = wrapped;
        cleanups.push(() => { if (console[level] === wrapped) console[level] = original; });
      }
    }
    const originalFetch = window.fetch;
    if (originalFetch) {
      const wrapped: typeof fetch = async (input, init) => {
        const started = performance.now();
        const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
        try {
          const response = await originalFetch.call(window, input, init);
          buffer.add({ kind: 'network', level: response.ok ? 'info' : 'warn', status: response.status, method, durationMs: performance.now() - started });
          return response;
        } catch (error) {
          buffer.add({ kind: 'network', level: 'error', method, durationMs: performance.now() - started });
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

export function getDebugInfo(): string {
  const events = buffer.read();
  return JSON.stringify({
    report: 'KELEDON public-safe client diagnostics',
    version: /^\d+\.\d+\.\d+$/.test(__APP_VERSION__) ? 'v' + __APP_VERSION__ : 'unavailable',
    generatedAt: new Date().toISOString(),
    environment: import.meta.env.PROD ? 'production' : 'development',
    online: navigator.onLine,
    language: /^(en|es|pt)(-|$)/i.test(navigator.language) ? navigator.language : 'other',
    viewport: { width: window.innerWidth, height: window.innerHeight },
    capabilities: { clipboard: !!navigator.clipboard?.writeText, cacheStorage: !!window.caches, cookies: navigator.cookieEnabled },
    collection: { maximumEvents: 100, retainedEvents: events.length, arbitraryConsoleContent: 'excluded', requestBodiesHeadersAndUrls: 'excluded' },
    events,
    limitations: ['Client metadata only; no privileged server logs or live probes.', 'No user/company/vendor identity, auth values or URL/query/fragment included.', 'A reset clears only application-accessible owned state; it does not revoke server sessions or clear global browser caches.'],
  }, null, 2);
}

export async function copyDebugReport(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getDebugInfo());
    buffer.add({ kind: 'action', level: 'info' });
    return true;
  } catch {
    buffer.add({ kind: 'action', level: 'error' });
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
