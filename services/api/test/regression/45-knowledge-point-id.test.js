const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const testModule = { exports: {} };
const sourcePath = path.resolve(
  __dirname,
  '../../src/knowledge/knowledge-vector-utils.ts',
);
const source = fs.readFileSync(sourcePath, 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

vm.runInNewContext(code, {
  module: testModule,
  exports: testModule.exports,
  require: (name) => (name === 'crypto' ? require('node:crypto') : {}),
});

function main() {
  const { getChunkPointId } = testModule.exports;
  const first = getChunkPointId('document-a', 0);
  assert.match(
    first,
    /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.equal(first, getChunkPointId('document-a', 0));
  assert.notEqual(first, getChunkPointId('document-a', 1));
  console.log('PASS knowledge chunk point IDs are deterministic Qdrant-compatible UUIDs.');
}

main();
