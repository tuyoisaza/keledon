const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const { after, test } = require('node:test');
require('reflect-metadata');

const dataDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'keledon-mvp-store-api-'),
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
    () => store.createFlowDefinition({ name: 'Unscoped flow' }),
    /Company scope is required/,
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
  const definition = store.createFlowDefinition({
    companyId: 'company-a',
    name: 'Tenant flow',
  });
  const version = store.createFlowVersion(
    { flowDefinitionId: definition.id, version: 1, steps: [] },
    'db-actor',
    'company-a',
  );
  assert.equal(version.createdBy, 'db-actor');
  assert.throws(
    () =>
      store.createFlowVersion(
        { flowDefinitionId: definition.id, createdBy: 'forged-actor' },
        'db-actor',
        'company-a',
      ),
    /Unsupported request field/,
  );
  assert.throws(
    () => store.createFlowVersion({ flowDefinitionId: definition.id }, ''),
    /Current actor is required/,
  );
  assert.throws(
    () =>
      store.createFlowVersion(
        { flowDefinitionId: definition.id, version: 1 },
        'db-actor',
        'company-a',
      ),
    /Flow version already exists/,
  );
  assert.throws(
    () =>
      store.createFlowVersion(
        { flowDefinitionId: definition.id },
        'other-actor',
        'company-b',
      ),
    /Flow definition is unavailable/,
  );
  store.updateFlowVersion(version.id, { status: 'approved' }, 'company-a');
  assert.throws(
    () => store.updateFlowVersion(version.id, { steps: [{ type: 'submit' }] }, 'company-a'),
    /Only draft flow versions can be edited/,
  );
  assert.deepEqual(store.getFlowDefinitions('company-b'), []);
  assert.deepEqual(store.getFlowVersions('company-b'), []);
});

test('MVP controller passes the guard-populated actor, not body attribution', () => {
  const calls = [];
  const controller = new MvpDataController({
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
