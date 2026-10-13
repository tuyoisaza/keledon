const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(fetchImpl) {
  const runtimeStatus = { deviceId: 'synthetic-device', authToken: 'synthetic-token', cloudUrl: 'https://invalid.example', status: 'connected' };
  const timers = [];
  const requests = [];
  const noop = () => {};
  const sourcePath = path.join(__dirname, '../src/command-poller.ts');
  const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const sandbox = {
    exports: {}, AbortSignal,
    require(name) {
      if (name === 'electron-log') return { info: noop, warn: noop, error: noop, debug: noop };
      if (name.includes('runtime-state')) return { runtimeStatus };
      if (name.includes('cmdlog')) return { log: noop, preview: () => '', truncate: () => '' };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (options.method === 'POST') return new Response('{}');
      return fetchImpl();
    },
    setInterval(fn) { timers.push(fn); return timers.length; },
    clearInterval: noop,
  };
  vm.runInNewContext(compiled, sandbox, { filename: sourcePath });
  return { api: sandbox.exports, requests, tick: () => timers[0]() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const command = { id: 'command-1', command: 'rpa_flow', payload: { steps: [{ action: 'fill', selector: '#notes', value: 'x'.repeat(500) }] }, created_at: '2026-10-12T00:00:00Z' };

(async () => {
  let release;
  let executed = 0;
  const h = harness(async () => new Response(JSON.stringify(command)));
  h.api.registerCommandHandler('rpa_flow', async received => {
    executed++;
    assert.equal(received.payload.steps[0].value.length, 500);
    await new Promise(resolve => { release = resolve; });
    return { command_id: received.id, status: 'success', timestamp: new Date().toISOString() };
  });
  h.api.startPolling();
  await flush();
  h.tick(); h.tick();
  await flush();
  assert.equal(executed, 1, 'long commands execute intact and interval ticks cannot overlap handler');
  assert.equal(h.requests.filter(r => r.options.method === 'GET').length, 1);
  release(); await flush();
  assert.equal(JSON.parse(h.requests.find(r => r.options.method === 'POST').options.body).status, 'completed');
  h.api.stopPolling();

  for (const invalid of [[], 'bad', { command: 'rpa_flow', payload: {} }, { id: 'c', command: 'rpa_flow', payload: [] }]) {
    const negative = harness(async () => new Response(JSON.stringify(invalid)));
    let called = false;
    negative.api.registerCommandHandler('rpa_flow', async () => { called = true; });
    negative.api.startPolling(); await flush();
    assert.equal(called, false, 'malformed envelopes must not reach executor');
    assert.equal(negative.requests.some(r => r.options.method === 'POST'), false);
    negative.api.stopPolling();
  }
  const nested = harness(async () => new Response(JSON.stringify({ deviceId: 'synthetic-device', sessionId: 's', command: { ...command, type: 'rpa_flow' } })));
  nested.api.registerCommandHandler('rpa_flow', async received => ({ command_id: received.id, status: 'success', timestamp: 'now' }));
  nested.api.startPolling(); await flush();
  const resultBody = JSON.parse(nested.requests.find(r => r.options.method === 'POST').options.body);
  assert.equal(resultBody.commandId, command.id); assert.equal(resultBody.status, 'completed');
  nested.api.stopPolling();
  const unknown = harness(async () => new Response(JSON.stringify({ ...command, command: 'unsupported' })));
  unknown.api.startPolling(); await flush();
  assert.equal(JSON.parse(unknown.requests.find(r => r.options.method === 'POST').options.body).status, 'failed');
  unknown.api.stopPolling();

  let completeFetch;
  const stopped = harness(() => new Promise(resolve => { completeFetch = resolve; }));
  let lateExecution = false;
  stopped.api.registerCommandHandler('rpa_flow', async () => { lateExecution = true; });
  stopped.api.startPolling(); stopped.api.stopPolling();
  completeFetch(new Response(JSON.stringify(command))); await flush();
  assert.equal(lateExecution, false, 'stopped pollers cannot execute a late fetch response');
  let completeOldFetch;
  const restarted = harness(() => new Promise(resolve => { completeOldFetch = resolve; }));
  let staleExecution = false;
  restarted.api.startPolling(); restarted.api.stopPolling();
  restarted.api.registerCommandHandler('rpa_flow', async () => { staleExecution = true; });
  restarted.api.startPolling();
  completeOldFetch(new Response(JSON.stringify(command))); await flush();
  assert.equal(staleExecution, false, 'a restarted poller must reject responses from its previous session');
  restarted.api.stopPolling();
  console.log('PASS command poller: full payload, serial execution, malformed/unknown boundaries, stop during fetch');
})().catch(error => { console.error(error); process.exitCode = 1; });

