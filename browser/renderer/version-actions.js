/* Shared native renderer implementation of the PHDK version/actions contract. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KeledonVersionActions = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const texts = {
    en: {
      copy: 'Copy complete diagnostics',
      clear: 'Clear application cache',
      copied: 'Diagnostics copied',
      failed: 'Action failed; success was not confirmed',
      cleared: 'KELEDON client state cleared',
    },
    es: {
      copy: 'Copiar diagnóstico completo',
      clear: 'Limpiar caché',
      copied: 'Diagnóstico copiado',
      failed: 'La acción falló; no se confirmó el éxito',
      cleared: 'Estado local de KELEDON limpiado',
    },
    pt: {
      copy: 'Copiar diagnóstico completo',
      clear: 'Limpar cache',
      copied: 'Diagnóstico copiado',
      failed: 'A ação falhou; sucesso não confirmado',
      cleared: 'Estado local do KELEDON limpo',
    },
  };
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>';
  const clipboard = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 4H5v18h14V4h-3"/></svg>';
  const trash = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
  const allowedCategories = new Set([
    'browser', 'cloud', 'media', 'executor', 'escalation', 'ui', 'auth',
    'runtime', 'voice', 'provider', 'api', 'network',
  ]);
  const allowedLevels = new Set(['debug', 'info', 'warn', 'error', 'critical']);
  const allowedEvents = new Set([
    'connect_start', 'connect_success', 'connect_failed', 'disconnect',
    'request_started', 'request_success', 'request_failed', 'session_started',
    'session_ended', 'login_success', 'login_failed', 'runtime_status',
    'command_sent', 'command_received', 'voice_started', 'voice_ended',
    'tts_success', 'stt_success', 'error', 'warning',
  ]);

  function hostname(value) {
    try {
      return new URL(value).hostname || 'Unavailable';
    } catch {
      return 'Unavailable';
    }
  }

  function isoTimestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT[^\s]{1,40}Z$/.test(value)) {
      return 'Unavailable';
    }
    return value;
  }

  function safeEvent(entry) {
    const data = entry && entry.data && typeof entry.data === 'object' ? entry.data : {};
    const category = allowedCategories.has(entry?.category) ? entry.category : 'other';
    const event = allowedEvents.has(entry?.event) ? entry.event : '[redacted]';
    const level = allowedLevels.has(entry?.level) ? entry.level : 'info';
    const status = Number.isInteger(data.status) && data.status >= 100 && data.status <= 599
      ? data.status
      : undefined;
    const method = typeof data.method === 'string' && /^(GET|POST|PUT|PATCH|DELETE)$/i.test(data.method)
      ? data.method.toUpperCase()
      : undefined;
    const correlationId = typeof data.correlationId === 'string' && /^req_[a-f0-9]{32}$/i.test(data.correlationId)
      ? data.correlationId
      : undefined;
    return {
      timestamp: isoTimestamp(entry?.timestamp),
      level,
      category,
      event,
      ...(status === undefined ? {} : { status }),
      ...(method ? { method } : {}),
      ...(correlationId ? { correlationId } : {}),
    };
  }

  function safeReport(info, status, counts = {}, context = {}) {
    const state = ['idle', 'disconnected', 'connecting', 'connected'].includes(status?.status)
      ? status.status
      : 'unknown';
    const events = Array.isArray(context.events) ? context.events.slice(-100).map(safeEvent) : [];
    const recent = events.slice(-20);
    const errors = recent.filter((entry) => entry.level === 'error' || entry.level === 'critical');
    const failedRequests = recent.filter((entry) => entry.category === 'cloud' && entry.status >= 400);
    const recentLines = recent.length
      ? recent.map((entry) => `${entry.timestamp} ${entry.level} ${entry.category}/${entry.event}${entry.status ? ` status=${entry.status}` : ''}${entry.correlationId ? ` correlation=${entry.correlationId}` : ''}`).join('\n')
      : 'None captured';
    const errorLines = errors.length
      ? errors.map((entry) => `${entry.timestamp} ${entry.category}/${entry.event}`).join('\n')
      : 'None captured';
    const failedLines = failedRequests.length
      ? failedRequests.map((entry) => `Cloud request status=${entry.status}${entry.correlationId ? ` correlation=${entry.correlationId}` : ''}`).join('\n')
      : 'None captured';
    const correlationId = [...recent].reverse().find((entry) => entry.correlationId)?.correlationId || 'Unavailable';
    const viewport = context.viewport || {};
    const screen = context.screen || {};
    const locale = typeof context.locale === 'string' && /^(en|es|pt)(-|$)/i.test(context.locale)
      ? context.locale
      : 'other';
    const timezone = typeof context.timezone === 'string' && context.timezone.length <= 64
      ? context.timezone
      : 'Unavailable';
    const version = /^\d+\.\d+\.\d+$/.test(info?.version || '') ? `v${info.version}` : 'Unavailable';
    const environment = ['development', 'staging', 'production'].includes(info?.environment)
      ? info.environment
      : 'Unavailable';
    const gitSha = /^[a-f0-9]{7,40}$/i.test(info?.gitSha || '') ? info.gitSha.slice(0, 12) : 'Unavailable';
    const build = isoTimestamp(info?.buildTimestamp);
    const debug = typeof context.debugMode === 'boolean' ? (context.debugMode ? 'on' : 'off') : 'Unavailable';
    const auth = typeof info?.authenticated === 'boolean'
      ? (info.authenticated ? 'authenticated yes' : 'authenticated no')
      : 'Unavailable';
    const vendorCount = Number.isSafeInteger(status?.vendorCount) ? status.vendorCount : 'Unavailable';
    const apiHost = hostname(status?.cloudUrl);

    return [
      '=== PHDK Debug Diagnostics Report ===',
      '',
      'Project: KELEDON Browser',
      `Environment: ${environment}`,
      `Version: ${version}`,
      `Git SHA: ${gitSha}`,
      `Build: ${build}`,
      `Client: ${new Date().toISOString()}`,
      '',
      'Route: Browser main window (/renderer/index.html)',
      `Locale: ${locale}`,
      `Timezone: ${timezone}`,
      `Browser: Electron ${info?.electron || 'Unavailable'} / Chromium ${info?.chrome || 'Unavailable'}`,
      `Viewport: ${Number.isInteger(viewport.width) ? viewport.width : 'Unavailable'} x ${Number.isInteger(viewport.height) ? viewport.height : 'Unavailable'}`,
      `Screen: ${Number.isInteger(screen.width) ? screen.width : 'Unavailable'} x ${Number.isInteger(screen.height) ? screen.height : 'Unavailable'}`,
      '',
      `Auth: ${auth}`,
      'User ID: Not exposed by the Browser client',
      'Role: Not exposed by the Browser client',
      'Feature flags: Unavailable',
      `Debug mode: ${debug}`,
      `Runtime: ${state}; connected=${status?.connected === true}; vendors=${vendorCount}`,
      '',
      `API: ${apiHost}`,
      '/health: Unavailable (not probed)',
      '/health/deep: Unavailable or protected (not probed)',
      'DB provider: Unavailable',
      'Safe backend diagnostics: Unavailable (not requested by this client)',
      '',
      `Recent frontend logs (${recent.length} of ${events.length} available; maximum 20):`,
      recentLines,
      '',
      'Recent frontend runtime errors:',
      errorLines,
      '',
      'Recent failed API requests (safe category/status only):',
      failedLines,
      '',
      'Recent API correlation IDs:',
      [...new Set(failedRequests.map((entry) => entry.correlationId).filter(Boolean))].join('\n') || 'Unavailable',
      `Current correlation ID: ${correlationId}`,
      'Last endpoint probe: Unavailable (no probe issued)',
      'Sanitized request/response examples: Unavailable (not captured)',
      '',
      `Metered API calls: ${Number.isSafeInteger(counts.meteredCalls) ? counts.meteredCalls : 'Unavailable'}`,
      `Metered API failures: ${Number.isSafeInteger(counts.meteredFailures) ? counts.meteredFailures : 'Unavailable'}`,
      `Browser activity entries: ${Number.isSafeInteger(counts.activity) ? counts.activity : 0}`,
      '',
      'Recent activity:',
      recent.map((entry) => `${entry.timestamp} ${entry.level} ${entry.category}/${entry.event}`).join('\n') || 'None captured',
      '',
      'Reset limitations: Only application-owned local/session storage, KELEDON caches, runtime session and diagnostic log buffers are cleared. Browser-wide HTTP cache, cookies and external vendor sessions are not cleared.',
      '[SENSITIVE VALUES REDACTED]',
      '=== End of Report ===',
    ].join('\n');
  }

  const owned = (key) => /^keledon[-_:]/i.test(key) || ['auth_token', 'user_email', 'user_name'].includes(key);

  async function clearOwnedState(win, api) {
    for (const store of [win.localStorage, win.sessionStorage]) {
      const names = Array.from({ length: store.length }, (_, index) => store.key(index)).filter((key) => key && owned(key));
      for (const key of names) {
        store.removeItem(key);
        if (store.getItem(key) !== null) throw new Error('Owned storage remains');
      }
    }
    if (win.caches) {
      const names = (await win.caches.keys()).filter((name) => /^keledon[-_:]/i.test(name));
      for (const name of names) await win.caches.delete(name);
      const remaining = await win.caches.keys();
      if (names.some((name) => remaining.includes(name))) throw new Error('Owned cache remains');
    }
    const disconnected = await api.runtime.disconnect();
    if (disconnected?.success !== true) throw new Error('Runtime disconnect was not confirmed');
    const cleared = await api.cmdlog.clearLog();
    if (cleared?.cleared !== true) throw new Error('Diagnostic log clear was not confirmed');
  }

  function mount(win) {
    const doc = win.document;
    const api = win.keledon;
    const version = doc.getElementById('versionBtn');
    const copy = doc.getElementById('diagnosticCopy');
    const clear = doc.getElementById('diagnosticClear');
    const status = doc.getElementById('diagnosticStatus');
    const t = texts[(win.navigator.language || 'en').split('-')[0]] || texts.en;
    copy.innerHTML = clipboard;
    clear.innerHTML = trash;
    for (const [button, label] of [[copy, t.copy], [clear, t.clear]]) {
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    const timers = new Set();
    let disposed = false;
    api.device.getInfo().then((info) => {
      if (!disposed && /^\d+\.\d+\.\d+$/.test(info?.version || '')) version.textContent = `v${info.version}`;
    }).catch(() => {});

    function later(callback) {
      const timer = win.setTimeout(() => {
        timers.delete(timer);
        if (!disposed) callback();
      }, 1500);
      timers.add(timer);
    }

    function bind(button, icon, action, message, afterSuccess) {
      button.addEventListener('click', async () => {
        if (button.disabled) return;
        button.disabled = true;
        try {
          await action();
          if (disposed) return;
          button.innerHTML = check;
          button.classList.add('diagnostic-success');
          status.textContent = message;
          later(() => {
            button.innerHTML = icon;
            button.classList.remove('diagnostic-success');
            button.disabled = false;
            if (afterSuccess) afterSuccess();
          });
        } catch {
          if (!disposed) {
            button.disabled = false;
            button.innerHTML = icon;
            status.textContent = t.failed;
          }
        }
      });
    }

    bind(copy, clipboard, async () => {
      const [info, runtime, eventResult, debugResult] = await Promise.allSettled([
        api.device.getInfo(),
        api.runtime.getStatus(),
        api.evidence.getEventLogs({ limit: 100 }),
        api.brain.getDebugMode(),
      ]);
      if (info.status !== 'fulfilled' || runtime.status !== 'fulfilled') {
        throw new Error('Required local diagnostics unavailable');
      }
      const events = eventResult.status === 'fulfilled' && Array.isArray(eventResult.value)
        ? eventResult.value
        : [];
      const debugMode = debugResult.status === 'fulfilled' && typeof debugResult.value?.enabled === 'boolean'
        ? debugResult.value.enabled
        : undefined;
      const report = safeReport(info.value, runtime.value, {
        activity: doc.querySelectorAll('.activity-entry').length,
      }, {
        events,
        debugMode,
        locale: win.navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewport: { width: win.innerWidth, height: win.innerHeight },
        screen: { width: win.screen?.width, height: win.screen?.height },
      });
      await win.navigator.clipboard.writeText(report);
    }, t.copied);

    bind(clear, trash, () => clearOwnedState(win, api), t.cleared, () => win.location.reload());
    win.addEventListener('beforeunload', () => {
      disposed = true;
      for (const timer of timers) win.clearTimeout(timer);
    }, { once: true });
  }

  return { safeReport, clearOwnedState, mount };
});
