const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '../src/lib/request-sequence.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, {
  module: loaded,
  exports: loaded.exports,
});

const sequence = loaded.exports.createRequestSequence();
const firstLoad = sequence.begin();
const secondLoad = sequence.begin();
assert.equal(sequence.isCurrent(firstLoad), false);
assert.equal(sequence.isCurrent(secondLoad), true);

const pendingSave = sequence.begin();
sequence.invalidate();
assert.equal(sequence.isCurrent(pendingSave), false);

console.log('PASS team-interface request sequence: stale team loads and saves are invalidated when selection changes or the modal closes.');
