const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

function load(logs) {
  const filename = path.resolve(__dirname, '../../src/tts/tts.service.ts');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  const secretFailure = new Error('provider response echoed synthetic-secret');
  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    AbortSignal,
    Buffer,
    process,
    console: {
      log: (...args) => logs.push(args.join(' ')),
      error: (...args) => logs.push(args.join(' ')),
    },
    require: (name) => {
      if (name === '@nestjs/common') return { Injectable: () => () => undefined };
      if (name === 'events') return require('events');
      if (name === 'stream') return require('stream');
      if (name === '../llm/runtime-ai-budget') return { runtimeAiBudget: {} };
      if (name === './tts-language')
        return { detectLanguage: () => 'en', getSpeachesVoice: () => 'voice', getSpeachesVoiceForLanguage: () => 'voice' };
      if (name === './tts-utils') return { estimateDuration: () => 1 };
      if (name === './tts-http-providers') return {};
      if (name === 'elevenlabs')
        return {
          ElevenLabsClient: class {
            constructor() {
              this.textToSpeech = { convertAsStream: async () => { throw secretFailure; } };
            }
          },
        };
      if (name === 'openai')
        return {
          OpenAI: class {
            constructor() {
              this.audio = { speech: { create: async () => { throw secretFailure; } } };
            }
          },
        };
      return {};
    },
  });
  return loaded.exports.TTSService;
}

async function main() {
  const logs = [];
  const TTSService = load(logs);
  const service = new TTSService({ getTTSConfig: () => ({ apiKey: 'configured-key', voiceId: 'voice' }) }, {});
  const options = { interruptible: true };
  assert.equal((await service.speakWithElevenLabs('hello', options)).error, 'ElevenLabs provider request failed');
  assert.equal((await service.streamWithElevenLabs('hello', () => {}, options)).error, 'ElevenLabs provider request failed');
  assert.equal((await service.speakWithOpenAI('hello', options)).error, 'OpenAI TTS provider request failed');
  assert.ok(!logs.join('\n').includes('synthetic-secret'));
  console.log('PASS TTS SDK error redaction: ElevenLabs/OpenAI upstream errors remain generic in API results and logs.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
