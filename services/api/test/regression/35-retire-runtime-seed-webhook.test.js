const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '../../../..');
const backends = [
  {
    name: 'API',
    controller: 'services/api/src/crud/crud.controller.ts',
    guard: 'services/api/src/guards/crud-access.guard.ts',
    service: 'services/api/src/crud/crud.service.ts',
    module: 'services/api/src/crud/crud.module.ts',
  },
  {
    name: 'Cloud',
    controller: 'cloud/src/crud/crud.controller.ts',
    guard: 'cloud/src/guards/crud-access.guard.ts',
    service: 'cloud/src/crud/crud.service.ts',
    module: 'cloud/src/crud/crud.module.ts',
  },
];

test('legacy runtime seed and migration endpoints fail closed in API and Cloud', () => {
  for (const backend of backends) {
    const controller = fs.readFileSync(
      path.join(repoRoot, backend.controller),
      'utf8',
    );
    const guard = fs.readFileSync(path.join(repoRoot, backend.guard), 'utf8');
    const service = fs.readFileSync(path.join(repoRoot, backend.service), 'utf8');
    const module = fs.readFileSync(path.join(repoRoot, backend.module), 'utf8');

    assert.match(controller, /@UseGuards\(CrudAccessGuard\)/, `${backend.name} CRUD endpoints must keep the DB-derived guard`);
    assert.match(
      controller,
      /@Post\('migrate'\)[\s\S]{0,180}throw new GoneException\([\s\S]*versioned Prisma migrations/i,
      `${backend.name} runtime migration must be retired`,
    );
    assert.match(
      controller,
      /@Post\('seed'\)[\s\S]{0,180}throw new GoneException\([\s\S]*isolated synthetic regression fixtures/i,
      `${backend.name} file-based seed endpoint must be retired`,
    );
    assert.doesNotMatch(controller, /@Post\('webhook'\)|WebhookGuard|@Public\(\)/);
    assert.doesNotMatch(controller, /writeFileSync|readFileSync|CREATE TABLE IF NOT EXISTS|\$executeRaw|seedFromCrudJson/);
    assert.doesNotMatch(guard, /handler\s*===\s*['"]webhook['"]|webhook.*bypass|shared-secret.*guard/i);
    assert.doesNotMatch(service, /CrudSeedService|seedFromCrudJson/);
    assert.doesNotMatch(module, /CrudSeedService|CrudMigrationService|WebhookGuard/);
  }

  for (const retiredFile of [
    'services/api/src/crud/crud-seed.service.ts',
    'services/api/src/crud/crud-migration.service.ts',
    'services/api/src/guards/webhook.guard.ts',
    'cloud/src/crud/crud-seed.service.ts',
    'cloud/src/crud/crud-migration.service.ts',
    'cloud/src/guards/webhook.guard.ts',
  ]) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, retiredFile)),
      false,
      `${retiredFile} must not retain an alternate runtime write path`,
    );
  }
});
