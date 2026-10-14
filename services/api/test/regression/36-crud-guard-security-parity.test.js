const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '../../../..');
const guards = [
  'services/api/src/guards/crud-access.guard.ts',
  'cloud/src/guards/crud-access.guard.ts',
];

test('API and Cloud CRUD guards protect audit integrity and password hashes', () => {
  for (const relativePath of guards) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    const userFields = source.match(/users:\s*\[([^\]]*)\]/)?.[1];

    assert.ok(userFields, `${relativePath} must define a user field allowlist`);
    assert.doesNotMatch(userFields, /passwordHash/);
    assert.match(
      source,
      /resource\s*===\s*['"]audit-logs['"]\s*&&\s*req\.method\s*!==\s*['"]GET['"]\s*\)\s*return\s+deny\(\)/,
      `${relativePath} must keep audit logs append-only through general CRUD`,
    );
    assert.doesNotMatch(source, /handler\s*===\s*['"]webhook['"]/);
  }
});
