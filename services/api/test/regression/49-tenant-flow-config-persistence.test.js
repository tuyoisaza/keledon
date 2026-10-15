const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, emitDecoratorMetadata: true, esModuleInterop: true },
}).outputText, filename);
const { TenantFlowConfigService } = require('../../src/mvp/tenant-flow-config.service.ts');
const date = new Date('2026-01-01T00:00:00.000Z');
const definition = (id, companyId) => ({ id, companyId, interfaceId: null, name: id, description: null, category: 'case', status: 'active', intentTags: [], createdAt: date, updatedAt: date });
const version = (id, flowDefinitionId, status = 'draft') => ({ id, flowDefinitionId, version: 1, status, steps: [], createdBy: 'actor-a', createdAt: date, updatedAt: date });

function prisma(overrides = {}) {
  return {
    company: { findMany: async () => [{ id: 'company-a' }] },
    tenantFlowConfigDefinition: {
      findMany: async () => [], findFirst: async () => null, findUnique: async () => null,
      create: async ({ data }) => ({ ...definition('flow-new', data.companyId), ...data }),
      createMany: async () => ({ count: 0 }), count: async () => 0,
    },
    tenantFlowConfigVersion: {
      findMany: async () => [], findFirst: async () => null, findUnique: async () => null,
      create: async ({ data }) => ({ ...version('version-new', data.flowDefinitionId), ...data }),
      createMany: async () => ({ count: 0 }), updateMany: async () => ({ count: 0 }),
    },
    tenantFlowConfigPermission: { findMany: async () => [], upsert: async () => ({}) , createMany: async () => ({ count: 0 }) },
    tenantIntentFlowConfigMapping: { findMany: async () => [], upsert: async () => ({}) , createMany: async () => ({ count: 0 }) },
    $transaction: async (operations) => Promise.all(operations),
    ...overrides,
  };
}

test('flow definition reads are tenant filtered and creation requires server-bound company scope', async () => {
  let queried;
  const db = prisma({ tenantFlowConfigDefinition: {
    findMany: async (query) => { queried = query; return [definition('flow-a', 'company-a')]; },
    create: async ({ data }) => ({ ...definition('flow-new', data.companyId), ...data }),
  } });
  const service = new TenantFlowConfigService(db);
  assert.equal((await service.getFlowDefinitions('company-a'))[0].companyId, 'company-a');
  assert.deepEqual(queried.where, { companyId: 'company-a' });
  await assert.rejects(service.createFlowDefinition({ name: 'unscoped' }), /Company scope is required/);
  const created = await service.createFlowDefinition({ companyId: 'company-a', name: 'new' });
  assert.equal(created.companyId, 'company-a');
});

test('flow version creation records the authenticated actor and maps uniqueness conflicts', async () => {
  let submitted;
  const db = prisma({ tenantFlowConfigDefinition: { findFirst: async () => definition('flow-a', 'company-a') },
    tenantFlowConfigVersion: { create: async ({ data }) => { submitted = data; return version('version-a', data.flowDefinitionId); } } });
  const service = new TenantFlowConfigService(db);
  const result = await service.createFlowVersion({ flowDefinitionId: 'flow-a', steps: [] }, 'actor-a', 'company-a');
  assert.equal(submitted.createdBy, 'actor-a');
  assert.equal(result.createdBy, 'actor-a');
  const conflict = prisma({ tenantFlowConfigDefinition: { findFirst: async () => definition('flow-a', 'company-a') },
    tenantFlowConfigVersion: { create: async () => { throw Object.assign(new Error('duplicate'), { code: 'P2002' }); } } });
  await assert.rejects(new TenantFlowConfigService(conflict).createFlowVersion({ flowDefinitionId: 'flow-a' }, 'actor-a'), /Flow version already exists/);
});

test('tenant-owned flow definitions cannot be reassigned after provisioning', async () => {
  const db = prisma({ tenantFlowConfigDefinition: {
    findFirst: async () => definition('flow-a', 'company-a'),
    updateMany: async () => { throw new Error('must not write'); },
  } });
  await assert.rejects(
    new TenantFlowConfigService(db).updateFlowDefinition('flow-a', { companyId: 'company-b' }),
    /cannot change after assignment/,
  );
});

test('flow edits are guarded atomically against approved versions and tenant changes', async () => {
  let query;
  const draft = version('version-a', 'flow-a', 'draft');
  const approved = version('version-a', 'flow-a', 'approved');
  const db = prisma({ tenantFlowConfigVersion: {
    findFirst: async () => draft,
    updateMany: async (value) => { query = value; return { count: 0 }; },
    findUnique: async () => approved,
  } });
  await assert.rejects(new TenantFlowConfigService(db).updateFlowVersion('version-a', { steps: [] }, 'company-a'), /Only draft flow versions/);
  assert.deepEqual(query.where, { id: 'version-a', status: 'draft', flowDefinition: { companyId: 'company-a' } });
});

test('permission upsert rejects cross-company flow references before writes', async () => {
  let writes = 0;
  const db = prisma({ tenantFlowConfigDefinition: { findMany: async () => [] }, $transaction: async () => { writes++; } });
  await assert.rejects(new TenantFlowConfigService(db).upsertTenantFlowPermissions([
    { companyId: 'company-a', flowDefinitionId: 'foreign-flow', isEnabled: true },
  ], 'company-a'), /unavailable for this company/);
  assert.equal(writes, 0);
});

test('legacy importer preserves unassigned definitions and optional historical creator idempotently', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keledon-flow-import-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  process.env.KELEDON_DATA_DIR = dataDir;
  fs.writeFileSync(path.join(dataDir, 'mvp-store.json'), JSON.stringify({
    flowDefinitions: [{ id: 'legacy-flow', name: 'Legacy', intentTags: [], createdAt: date.toISOString(), updatedAt: date.toISOString() }],
    flowVersions: [{ id: 'legacy-version', flowDefinitionId: 'legacy-flow', version: 2, status: 'approved', steps: [], createdAt: date.toISOString(), updatedAt: date.toISOString() }],
  }));
  let importedDefinitions; let importedVersions;
  const db = prisma({
    tenantFlowConfigDefinition: {
      findMany: async () => [{ id: 'legacy-flow', companyId: null }],
      createMany: async ({ data, skipDuplicates }) => { importedDefinitions = { data, skipDuplicates }; return { count: data.length }; },
    },
    tenantFlowConfigVersion: { createMany: async ({ data, skipDuplicates }) => { importedVersions = { data, skipDuplicates }; return { count: data.length }; } },
  });
  await new TenantFlowConfigService(db).onModuleInit();
  assert.equal(importedDefinitions.data[0].companyId, null);
  assert.equal(importedDefinitions.skipDuplicates, true);
  assert.equal(importedVersions.data[0].createdBy, null);
  assert.equal(importedVersions.skipDuplicates, true);
});

test('legacy import trusts persisted flow ownership instead of stale JSON company hints', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keledon-flow-owner-import-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  process.env.KELEDON_DATA_DIR = dataDir;
  fs.writeFileSync(path.join(dataDir, 'mvp-store.json'), JSON.stringify({
    flowDefinitions: [{ id: 'legacy-flow', companyId: 'company-b', name: 'Legacy', intentTags: [], createdAt: date.toISOString(), updatedAt: date.toISOString() }],
    tenantFlowPermissions: [{ id: 'permission-b', companyId: 'company-b', flowDefinitionId: 'legacy-flow', isEnabled: true, createdAt: date.toISOString(), updatedAt: date.toISOString() }],
  }));
  let permissionWrites = 0;
  const db = prisma({
    company: { findMany: async () => [{ id: 'company-a' }, { id: 'company-b' }] },
    tenantFlowConfigDefinition: {
      createMany: async () => ({ count: 0 }),
      findMany: async () => [{ id: 'legacy-flow', companyId: 'company-a' }],
    },
    tenantFlowConfigPermission: { createMany: async () => { permissionWrites++; return { count: 1 }; } },
  });
  await new TenantFlowConfigService(db).onModuleInit();
  assert.equal(permissionWrites, 0, 'legacy permission cannot use a stale company assignment');
});

test('API and Cloud schemas enforce tenant-matched flow permissions in PostgreSQL', () => {
  const repositoryRoot = path.resolve(__dirname, '../../../..');
  for (const serviceRoot of ['services/api', 'cloud']) {
    const schema = fs.readFileSync(path.join(repositoryRoot, serviceRoot, 'prisma/schema.prisma'), 'utf8');
    const migration = fs.readFileSync(path.join(repositoryRoot, serviceRoot, 'prisma/migrations/20261015000000_tenant_flow_config_persistence/migration.sql'), 'utf8');
    const definitionModel = schema.match(/model TenantFlowConfigDefinition \{([\s\S]*?)\n\}/)?.[1] || '';
    const permissionModel = schema.match(/model TenantFlowConfigPermission \{([\s\S]*?)\n\}/)?.[1] || '';
    assert.match(definitionModel, /@@unique\(\[id, companyId\]\)/);
    assert.match(definitionModel, /onDelete: Cascade/);
    assert.match(permissionModel, /fields: \[flowDefinitionId, companyId\], references: \[id, companyId\]/);
    assert.match(migration, /FOREIGN KEY \("flowDefinitionId", "companyId"\) REFERENCES "tenant_flow_config_definitions"\("id", "companyId"\) ON DELETE CASCADE/);
    assert.doesNotMatch(migration, /tenant_flow_config_permissions_companyId_fkey/);
  }
});
