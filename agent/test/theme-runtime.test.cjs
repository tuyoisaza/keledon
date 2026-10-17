const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../extension/ui/theme-runtime.js'), 'utf8');
const tokenKeys = ['background', 'foreground', 'primary', 'primaryForeground', 'accent', 'accentForeground', 'muted', 'mutedForeground', 'border', 'ring', 'popover', 'card', 'cardForeground', 'sidebar', 'sidebarForeground', 'sidebarActive'];
const palette = (color) => Object.fromEntries(tokenKeys.map((key) => [key, color]));

function runThemeRuntime({ cloudUrl = 'https://tenant.example/cloud', config = { corporateEnabled: true, presets: { light: palette('#123456'), dark: palette('#234567'), corporate: palette('#345678') } }, responseOk = true } = {}) {
  const state = { requested: null, style: null };
  const context = {
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    chrome: { runtime: { lastError: null, sendMessage(_message, callback) { callback({ cloudUrl }); } } },
    document: {
      head: { append(style) { style.isConnected = true; state.style = style; } },
      getElementById(id) { return state.style?.id === id ? state.style : null; },
      createElement() { return { isConnected: false, textContent: '' }; },
    },
    fetch: async (url, options) => { state.requested = { url: String(url), options }; return { ok: responseOk, json: async () => config }; },
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'agent-theme-runtime.js' });
  return { context, state };
}

test('loads the persisted theme from the configured Cloud without credentials and applies all presets', async () => {
  const { context, state } = runThemeRuntime();
  assert.equal(await context.KeledonAgentTheme.ready, true);
  assert.equal(state.requested.url, 'https://tenant.example/api/theme');
  assert.equal(state.requested.options.credentials, 'omit');
  assert.match(state.style.textContent, /data-keledon-theme="light"/);
  assert.match(state.style.textContent, /--color-primary:#345678/);
});

test('rejects unsafe Cloud schemes and malformed palette values without injecting CSS', async () => {
  const unsafe = runThemeRuntime({ cloudUrl: 'javascript:alert(1)' });
  assert.equal(await unsafe.context.KeledonAgentTheme.ready, false);
  assert.equal(unsafe.state.requested, null);
  const malformed = runThemeRuntime({ config: { corporateEnabled: true, presets: { light: { ...palette('#123456'), primary: 'url(javascript:alert(1))' }, dark: palette('#234567'), corporate: palette('#345678') } } });
  assert.equal(await malformed.context.KeledonAgentTheme.ready, false);
  assert.equal(malformed.state.style, null);
});
