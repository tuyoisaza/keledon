const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const schema = fs.readFileSync(
  path.join(repoRoot, 'services/api/prisma/schema.prisma'),
  'utf8',
);
const matrix = fs.readFileSync(path.join(repoRoot, 'CRUD_MATRIX.md'), 'utf8');
const crudGuard = fs.readFileSync(
  path.join(repoRoot, 'services/api/src/guards/crud-access.guard.ts'),
  'utf8',
);
const mvpScopeGuard = fs.readFileSync(
  path.join(repoRoot, 'services/api/src/guards/resource-scope.guard.ts'),
  'utf8',
);
const webRouter = fs.readFileSync(
  path.join(repoRoot, 'services/web/src/AppRouter.tsx'),
  'utf8',
);
const legacyInterfacesManager = path.join(
  repoRoot,
  'services/web/src/components/flows/InterfacesManager.tsx',
);

function tableRows(section) {
  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length > 1);
}

const prismaModels = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(
  (match) => match[1],
);
const modelSectionStart = matrix.indexOf('## Model-to-surface inventory');
assert.notEqual(modelSectionStart, -1, 'CRUD matrix must include model inventory');
const modelSection = matrix.slice(modelSectionStart);
const modelTableStart = modelSection.indexOf('| Prisma model |');
assert.notEqual(modelTableStart, -1, 'CRUD matrix must include model-to-surface table');
const inventoryRows = tableRows(modelSection.slice(modelTableStart));
const documentedModels = inventoryRows.slice(1).map((row) => row[0]);

assert.equal(inventoryRows[0].length, 3, 'model inventory retains its three-column schema');
assert.ok(
  inventoryRows.slice(1).every((row) => row.length === 3),
  'every model inventory row must match the three-column header',
);
assert.equal(new Set(prismaModels).size, prismaModels.length, 'Prisma schema model names must be unique');
assert.equal(new Set(documentedModels).size, documentedModels.length, 'CRUD inventory model rows must be unique');
assert.deepEqual(
  [...documentedModels].sort(),
  [...prismaModels].sort(),
  'CRUD_MATRIX.md must account for every Prisma model exactly once',
);

const detailedStart = matrix.indexOf('## Model-role-surface capability matrix');
assert.notEqual(
  detailedStart,
  -1,
  'CRUD matrix must include the complete model-role-surface matrix',
);
const detailedEnd = matrix.indexOf('## Explicitly scoped exceptions', detailedStart);
assert.ok(
  detailedEnd > detailedStart,
  'model capability matrix must end before scoped exceptions',
);
const detailedSection = matrix.slice(detailedStart, detailedEnd);
const detailedTableStart = detailedSection.indexOf('| Prisma model | Role | Surface |');
assert.notEqual(
  detailedTableStart,
  -1,
  'CRUD matrix must include detailed model capability rows',
);
const detailedRows = tableRows(detailedSection.slice(detailedTableStart)).slice(1);
const roles = ['admin', 'agent', 'anonymous', 'coordinator', 'guest', 'superadmin', 'user'];
const surfaces = ['API', 'web'];
const expectedModelTuples = new Set(
  prismaModels.flatMap((model) =>
    roles.flatMap((role) => surfaces.map((surface) => `${model}|${role}|${surface}`)),
  ),
);
const actualModelTuples = detailedRows.map((row) => `${row[0]}|${row[1]}|${row[2]}`);
assert.equal(
  actualModelTuples.length,
  expectedModelTuples.size,
  'every Prisma-model/role/surface combination must appear once',
);
assert.equal(
  new Set(actualModelTuples).size,
  actualModelTuples.length,
  'model-role-surface rows must be unique',
);
assert.deepEqual([...actualModelTuples].sort(), [...expectedModelTuples].sort());
assert.ok(
  detailedRows.every((row) => row.length >= 15),
  'detailed rows must include operation, scope, enforcement, UI, deletion, evidence and status fields',
);
assert.ok(
  detailedRows.every((row) =>
    ['PASS', 'GAP', 'BLOCKED', 'NOT APPLICABLE', 'DECISION NEEDED'].includes(
      row[14],
    ),
  ),
  'each detailed row must have a recognized status',
);
const modelRowFor = (model, role, surface) =>
  detailedRows.find(
    (row) => row[0] === model && row[1] === role && row[2] === surface,
  );
for (const [model, role] of [
  ['Company', 'admin'],
  ['Company', 'superadmin'],
  ['User', 'admin'],
  ['User', 'superadmin'],
]) {
  const row = modelRowFor(model, role, 'API');
  assert.match(
    row[13],
    /UAT-045/,
    `${model}/${role}/API evidence must reference persisted UAT-045`,
  );
  assert.equal(
    row[14],
    'BLOCKED',
    `${model}/${role}/API must remain blocked until the complete operation matrix is tested`,
  );
}
for (const role of [
  'admin',
  'agent',
  'anonymous',
  'coordinator',
  'superadmin',
  'user',
]) {
  const row = modelRowFor('Device', role, 'API');
  assert.match(
    row[13],
    /UAT-047/,
    `Device/${role}/API evidence must cite Cloud/API pairing regression UAT-047`,
  );
  assert.equal(
    row[14],
    'BLOCKED',
    `Device/${role}/API remains blocked until live persistence/pairing acceptance`,
  );
}
assert.equal(
  modelRowFor('ManagedInterface', 'admin', 'API')[4],
  '-',
  'tenant managers cannot mutate the owner-hidden global interface catalog',
);
assert.equal(
  modelRowFor('ManagedInterface', 'superadmin', 'API')[4],
  'yes',
  'superadmin retains the legacy global catalog API',
);
assert.equal(
  modelRowFor('Flow', 'user', 'API')[4],
  '-',
  'ordinary users cannot mutate team flows',
);
assert.equal(
  modelRowFor('Flow', 'user', 'API')[6],
  'yes',
  'ordinary users can read team-scoped flows',
);
assert.equal(
  modelRowFor('Flow', 'admin', 'web')[4],
  'yes',
  'tenant managers have a Flow creation affordance',
);
assert.equal(
  modelRowFor('Flow', 'user', 'web')[4],
  '-',
  'ordinary users cannot access the manager Flow editor',
);
assert.equal(
  modelRowFor('TeamInterface', 'admin', 'API')[14],
  'NOT APPLICABLE',
  'team interfaces are a nested Team relation, not independent CRUD',
);
assert.equal(
  modelRowFor('CompanyCountry', 'superadmin', 'API')[14],
  'NOT APPLICABLE',
  'country membership is managed as a nested Company relation',
);
assert.equal(
  modelRowFor('Event', 'superadmin', 'API')[14],
  'NOT APPLICABLE',
  'operational events have no standalone CRUD surface',
);
for (const role of roles) {
  for (const surface of surfaces) {
    const row = modelRowFor('SubAgent', role, surface);
    assert.equal(
      row[14],
      'NOT APPLICABLE',
      `SubAgent ${role}/${surface} is session-bound runtime state, not standalone CRUD`,
    );
    assert.match(
      row[13],
      /persisted lifecycle and retention acceptance remain open/,
      `SubAgent ${role}/${surface} N/A must not imply persisted acceptance`,
    );
  }
}
assert.equal(
  modelRowFor('SubAgentRun', 'user', 'API')[4],
  'yes',
  'session-scoped flow execution may create operational runs',
);
assert.equal(
  modelRowFor('SubAgentRun', 'user', 'API')[7],
  'yes',
  'authorized flow execution may update its run outcome',
);
assert.equal(
  modelRowFor('FeatureFlag', 'superadmin', 'API')[14],
  'NOT APPLICABLE',
  'owner-approved dormant feature flags have no active product surface or role grant',
);
assert.match(
  matrix,
  /FeatureFlag \|.*owner approved dormancy; schema\/service retained without reachable app surface/,
  'the approved FeatureFlag decision must keep its schema while leaving it unreachable',
);
assert.equal(
  modelRowFor('AiPromptDefinition', 'superadmin', 'API')[7],
  'yes',
  'managed prompt updates remain superadmin-only',
);

const coreStart = matrix.indexOf('| Resource | Role | Surface |');
const exceptionsStart = matrix.indexOf('## Explicitly scoped exceptions');
assert.notEqual(coreStart, -1, 'CRUD matrix must include the capability matrix');
assert.ok(exceptionsStart > coreStart, 'capability matrix must precede scoped exceptions');
const coreEnd = matrix.indexOf('## Model-role-surface capability matrix', coreStart);
assert.ok(
  coreEnd > coreStart && coreEnd < exceptionsStart,
  'core matrix must precede model-level expansion',
);
const coreRows = tableRows(matrix.slice(coreStart, coreEnd)).slice(1);
const resources = [...new Set(coreRows.map((row) => row[0]))].sort();
const expected = new Set(
  resources.flatMap((resource) =>
    roles.flatMap((role) => surfaces.map((surface) => `${resource}|${role}|${surface}`)),
  ),
);
const actual = coreRows.map((row) => `${row[0]}|${row[1]}|${row[2]}`);
assert.equal(resources.length, 12, 'core matrix includes the established resource groups plus Device, KnowledgeBase and KnowledgeDocument');
assert.equal(actual.length, expected.size, 'every resource-role-surface combination appears once');
assert.equal(new Set(actual).size, actual.length, 'core matrix must not duplicate combinations');
assert.deepEqual([...actual].sort(), [...expected].sort());

const rowFor = (resource, role, surface) =>
  coreRows.find((row) => row[0] === resource && row[1] === role && row[2] === surface);
for (const role of ['guest', 'user', 'agent']) {
  const base = rowFor('KnowledgeBase', role, 'API');
  assert.ok(base, `KnowledgeBase API row is required for ${role}`);
  assert.equal(base[4], '-', `${role} cannot create knowledge bases`);
  assert.equal(base[5], 'yes', `${role} may list company-scoped knowledge bases`);
  assert.equal(base[6], 'yes', `${role} may read company-scoped knowledge base details`);
  assert.equal(base[7], '-', `${role} cannot update knowledge bases`);
  assert.equal(base[8], '-', `${role} cannot delete knowledge bases`);
  const document = rowFor('KnowledgeDocument', role, 'API');
  assert.ok(document, `KnowledgeDocument API row is required for ${role}`);
  assert.deepEqual(document.slice(4, 9), ['-', 'yes', '-', '-', '-']);
}
for (const role of ['admin', 'coordinator', 'superadmin']) {
  const base = rowFor('KnowledgeBase', role, 'API');
  assert.ok(base, `KnowledgeBase API row is required for ${role}`);
  assert.deepEqual(base.slice(4, 9), ['yes', 'yes', 'yes', 'yes', 'yes']);
  const document = rowFor('KnowledgeDocument', role, 'API');
  assert.ok(document, `KnowledgeDocument API row is required for ${role}`);
  assert.deepEqual(document.slice(4, 9), ['yes', 'yes', '-', '-', 'yes']);
}
for (const role of ['anonymous', 'guest']) {
  const device = rowFor('Device', role, 'API');
  assert.ok(device, `Device API row is required for ${role}`);
  assert.equal(device[4], 'pair-only', `${role} may only pair with a valid one-time proof`);
  assert.deepEqual(device.slice(5, 9), ['-', '-', '-', '-']);
}
for (const role of ['user', 'agent']) {
  const device = rowFor('Device', role, 'API');
  assert.ok(device, `Device API row is required for ${role}`);
  assert.deepEqual(device.slice(4, 9), ['yes', 'yes', 'own status', '-', '-']);
  const web = rowFor('Device', role, 'web');
  assert.ok(web, `Device Web row is required for ${role}`);
  assert.deepEqual(web.slice(4, 9), ['-', 'yes', '-', '-', '-']);
}
for (const role of ['admin', 'coordinator', 'superadmin']) {
  const device = rowFor('Device', role, 'API');
  assert.ok(device, `Device API row is required for ${role}`);
  assert.deepEqual(device.slice(4, 9), ['yes', 'yes', role === 'superadmin' ? 'cross-tenant status' : 'tenant status', 'RPA write', 'yes']);
  const web = rowFor('Device', role, 'web');
  assert.ok(web, `Device Web row is required for ${role}`);
  assert.equal(web[8], 'yes', `${role} can revoke only through confirmed Web action`);
}
assert.match(matrix, /registration now requires a database-backed actor with a company/i);
assert.match(matrix, /raw RPA configuration remains available only to the exact currently paired device/);
assert.match(matrix, /KnowledgeBase details and updates are tenant-scoped/);
assert.doesNotMatch(matrix, /GAP remains for KnowledgeBase detail\/update|No general detail\/update operation/);
assert.match(matrix, /ManagedInterface — owner-approved dormant global catalog/i);
assert.match(matrix, /TeamInterface — nested team relation/i);
assert.ok(!resources.includes('ManagedInterface'));
assert.ok(!resources.includes('TeamInterface'));
assert.match(
  matrix,
  /CompanyCountry, TeamInterface[\s\S]*?\| PARTIAL: nested-source mapping and selected guard contracts pass/,
  'nested CompanyCountry and TeamInterface rows must report source evidence and remaining gates',
);
assert.match(
  matrix,
  /ProviderCatalog, TenantProviderConfig, TenantVoiceProfile[\s\S]*?\| PARTIAL: API\/Cloud regressions/,
  'provider source contracts must remain partial until persistence and audit acceptance',
);
assert.match(crudGuard, /if \(!superadmin && !scoped\.includes\(resource\)\) return deny\(\)/);
assert.match(
  mvpScopeGuard,
  /tenantFlowHandlers[\s\S]*'getFlowDefinitions'[\s\S]*'upsertIntentFlowMapping'/,
  'tenant flow configuration routes must be explicitly enumerated',
);
assert.match(
  mvpScopeGuard,
  /if \(\s*!manager\s*\|\|\s*\(!safeReadHandlers\.includes\(handler\)\s*&&\s*!tenantFlowHandlers\.includes\(handler\)\)\s*\)/,
  'only tenant managers can use tenant configuration routes',
);
assert.match(
  mvpScopeGuard,
  /query\.companyId = actor\.companyId/,
  'tenant configuration filters must come from the DB-derived actor',
);
assert.match(
  webRouter,
  /path="\/management\/flow-definitions"[\s\S]*allowedRoles=\{\['admin', 'coordinator', 'superadmin'\]\}/,
  'tenant flow editor route must be restricted to approved management roles',
);
assert.doesNotMatch(
  webRouter,
  /InterfacesManager/,
  'the owner-approved dormant global catalog must remain unmounted in Web routes',
);
assert.equal(
  fs.existsSync(legacyInterfacesManager),
  false,
  'the owner-approved dormant global catalog manager must not remain as orphaned UI code',
);

console.log(
  `PASS CRUD inventory: ${prismaModels.length}/${prismaModels.length} Prisma models, ${actualModelTuples.length} model-role-surface rows, ${actual.length} established resource-role-surface rows, and ${documentedModels.length} three-column inventory rows.`,
);
