const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const { after, test } = require('node:test');
require('reflect-metadata');

const dataDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'keledon-mvp-store-cloud-'),
);
process.env.KELEDON_DATA_DIR = dataDir;
require.extensions['.ts'] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
};
const { MvpStoreService } = require('../../src/mvp/mvp-store.service.ts');
const {
  MvpDataController,
} = require('../../src/controllers/mvp-data.controller.ts');

after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('MVP non-flow write routes reject server-owned fields and unsupported types', () => {
  const store = new MvpStoreService();
  const iface = store.createInterface({ name: 'Primary' });
  assert.throws(() => store.updateInterface(iface.id, { id: 'forged-id' }), /Unsupported request field/);
  assert.throws(() => store.createInterface({ capabilities: { rpa: 'yes' } }), /Invalid interface capabilities/);
  assert.throws(() => store.createKnowledgeDocument({ id: 'forged-id', content: 'x' }), /Unsupported request field/);
});

test('MVP controller passes the guard-populated actor, not body attribution', () => {
  const calls = [];
  const controller = new MvpDataController({
    createFlowVersion: () => { throw new Error('Flow writes must use durable storage'); },
  }, {
    createFlowVersion: (...args) => calls.push(args),
  });
  controller.createFlowVersion(
    { flowDefinitionId: 'flow-a', createdBy: 'forged-actor' },
    { user: { userId: 'current-db-actor', companyId: 'company-a' } },
  );
  assert.deepEqual(calls, [
    [
      { flowDefinitionId: 'flow-a', createdBy: 'forged-actor' },
      'current-db-actor',
      'company-a',
    ],
  ]);
});
