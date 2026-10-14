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

function loadService(
  relativePath,
  { collectionExists = true, failCleanup = false } = {},
) {
  const module = { exports: {} };
  const events = [];
  const qdrant = {
    collectionExists: async (name) => {
      events.push(['collectionExists', name]);
      return { exists: collectionExists };
    },
    deleteCollection: async (name) => {
      events.push(['deleteCollection', name]);
      if (failCleanup) throw new Error('Qdrant unavailable');
    },
    delete: async (name, selector) => {
      events.push(['deletePoints', name, selector]);
      if (failCleanup) throw new Error('Qdrant unavailable');
    },
  };
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  }).outputText;

  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env: {} },
    require: (name) => {
      if (name === '@nestjs/common') {
        return { Injectable: () => (target) => target };
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
      if (name.endsWith('/prisma/prisma.service')) {
        return { PrismaService: class {} };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });

  return { Service: module.exports.CrudSessionDataService, events };
}

for (const relativePath of services) {
  test(`${relativePath} deletes document vectors before the database row`, async () => {
    const { Service, events } = loadService(relativePath);
    const prisma = {
      knowledgeDocument: {
        findUnique: async (args) => {
          events.push(['findDocument', args]);
          return { id: 'doc-a', knowledgeBaseId: 'kb-a' };
        },
        delete: async (args) => {
          events.push(['deleteDocument', args]);
          return { id: 'doc-a' };
        },
      },
    };

    const result = await new Service(prisma).deleteKnowledgeDocument('doc-a');

    assert.deepEqual(result, { id: 'doc-a' });
    assert.deepEqual(
      events.map((event) => event[0]),
      ['findDocument', 'collectionExists', 'deletePoints', 'deleteDocument'],
    );
    assert.equal(events[1][1], 'knowledge-base-kb-a');
    assert.equal(events[2][1], 'knowledge-base-kb-a');
    assert.equal(
      JSON.stringify(events[2][2]),
      JSON.stringify({
        filter: { must: [{ key: 'documentId', match: { value: 'doc-a' } }] },
        wait: true,
      }),
    );
  });

  test(`${relativePath} removes an entire vector collection before deleting its base`, async () => {
    const { Service, events } = loadService(relativePath);
    const prisma = {
      knowledgeBase: {
        findUnique: async (args) => {
          events.push(['findBase', args]);
          return { id: 'kb-a' };
        },
        delete: async (args) => {
          events.push(['deleteBase', args]);
          return { id: 'kb-a' };
        },
      },
    };

    const result = await new Service(prisma).deleteKnowledgeBase('kb-a');

    assert.deepEqual(result, { id: 'kb-a' });
    assert.deepEqual(
      events.map((event) => event[0]),
      ['findBase', 'collectionExists', 'deleteCollection', 'deleteBase'],
    );
    assert.equal(events[2][1], 'knowledge-base-kb-a');
  });

  test(`${relativePath} preserves database records when Qdrant cleanup fails`, async () => {
    const { Service, events } = loadService(relativePath, {
      failCleanup: true,
    });
    const prisma = {
      knowledgeDocument: {
        findUnique: async () => ({ id: 'doc-a', knowledgeBaseId: 'kb-a' }),
        delete: async () => {
          events.push(['deleteDocument']);
        },
      },
    };

    await assert.rejects(
      new Service(prisma).deleteKnowledgeDocument('doc-a'),
      /Qdrant unavailable/,
    );
    assert.equal(
      events.some(([event]) => event === 'deleteDocument'),
      false,
    );
  });

  test(`${relativePath} deletes a document row when its vector collection is absent`, async () => {
    const { Service, events } = loadService(relativePath, {
      collectionExists: false,
    });
    const prisma = {
      knowledgeDocument: {
        findUnique: async () => ({ id: 'doc-a', knowledgeBaseId: 'kb-a' }),
        delete: async (args) => {
          events.push(['deleteDocument', args]);
          return { id: 'doc-a' };
        },
      },
    };

    const result = await new Service(prisma).deleteKnowledgeDocument('doc-a');

    assert.deepEqual(result, { id: 'doc-a' });
    assert.deepEqual(
      events.map((event) => event[0]),
      ['collectionExists', 'deleteDocument'],
    );
  });

  test(`${relativePath} skips vector calls for unindexed or missing collections`, async () => {
    const { Service, events } = loadService(relativePath, {
      collectionExists: false,
    });
    const prisma = {
      knowledgeBase: {
        findUnique: async () => ({ id: 'kb-a' }),
        delete: async (args) => ({ id: args.where.id }),
      },
    };

    const result = await new Service(prisma).deleteKnowledgeBase('kb-a');

    assert.deepEqual(result, { id: 'kb-a' });
    assert.deepEqual(
      events.map((event) => event[0]),
      ['collectionExists'],
    );
  });

  test(`${relativePath} preserves a base when collection deletion fails`, async () => {
    const { Service, events } = loadService(relativePath, {
      failCleanup: true,
    });
    const prisma = {
      knowledgeBase: {
        findUnique: async () => ({ id: 'kb-a' }),
        delete: async () => {
          events.push(['deleteBase']);
        },
      },
    };

    await assert.rejects(
      new Service(prisma).deleteKnowledgeBase('kb-a'),
      /Qdrant unavailable/,
    );
    assert.equal(
      events.some(([event]) => event === 'deleteBase'),
      false,
    );
  });
}
