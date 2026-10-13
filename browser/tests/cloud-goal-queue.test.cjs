const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/cloud-goal-queue.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(compiled, sandbox);
const { CloudGoalQueue } = sandbox.exports;
(async () => {
  const queue = new CloudGoalQueue(2);
  let release;
  const events = [];
  const first = queue.run('a', async () => { events.push('a-start'); await new Promise(resolve => { release = resolve; }); events.push('a-end'); });
  assert.equal(queue.run('a', async () => { throw new Error('duplicate executed'); }), first);
  const second = queue.run('b', async () => { events.push('b'); throw new Error('synthetic failure'); });
  const secondFailure = assert.rejects(second, /synthetic failure/);
  await assert.rejects(queue.run('c', async () => {}), /queue is full/);
  assert.deepEqual(events, ['a-start']);
  release(); await first; await secondFailure;
  await queue.run('c', async () => { events.push('c'); });
  assert.deepEqual(events, ['a-start', 'a-end', 'b', 'c']);
  await queue.run('a', async () => { events.push('a-retry'); });
  assert.equal(events.at(-1), 'a-retry');
  const cancelled = queue.run('cancelled', async () => { throw new Error('should not execute'); });
  queue.invalidate();
  await assert.rejects(cancelled, /cancelled after disconnect/);
  console.log('PASS cloud goal queue: serial goals, pending dedup, cap, failure recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });
