const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const repoRoot = path.resolve(__dirname, '../../../..');
const services = [
  'services/api/src/crud/crud-session-data.service.ts',
  'cloud/src/crud/crud-session-data.service.ts',
];

class BadRequest extends Error {}
class NotFound extends Error {}

function loadService(relativePath, prisma) {
  const module = { exports: {} };
  const qdrant = {};
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env: {} },
    require: (name) => {
      if (name === '@nestjs/common') {
        return {
          BadRequestException: BadRequest,
          Injectable: () => (target) => target,
          NotFoundException: NotFound,
        };
      }
      if (name === '@qdrant/qdrant-js') {
        return {
          QdrantClient: class {
            constructor() {
              return qdrant;
            }
          },
        };
      }
      if (name.endsWith('/prisma/prisma.service'))
        return { PrismaService: class {} };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return new module.exports.CrudSessionDataService(prisma);
}

for (const relativePath of services) {
  test(`${relativePath} counts and deletes only empty ended orphan sessions`, async () => {
    const calls = [];
    const prisma = {
      session: {
        count: async (args) => {
          calls.push(['count', args]);
          return 1;
        },
        deleteMany: async (args) => {
          calls.push(['deleteMany', args]);
          return { count: 1 };
        },
      },
    };
    const service = loadService(relativePath, prisma);
    assert.equal(await service.getOrphanedSessionCount(), 1);
    assert.equal((await service.deleteOrphanedSessions()).deleted, 1);
    const expected = {
      userId: null,
      teamId: null,
      status: 'ended',
      metadata: null,
      events: { none: {} },
      flowRuns: { none: {} },
      subAgents: { none: {} },
    };
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1].where)), expected);
    assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1].where)), expected);
    assert.equal('OR' in calls[0][1].where, false);
  });

  test(`${relativePath} scopes KnowledgeBase detail and updates by company`, async () => {
    const calls = [];
    const knowledgeBase = {
      id: 'kb-a',
      companyId: 'company-a',
      name: 'Support',
      description: 'Old',
      _count: { documents: 2 },
    };
    const prisma = {
      knowledgeBase: {
        findFirst: async (args) => {
          calls.push(['findFirst', args]);
          return args.where.id === 'kb-a' &&
            args.where.companyId === 'company-a'
            ? knowledgeBase
            : null;
        },
        update: async (args) => {
          calls.push(['update', args]);
          return { ...knowledgeBase, ...args.data };
        },
      },
    };
    const service = loadService(relativePath, prisma);
    const detail = await service.getKnowledgeBase('kb-a', 'company-a');
    assert.equal(detail._count.documents, 2);
    await assert.rejects(
      service.getKnowledgeBase('kb-b', 'company-a'),
      NotFound,
    );
    const updated = await service.updateKnowledgeBase(
      'kb-a',
      { name: '  Support v2  ', description: '  Updated  ' },
      'company-a',
    );
    assert.equal(updated.name, 'Support v2');
    assert.equal(updated.description, 'Updated');
    assert.equal(
      JSON.stringify(calls[0][1].where),
      JSON.stringify({ id: 'kb-a', companyId: 'company-a' }),
    );
    assert.equal(
      JSON.stringify(calls[2][1].where),
      JSON.stringify({ id: 'kb-a', companyId: 'company-a' }),
    );
    assert.equal(
      JSON.stringify(calls[3][1].data),
      JSON.stringify({ name: 'Support v2', description: 'Updated' }),
    );
    assert.equal('companyId' in calls[3][1].data, false);
  });

  test(`${relativePath} rejects invalid KnowledgeBase updates before writes`, async () => {
    let lookups = 0;
    const service = loadService(relativePath, {
      knowledgeBase: {
        findFirst: async () => {
          lookups += 1;
          return { id: 'kb-a' };
        },
        update: async () => {
          throw new Error('unexpected write');
        },
      },
    });
    await assert.rejects(
      service.updateKnowledgeBase('kb-a', { name: '  ' }, 'company-a'),
      BadRequest,
    );
    await assert.rejects(
      service.updateKnowledgeBase('kb-a', { description: 42 }, 'company-a'),
      BadRequest,
    );
    assert.equal(lookups, 0);
  });
}
