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

test('MVP write routes reject server-owned fields and unsupported input types', () => {
  const store = new MvpStoreService();
  const iface = store.createInterface({ name: 'Primary' });
  assert.throws(
    () => store.updateInterface(iface.id, { id: 'forged-id' }),
    /Unsupported request field/,
  );
  assert.throws(
    () => store.createInterface({ capabilities: { rpa: 'yes' } }),
    /Invalid interface capabilities/,
  );
  assert.throws(
    () => store.createFlowDefinition({ id: 'forged-id' }),
    /Unsupported request field/,
  );
  assert.throws(
    () => store.updateFlowVersion('flow-version', { createdBy: 'forged-user' }),
    /Unsupported request field/,
  );
  assert.throws(
    () =>
      store.upsertTenantFlowPermissions([
        {
          companyId: 'company-a',
          flowDefinitionId: 'flow-a',
          createdAt: 'forged',
        },
      ]),
    /Unsupported request field/,
  );
  assert.throws(
    () =>
      store.upsertTenantFlowPermissions([
        {
          companyId: 'company-a',
          flowDefinitionId: 'flow-a',
          isEnabled: 'true',
        },
      ]),
    /Invalid permission state/,
  );
  assert.throws(
    () =>
      store.upsertIntentFlowMapping({
        companyId: 'company-a',
        intent: 'claim',
        allowedFlowDefinitionIds: [42],
      }),
    /Invalid allowedFlowDefinitionIds/,
  );
  assert.throws(
    () => store.createKnowledgeDocument({ id: 'forged-id', content: 'x' }),
    /Unsupported request field/,
  );
});

test('MVP flow-version creator is supplied by the authenticated server context', () => {
  const store = new MvpStoreService();
  const version = store.createFlowVersion(
    { flowDefinitionId: 'flow-a', version: 1, steps: [] },
    'db-actor',
  );
  assert.equal(version.createdBy, 'db-actor');
  assert.throws(
    () =>
      store.createFlowVersion(
        { flowDefinitionId: 'flow-a', createdBy: 'forged-actor' },
        'db-actor',
      ),
    /Unsupported request field/,
  );
  assert.throws(
    () => store.createFlowVersion({ flowDefinitionId: 'flow-a' }, ''),
    /Current actor is required/,
  );
});

test('MVP controller passes the guard-populated actor, not body attribution', () => {
  const calls = [];
  const controller = new MvpDataController({
    createFlowVersion: (...args) => calls.push(args),
  });
  controller.createFlowVersion(
    { flowDefinitionId: 'flow-a', createdBy: 'forged-actor' },
    { user: { userId: 'current-db-actor' } },
  );
  assert.deepEqual(calls, [
    [
      { flowDefinitionId: 'flow-a', createdBy: 'forged-actor' },
      'current-db-actor',
    ],
  ]);
});
