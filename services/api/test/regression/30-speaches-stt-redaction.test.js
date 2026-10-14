const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

function load(fetch, logs) {
  const sourcePath = path.resolve(
    __dirname,
    '../../src/voice/providers/stt/speaches-stt.adapter.ts',
  );
  const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    AbortSignal,
    Blob,
    Buffer,
    FormData,
    fetch,
    console,
    require: (name) =>
      name === '@nestjs/common'
        ? {
            Logger: class {
              log(message) {
                logs.push(String(message));
              }
            },
          }
        : {},
  });
  return loaded.exports.SpeachesSttAdapter;
}

async function main() {
  const providerBody = 'synthetic upstream secret response';
  const logs = [];
  const Adapter = load(
    async () => ({ ok: false, status: 502, text: async () => providerBody }),
    logs,
  );
  const adapter = new Adapter();
  await adapter.initialize({
    baseUrl: 'https://speech.example/?token=synthetic-url-secret',
    apiKey: 'synthetic-api-key',
  });
  await assert.rejects(adapter.transcribe(Buffer.from([1, 2, 3])), /HTTP 502/);
  assert.ok(!logs.join('\n').includes('synthetic-url-secret'));
  assert.ok(!logs.join('\n').includes('synthetic-api-key'));

  const unavailable = new (load(async () => {
    throw new Error('request failed https://speech.example/?token=network-secret');
  }, []))();
  await unavailable.initialize({
    baseUrl: 'https://speech.example',
    apiKey: 'key',
  });
  await assert.rejects(
    unavailable.transcribe(Buffer.from([1, 2, 3])),
    /provider request failed/,
  );
  console.log('PASS Speaches STT error redaction: no upstream body, URL or credential in initialization logs or propagated request errors.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
