const test = require('node:test');
const assert = require('node:assert/strict');
test('theme settings load from the persisted same-origin configuration endpoint', async () => {
  const nodes = new Map();
  global.document = { head: { append(node) { nodes.set(node.id, node); } }, getElementById(id) { return nodes.get(id) || null; }, createElement() { return { id: '', textContent: '' }; } };
  const preset = { background: '#111111', foreground: '#222222', primary: '#123456', primaryForeground: '#ffffff', accent: '#123456', accentForeground: '#ffffff', muted: '#eeeeee', mutedForeground: '#444444', border: '#cccccc', ring: '#123456', popover: '#ffffff', card: '#ffffff', cardForeground: '#222222', sidebar: '#ffffff', sidebarForeground: '#222222', sidebarActive: '#123456' };
  let requestedUrl; let requestOptions;
  global.fetch = async (url, options) => { requestedUrl = url; requestOptions = options; return { ok: true, json: async () => ({ corporateEnabled: false, revision: 4, presets: { light: preset, dark: { ...preset, primary: '#234567' }, corporate: { ...preset, primary: '#345678' } } }) }; };
  const { loadThemeConfiguration } = await import('../../../shared/theme-runtime.js');
  const value = await loadThemeConfiguration('https://tenant.example/cloud');
  assert.equal(requestedUrl, 'https://tenant.example/api/theme');
  assert.equal(requestOptions.credentials, 'omit');
  assert.equal(value.revision, 4);
  assert.equal(value.corporateEnabled, false);
  assert.match(nodes.get('keledon-theme-runtime').textContent, /--color-primary:#123456/);
  delete global.document; delete global.fetch;
});
