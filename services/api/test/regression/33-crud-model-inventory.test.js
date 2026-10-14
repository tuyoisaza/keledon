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
assert.equal(resources.length, 9, 'core matrix must list all nine scoped CRUD resources');
assert.equal(actual.length, expected.size, 'every resource-role-surface combination appears once');
assert.equal(new Set(actual).size, actual.length, 'core matrix must not duplicate combinations');
assert.deepEqual([...actual].sort(), [...expected].sort());

console.log(
  `PASS CRUD inventory: ${prismaModels.length}/${prismaModels.length} Prisma models and ${actual.length} unique core resource-role-surface rows.`,
);
