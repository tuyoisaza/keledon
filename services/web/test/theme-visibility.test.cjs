const test = require('node:test');
const assert = require('node:assert/strict');
test('corporate visibility is an explicit persisted flag independent of preset values', async () => {
  const nodes = new Map();
  global.document = { head: { append(node) { nodes.set(node.id, node); } }, getElementById(id) { return nodes.get(id) || null; }, createElement() { return { id: '', textContent: '' }; } };
  const preset = { background: '#111111', foreground: '#222222', primary: '#345678', primaryForeground: '#ffffff', accent: '#345678', accentForeground: '#ffffff', muted: '#eeeeee', mutedForeground: '#444444', border: '#cccccc', ring: '#345678', popover: '#ffffff', card: '#ffffff', cardForeground: '#222222', sidebar: '#ffffff', sidebarForeground: '#222222', sidebarActive: '#345678' };
  global.fetch = async () => ({ ok: true, json: async () => ({ corporateEnabled: false, presets: { light: preset, dark: preset, corporate: preset } }) });
  const { loadThemeConfiguration } = await import('../../../shared/theme-runtime.js');
  const config = await loadThemeConfiguration();
  assert.equal(config.corporateEnabled, false);
  assert.equal(config.presets.corporate.primary, '#345678');
  delete global.fetch; delete global.document;
});
