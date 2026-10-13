import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('./vector-store.ts', import.meta.url), 'utf8');
function load(fakeFetch) {
  const module = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { module, exports: module.exports, require: name => {
    assert.equal(name, './api-fetch');
    return { apiFetch: fakeFetch };
  } });
  return module.exports.vectorStoreAPI;
}
test('collection status delegates a rooted API path and preserves real metrics', async () => {
  const actual = { collectionExists: true, documentCount: 7, collectionSize: 'unknown', dimensions: 42, distance: 'Cosine' };
  const api = load(async (path) => {
    assert.equal(path, '/api/vector-store/status');
    return { ok: true, json: async () => actual };
  });
  assert.deepEqual(await api.getCollectionStatus(), actual);
});
test('authorization and network failure never become synthetic empty collection status', async () => {
  const denied = load(async () => ({ ok: false, status: 403, text: async () => 'Access denied' }));
  await assert.rejects(denied.getCollectionStatus(), /Access denied/);
  const offline = load(async () => { throw new Error('offline'); });
  await assert.rejects(offline.getCollectionStatus(), /offline/);
});
