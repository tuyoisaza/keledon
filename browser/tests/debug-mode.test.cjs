const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.join(__dirname, '../src/debug-mode.ts');
const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(output, { module: loaded, exports: loaded.exports });
const { resolveDebugMode } = loaded.exports;

assert.equal(resolveDebugMode(false), true, 'development defaults debug on');
assert.equal(resolveDebugMode(false, 'false'), false, 'development can opt out');
assert.equal(resolveDebugMode(true), false, 'production defaults debug off');
assert.equal(resolveDebugMode(true, 'true'), true, 'explicit local configuration can enable debug');
assert.equal(resolveDebugMode(false, 'true'), true);
console.log('Browser debug-mode environment defaults passed.');
