const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '../../../..');
const guards = [
  'services/api/src/guards/crud-access.guard.ts',
  'cloud/src/guards/crud-access.guard.ts',
];
const controllers = [
  'services/api/src/crud/crud.controller.ts',
  'cloud/src/crud/crud.controller.ts',
];
const auditServices = [
  'services/api/src/crud/crud-audit.service.ts',
  'cloud/src/crud/crud-audit.service.ts',
];
const interceptors = [
  'services/api/src/interceptors/audit.interceptor.ts',
  'cloud/src/interceptors/audit.interceptor.ts',
];

test('API and Cloud CRUD guards protect audit integrity and password hashes', () => {
  for (const relativePath of guards) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    const userFields = source.match(/users:\s*\[([^\]]*)\]/)?.[1];

    assert.ok(userFields, `${relativePath} must define a user field allowlist`);
    assert.doesNotMatch(userFields, /passwordHash/);
    const sessionPolicy = source.match(/sessions:\s*([\s\S]*?)\s*knowledge:/)?.[1];
    assert.ok(sessionPolicy, `${relativePath} must define the Session request contract`);
    assert.match(sessionPolicy, /createSession/);
    assert.match(sessionPolicy, /updateSession/);
    assert.match(sessionPolicy, /metadata/);
    assert.doesNotMatch(
      sessionPolicy,
      /startedAt|endedAt|transcript|summary/,
      `${relativePath} must reject fields outside the Prisma Session contract`,
    );
    assert.match(
      source,
      /resource\s*===\s*['"]audit-logs['"]\s*&&\s*req\.method\s*!==\s*['"]GET['"]\s*&&\s*!trustedAuditExport\s*\)\s*return\s+deny\(\)/,
      `${relativePath} must keep audit logs append-only except the dedicated guarded export event`,
    );
    assert.match(source, /superadmin\s*&&\s*handler\s*===\s*['"]recordAuditExport['"]\s*&&\s*req\.method\s*===\s*['"]POST['"]/);
    assert.doesNotMatch(source, /handler\s*===\s*['"]webhook['"]/);
  }
  for (const relativePath of controllers) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /@Post\(['"]audit-logs['"]\)/,
      `${relativePath} must not expose a general audit-log write route`,
    );
    assert.match(source, /@Post\(['"]audit-logs\/export-page['"]\)/);
    assert.match(source, /recordAuditPageExport\(req\.actor, input\)/);
    assert.doesNotMatch(
      source,
      /createAuditLog\s*\(/,
      `${relativePath} must leave audit writes to trusted domain services`,
    );
  }
  for (const relativePath of auditServices) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.match(source, /async recordPageExport\([\s\S]{0,180}companyId:\s*string\s*\|\s*null[\s\S]{0,80}input:\s*unknown/);
    assert.match(source, /AUDIT_EXPORT_REQUESTED/);
    assert.match(source, /filterKeys/);
  }
  for (const relativePath of interceptors) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.match(source, /url === ['"]\/api\/crud\/audit-logs\/export-page['"]/);
  }
});
