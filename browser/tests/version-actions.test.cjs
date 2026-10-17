const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '../renderer/version-actions.js'),
  'utf8',
);

function element() {
  const listeners = new Map();
  const classes = new Set();
  const attributes = {};
  return {
    attributes,
    disabled: false,
    textContent: '',
    innerHTML: '',
    title: '',
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    setAttribute: (key, value) => { attributes[key] = value; },
    addEventListener: (name, callback) => listeners.set(name, callback),
    click: async () => listeners.get('click')({}),
  };
}

function harness() {
  const elements = {
    versionBtn: element(),
    diagnosticCopy: element(),
    diagnosticClear: element(),
    diagnosticStatus: element(),
  };
  const timers = [];
  let reloads = 0;
  const local = new Map([['keledon-auth', 'secret'], ['business-record', 'keep']]);
  const session = new Map([['keledon-session', 'secret'], ['foreign-state', 'keep']]);
  const storage = (items) => ({
    get length() { return items.size; },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    removeItem: (key) => items.delete(key),
  });
  const caches = new Set(['keledon-assets', 'customer-cache']);
  let disconnected = false;
  let logsCleared = false;
  const win = {
    document: {
      getElementById: (id) => elements[id],
      querySelectorAll: () => [],
    },
    navigator: {
      language: 'en-US',
      clipboard: { writeText: async (value) => { win.copied = value; } },
    },
    localStorage: storage(local),
    sessionStorage: storage(session),
    caches: {
      keys: async () => [...caches],
      delete: async (key) => caches.delete(key),
    },
    addEventListener: () => {},
    location: { reload: () => { reloads++; } },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    keledon: {
      device: { getInfo: async () => ({ version: require('../package.json').version, environment: 'development', authenticated: false, electron: '44.7.0', chrome: '132.0.0' }) },
      runtime: {
        getStatus: async () => ({ status: 'disconnected', connected: false, vendorCount: 0, cloudUrl: 'https://api.example.test/path?token=private' }),
        disconnect: async () => { disconnected = true; return { success: true }; },
      },
      brain: { getDebugMode: async () => ({ enabled: true }) },
      evidence: {
        getEventLogs: async () => [{
          timestamp: '2026-10-13T12:00:00.000Z',
          level: 'error', category: 'cloud', event: 'request_failed',
          data: { status: 503, response: 'private customer detail', apiKey: 'synthetic-secret' },
        }, {
          timestamp: '2026-10-13T12:01:00.000Z',
          level: 'info', category: 'ui', event: 'customer_name_secret',
          data: { email: 'private@example.test' },
        }],
      },
      cmdlog: { clearLog: async () => { logsCleared = true; return { cleared: true }; } },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, globalThis: win, Date, URL, Intl, Set, Array, Number });
  module.exports.mount(win);
  return {
    elements,
    timers,
    win,
    didReload: () => reloads,
    local,
    session,
    caches,
    didDisconnect: () => disconnected,
    didClearLogs: () => logsCleared,
  };
}

test('always-visible row reports the installed version and copies a sanitized complete report', async () => {
  const { elements, timers, win } = harness();
  await Promise.resolve();
  assert.equal(elements.versionBtn.textContent, `v${require('../package.json').version}`);
  assert.deepEqual(elements.diagnosticCopy.attributes, { 'aria-label': 'Copy complete diagnostics' });
  await elements.diagnosticCopy.click();
  const report = win.copied;
  assert.match(report, new RegExp(`Version: v${require('../package.json').version.replaceAll('.', '\\.')}\\n`));
  assert.match(report, /Environment: development/);
  assert.match(report, /Debug mode: on/);
  assert.match(report, /Browser: Electron/);
  assert.match(report, /API: api\.example\.test/);
  assert.match(report, /Recent frontend runtime errors:/);
  assert.match(report, /request_failed status=503/);
  for (const secret of ['private customer detail', 'synthetic-secret', 'private@example.test', 'customer_name_secret', 'api.example.test/path', 'token=private']) {
    assert.ok(!report.includes(secret), secret);
  }
  assert.equal(elements.diagnosticStatus.textContent, 'Diagnostics copied');
  assert.match(elements.diagnosticCopy.innerHTML, /<svg/);
  assert.ok(timers.length > 0);
});

test('native Browser diagnostics actions keep 44x44 hit targets and compact visual tiles', () => {
  const html = fs.readFileSync(path.join(__dirname, '../renderer/index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '../renderer/renderer-controls.css'), 'utf8');
  assert.match(html, /class="diagnostic-actions"[\s\S]*id="diagnosticCopy"[\s\S]*id="diagnosticClear"/);
  assert.match(styles, /\.diagnostic-actions\s*\{[^}]*gap:\s*4px/);
  assert.match(styles, /\.diagnostic-actions button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;[^}]*min-width:\s*44px/);
  assert.match(styles, /\.diagnostic-actions #diagnosticCopy::before\s*\{[^}]*inset:\s*8px 0 8px 16px/);
  assert.match(styles, /\.diagnostic-actions #diagnosticClear::before\s*\{[^}]*inset:\s*8px 16px 8px 0/);
  assert.match(styles, /\.diagnostic-actions button:focus-visible\s*\{[^}]*outline:/);
  assert.match(styles, /\.diagnostic-actions svg\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px/);
  assert.match(source, /button\.setAttribute\('aria-label', label\)/);
});

test('cache action clears only owned caches and reloads after confirming success', async () => {
  const { elements, timers, local, session, caches, didDisconnect, didClearLogs, didReload } = harness();
  await elements.diagnosticClear.click();
  assert.equal(elements.diagnosticStatus.textContent, 'KELEDON client state cleared');
  assert.match(elements.diagnosticClear.innerHTML, /<svg/);
  assert.ok(timers.length > 0);
  assert.equal(local.has('keledon-auth'), false);
  assert.equal(local.has('business-record'), true);
  assert.equal(session.has('keledon-session'), false);
  assert.equal(session.has('foreign-state'), true);
  assert.equal(caches.has('keledon-assets'), false);
  assert.equal(caches.has('customer-cache'), true);
  assert.equal(didDisconnect(), true);
  assert.equal(didClearLogs(), true);
  assert.equal(didReload(), 0, 'show the success indicator before restarting');
  for (const timer of timers) timer();
  assert.equal(didReload(), 1);
});
