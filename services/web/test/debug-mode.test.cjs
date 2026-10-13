const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const Module = require('node:module');

function loadLogger(dev) {
  const entry = path.join(__dirname, '../src/lib/debug-logger.ts');
  const built = esbuild.buildSync({
    entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node',
    define: { 'import.meta.env.DEV': String(dev) },
  });
  const storage = new Map();
  const storageApi = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  };
  const module = { exports: {} };
  vm.runInNewContext(built.outputFiles[0].text, {
    module, exports: module.exports, localStorage: storageApi, sessionStorage: storageApi,
    console: { log() {} }, Date, WeakSet, Set, Number, Object, Array, Error,
  });
  return module.exports.debugLogger;
}

test('debug mode defaults on in non-production and off in production, with observable transitions', () => {
  const devLogger = loadLogger(true);
  assert.equal(devLogger.isEnabled(), true);

  const productionLogger = loadLogger(false);
  assert.equal(productionLogger.isEnabled(), false);
  let notifications = 0;
  productionLogger.subscribe(() => notifications++);
  productionLogger.enable(true);
  assert.equal(productionLogger.isEnabled(), true);
  productionLogger.enable(false);
  assert.equal(productionLogger.isEnabled(), false);
  assert.ok(notifications >= 2);
});

test('the floating diagnostics panel is mounted across public, login, shell and admin app routes', () => {
  const root = path.resolve(__dirname, '../../..');
  for (const app of ['services/web', 'landing']) {
    const router = require('node:fs').readFileSync(path.join(root, app, 'src/AppRouter.tsx'), 'utf8');
    assert.match(router, /<DebugOverlay\s*\/>/);
    assert.match(router, /<BrowserRouter>/);
    assert.match(router, /<Routes>/);
  }
  const overlayPath = path.join(root, 'services/web/src/components/common/DebugOverlay.tsx');
  const overlay = require('node:fs').readFileSync(overlayPath, 'utf8');
  assert.match(overlay, /if \(!enabled\) return null/);
  assert.match(overlay, /debugCapture\.getLogs\(\)/);
  assert.match(overlay, /event\.correlationId/);
});
