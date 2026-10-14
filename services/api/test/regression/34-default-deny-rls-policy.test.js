const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '../../../..');
const sqlPaths = [
  'services/api/supabase-schema.sql',
  'cloud/supabase-schema.sql',
  'services/api/migrations/autogen/001_baseline_schema.sql',
  'cloud/migrations/autogen/001_baseline_schema.sql',
  'services/api/migrations/add_knowledge_base.sql',
  'cloud/migrations/add_knowledge_base.sql',
  'services/api/migrations/add_users_table.sql',
  'cloud/migrations/add_users_table.sql',
  'services/api/migrations/add_team_interfaces.sql',
  'cloud/migrations/add_team_interfaces.sql',
  'services/api/migrations/canonical_sessions_schema.sql',
  'cloud/migrations/canonical_sessions_schema.sql',
  'services/api/rbac-users-roles-setup.sql',
  'cloud/rbac-users-roles-setup.sql',
  'services/api/rbac-complete-setup.sql',
  'cloud/rbac-complete-setup.sql',
  'services/api/create-superadmin.sql',
  'cloud/create-superadmin.sql',
  'services/api/auth-user-trigger.sql',
  'cloud/auth-user-trigger.sql',
  'services/api/migrations/provision_superadmin.sql',
  'cloud/migrations/provision_superadmin.sql',
  'services/api/rbac-quick-setup.sql',
  'cloud/rbac-quick-setup.sql',
  'services/api/rbac-test-data-setup.sql',
  'cloud/rbac-test-data-setup.sql',
  'services/api/rbac-test-validation.sql',
  'cloud/rbac-test-validation.sql',
  'services/api/prisma/migrations/20261014000000_deny_unscoped_supabase_rls/migration.sql',
  'cloud/prisma/migrations/20261014000000_deny_unscoped_supabase_rls/migration.sql',
];
const mirrorPairs = [
  ['services/api/supabase-schema.sql', 'cloud/supabase-schema.sql'],
  ['services/api/migrations/autogen/001_baseline_schema.sql', 'cloud/migrations/autogen/001_baseline_schema.sql'],
  [
    'services/api/prisma/migrations/20261014000000_deny_unscoped_supabase_rls/migration.sql',
    'cloud/prisma/migrations/20261014000000_deny_unscoped_supabase_rls/migration.sql',
  ],
  ['services/api/scripts/create-users-v2.js', 'cloud/scripts/create-users-v2.js'],
  ['services/api/scripts/seed_sessions.js', 'cloud/scripts/seed_sessions.js'],
  ['services/api/scripts/seed_flow_catalog.js', 'cloud/scripts/seed_flow_catalog.js'],
  ['services/api/scripts/seed_provider_catalog.js', 'cloud/scripts/seed_provider_catalog.js'],
  ['services/api/rbac-users-roles-setup.sql', 'cloud/rbac-users-roles-setup.sql'],
  ['services/api/rbac-complete-setup.sql', 'cloud/rbac-complete-setup.sql'],
  ['services/api/create-superadmin.sql', 'cloud/create-superadmin.sql'],
  ['services/api/auth-user-trigger.sql', 'cloud/auth-user-trigger.sql'],
  ['services/api/migrations/provision_superadmin.sql', 'cloud/migrations/provision_superadmin.sql'],
  ['services/api/rbac-quick-setup.sql', 'cloud/rbac-quick-setup.sql'],
  ['services/api/rbac-test-data-setup.sql', 'cloud/rbac-test-data-setup.sql'],
  ['services/api/rbac-test-validation.sql', 'cloud/rbac-test-validation.sql'],
];

test('SQL setup and synthetic user provisioning enforce safe Supabase defaults', () => {
  for (const relativePath of sqlPaths) {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.doesNotMatch(
      source,
      /CREATE\s+POLICY\s+["'](?:Allow all for |Enable read access for authenticated users|Enable all access for superadmins)[\s\S]*?;/i,
      `${relativePath} must not create an unscoped Supabase policy`,
    );
    assert.doesNotMatch(
      source,
      /CREATE\s+POLICY\b[\s\S]*?USING\s*\(\s*true\s*\)/i,
      `${relativePath} must not grant a true-valued RLS policy`,
    );
    assert.doesNotMatch(
      source,
      /INSERT\s+INTO\s+(?:public\.)?users\b[\s\S]*?\b(?:admin|coordinator|superadmin)\b/i,
      `${relativePath} must not seed an elevated user account`,
    );
  }

  const migration = fs.readFileSync(
    path.join(
      repoRoot,
      'services/api/prisma/migrations/20261014000000_deny_unscoped_supabase_rls/migration.sql',
    ),
    'utf8',
  );
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /DROP POLICY IF EXISTS/i);
  assert.match(migration, /pg_policies/i);
  assert.match(migration, /_prisma_migrations/);
  assert.match(migration, /pg_extension/i, 'application RLS sweep must skip extension-owned tables');

  for (const [apiPath, cloudPath] of mirrorPairs) {
    assert.equal(
      fs.readFileSync(path.join(repoRoot, apiPath), 'utf8'),
      fs.readFileSync(path.join(repoRoot, cloudPath), 'utf8'),
      `${apiPath} and ${cloudPath} must stay aligned`,
    );
  }

  for (const scriptPath of ['services/api/scripts/create-users-v2.js', 'cloud/scripts/create-users-v2.js']) {
    const script = fs.readFileSync(path.join(repoRoot, scriptPath), 'utf8');
    assert.match(script, /KELEDON_ALLOW_SYNTHETIC_USER_SEED/);
    assert.match(script, /KELEDON_SEED_ALLOWED_SUPABASE_URL/);
    assert.match(script, /example\.test/);
    assert.match(script, /role:\s*'user'/);
    assert.match(script, /select\('id, role'\)/);
    assert.match(script, /if\s*\(profile\)[\s\S]*profile\.role\s*!==\s*'user'/);
    assert.doesNotMatch(script, /role:\s*'admin'|password:\s*['"][^'"]+['"]/i);
  }

  const authSync = fs.readFileSync(path.join(repoRoot, 'services/api/auth-user-trigger.sql'), 'utf8');
  assert.match(authSync, /'user'/);
  assert.match(authSync, /SECURITY\s+DEFINER[\s\S]*SET\s+search_path\s*=\s*pg_catalog,\s*pg_temp/i);
  assert.doesNotMatch(authSync, /CASE\s+WHEN[\s\S]*superadmin|UPDATE\s+users\s+SET\s+role\s*=\s*'superadmin'/i);

  for (const retiredPath of [
    'services/api/rbac-users-roles-setup.sql',
    'services/api/rbac-complete-setup.sql',
    'services/api/migrations/provision_superadmin.sql',
    'services/api/create-superadmin.sql',
    'services/api/rbac-quick-setup.sql',
    'services/api/rbac-test-data-setup.sql',
    'services/api/rbac-test-validation.sql',
  ]) {
    assert.match(
      fs.readFileSync(path.join(repoRoot, retiredPath), 'utf8'),
      /RAISE\s+EXCEPTION[\s\S]*retired/i,
      `${retiredPath} must fail closed`,
    );
  }

  for (const scriptPath of ['services/api/scripts/seed_sessions.js', 'services/api/scripts/seed_flow_catalog.js']) {
    assert.match(
      fs.readFileSync(path.join(repoRoot, scriptPath), 'utf8'),
      /throw new Error[\s\S]*retired/i,
      `${scriptPath} must fail closed`,
    );
  }
  const providerSeed = fs.readFileSync(path.join(repoRoot, 'services/api/scripts/seed_provider_catalog.js'), 'utf8');
  assert.match(providerSeed, /KELEDON_ALLOW_PROVIDER_CATALOG_SEED/);
  assert.match(providerSeed, /KELEDON_SEED_ALLOWED_SUPABASE_URL/);
  assert.match(providerSeed, /NODE_ENV\s*===\s*'production'/);

  const setupGuide = fs.readFileSync(path.join(repoRoot, 'RBAC_TEST_SETUP_GUIDE.md'), 'utf8');
  assert.match(setupGuide, /retired/i);
  assert.doesNotMatch(setupGuide, /thetboard@gmail\.com|pepsi\.admin@pepsico\.com|stellantis\.admin@stellantis\.com/i);
});
