// CRUD health must not collect or disclose arbitrary process logs/configuration.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

const common = new Proxy(
  {},
  {
    get: (_target, key) =>
      key === '__esModule' ? true : () => () => {},
  },
);
const filename = path.resolve(__dirname, '../../src/crud/crud.service.ts');
const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    experimentalDecorators: true,
    emitDecoratorMetadata: false,
  },
}).outputText;
const testModule = { exports: {} };
const isolatedConsole = { error: (...args) => args };
vm.runInNewContext(output, {
  module: testModule,
  exports: testModule.exports,
  Buffer,
  URL,
  process,
  Date,
  console: isolatedConsole,
  require: (name) => (name === '@nestjs/common' ? common : {}),
}, { filename });

async function main() {
  const { CrudService } = testModule.exports;
  assert.deepEqual(isolatedConsole.error('sentinel'), ['sentinel']);
  const service = Object.create(CrudService.prototype);
  const oldUrl = process.env.CLOUD_URL;
  const oldSecret = process.env.KELEDON_LAUNCH_SECRET;
  process.env.CLOUD_URL = 'https://cloud.example.invalid/path?token=private-fixture';
  process.env.KELEDON_LAUNCH_SECRET = 'private-fixture-secret';
  try {
    const health = await service.getHealth();
    const serialized = JSON.stringify(health);
    assert.equal(health.env.CLOUD_HOST, 'cloud.example.invalid');
    assert.equal('CLOUD_URL' in health.env, false);
    assert.equal('errors' in health, false);
    assert.equal(serialized.includes('/path?token='), false);
    assert.equal(serialized.includes('private-fixture'), false);
    assert.equal(serialized.includes('sentinel'), false);
  } finally {
    if (oldUrl === undefined) delete process.env.CLOUD_URL;
    else process.env.CLOUD_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.KELEDON_LAUNCH_SECRET;
    else process.env.KELEDON_LAUNCH_SECRET = oldSecret;
  }
  process.stdout.write('CRUD health disclosure regression: PASS\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
