const test = require('node:test');
const assert = require('node:assert/strict');
test('theme runtime applies editable semantic values to the selected preset', async () => {
  const nodes = new Map();
  global.document = { head: { append(node) { nodes.set(node.id, node); } }, getElementById(id) { return nodes.get(id) || null; }, createElement() { return { id: '', textContent: '' }; } };
  const { applyThemeConfiguration } = await import('../../../shared/theme-runtime.js');
  const preset = { background: '#111111', foreground: '#222222', primary: '#123456', primaryForeground: '#ffffff', accent: '#123456', accentForeground: '#ffffff', muted: '#eeeeee', mutedForeground: '#444444', border: '#cccccc', ring: '#123456', popover: '#ffffff', card: '#ffffff', cardForeground: '#222222', sidebar: '#ffffff', sidebarForeground: '#222222', sidebarActive: '#123456' };
  applyThemeConfiguration({ corporateEnabled: true, presets: { light: preset, dark: { ...preset, primary: '#234567' }, corporate: { ...preset, primary: '#345678' } } });
  assert.match(nodes.get('keledon-theme-runtime').textContent, /data-keledon-theme="corporate"/);
  assert.match(nodes.get('keledon-theme-runtime').textContent, /--color-primary:#345678/);
  delete global.document;
});
