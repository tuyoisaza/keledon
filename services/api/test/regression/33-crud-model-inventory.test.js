const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const schema = fs.readFileSync(
  path.join(repoRoot, 'services/api/prisma/schema.prisma'),
  'utf8',
);
const matrix = fs.readFileSync(path.join(repoRoot, 'CRUD_MATRIX.md'), 'utf8');

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

assert.equal(new Set(prismaModels).size, prismaModels.length, 'Prisma schema model names must be unique');
assert.equal(new Set(documentedModels).size, documentedModels.length, 'CRUD inventory model rows must be unique');
assert.deepEqual(
  [...documentedModels].sort(),
  [...prismaModels].sort(),
  'CRUD_MATRIX.md must account for every Prisma model exactly once',
);

const coreStart = matrix.indexOf('| Resource | Role | Surface |');
const exceptionsStart = matrix.indexOf('## Explicitly scoped exceptions');
assert.notEqual(coreStart, -1, 'CRUD matrix must include the capability matrix');
assert.ok(exceptionsStart > coreStart, 'capability matrix must precede scoped exceptions');
const coreRows = tableRows(matrix.slice(coreStart, exceptionsStart)).slice(1);
const resources = [...new Set(coreRows.map((row) => row[0]))].sort();
const roles = ['admin', 'agent', 'anonymous', 'coordinator', 'guest', 'superadmin', 'user'];
const surfaces = ['API', 'web'];
const expected = new Set(
  resources.flatMap((resource) =>
    roles.flatMap((role) => surfaces.map((surface) => `${resource}|${role}|${surface}`)),
  ),
);
const actual = coreRows.map((row) => `${row[0]}|${row[1]}|${row[2]}`);
assert.equal(resources.length, 11, 'core matrix must include the nine established resources plus KnowledgeBase and KnowledgeDocument');
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
assert.match(matrix, /KnowledgeBase details and updates are tenant-scoped/);
assert.doesNotMatch(matrix, /GAP remains for KnowledgeBase detail\/update|No general detail\/update operation/);

console.log(
  `PASS CRUD inventory: ${prismaModels.length}/${prismaModels.length} Prisma models and ${actual.length} unique core resource-role-surface rows.`,
);
