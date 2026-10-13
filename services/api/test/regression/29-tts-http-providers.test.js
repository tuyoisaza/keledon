const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

function load(fetch) {
  const sourcePath = path.resolve(
    __dirname,
    '../../src/tts/tts-http-providers.ts',
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
    Buffer,
    Date,
    AbortSignal,
    console: { log() {}, error() {} },
    fetch,
    require: (name) => {
      if (name === './tts-language') return { detectLanguage: () => 'es' };
      if (name === './tts-utils')
        return { estimateDuration: (bytes) => bytes / 1000 };
      return {};
    },
  });
  return loaded.exports;
}

async function main() {
  const requests = [];
  const providers = load(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, arrayBuffer: async () => Buffer.from([1, 2, 3]) };
  });
  const kokoro = await providers.speakWithKokoro(
    'Hola',
    'https://speech.example',
    'voice-a',
  );
  assert.equal(requests[0].url, 'https://speech.example/v1/audio/speech');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.signal.aborted, false);
  assert.equal(kokoro.audioData.length, 3);

  const speaches = await providers.speakWithSpeaches(
    'Hola',
    'https://speech.example/',
    'synthetic-key',
    'voice-b',
  );
  assert.equal(requests.length, 2, 'provider request uses one bounded attempt');
  assert.equal(requests[1].url, 'https://speech.example/v1/audio/speech');
  assert.equal(
    requests[1].options.headers.Authorization,
    'Bearer synthetic-key',
  );
  assert.equal(JSON.parse(requests[1].options.body).response_format, 'mp3');
  assert.equal(speaches.audioData.length, 3);
  console.log(
    'PASS TTS transport extraction: endpoint normalization, one timed mocked request, provider payload and credential header.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
