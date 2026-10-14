const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

function loadDecisionEngine(filename, logs) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  class Logger {
    error(...args) {
      logs.push(args.join(' '));
    }
  }
  class Dependency {}
  const common = {
    Injectable: () => () => undefined,
    Inject: () => () => undefined,
    Logger,
    Optional: () => () => undefined,
    forwardRef: (factory) => factory,
  };

  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    console: {
      error: (...args) => logs.push(args.join(' ')),
    },
    process,
    require: (name) => {
      if (name === '@nestjs/common') return common;
      if (name === 'uuid') return { v4: () => 'synthetic-decision-id' };
      if (name === '@opentelemetry/api')
        return { SpanStatusCode: {}, trace: { getTracer: () => ({}) } };
      if (name.endsWith('/decision-engine.methods'))
        return {
          DecisionContextMethods: Dependency,
          DecisionFlowMethods: Dependency,
          DecisionPolicyMethods: Dependency,
        };
      if (name.endsWith('/trace-model')) return { KELEDON_TRACE_SPANS: {} };
      return new Proxy({}, { get: () => Dependency });
    },
  });

  return loaded.exports.DecisionEngineService;
}

async function main() {
  const root = path.resolve(__dirname, '../../../..');
  const sourcePaths = [
    path.join(root, 'services/api/src/services/decision-engine.service.ts'),
    path.join(root, 'cloud/src/services/decision-engine.service.ts'),
  ];
  const privateError = 'synthetic-provider-secret and internal URL';

  for (const sourcePath of sourcePaths) {
    const logs = [];
    const DecisionEngineService = loadDecisionEngine(sourcePath, logs);
    const service = new DecisionEngineService(
      { getSession: async () => { throw new Error(privateError); } },
      {},
    );
    const result = await service.processTextInput(
      'synthetic-session',
      'synthetic customer transcript',
      0.9,
      'test-provider',
    );
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(privateError));
    assert.ok(!logs.join('\n').includes(privateError));
    assert.equal(result.command.say.text, 'Decision processing failed. Please try again later.');
    assert.equal(result.context.error, 'Decision processing failed');
  }

  console.log('PASS Decision Engine redaction: API and Cloud suppress internal error detail in logs and voice responses.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
