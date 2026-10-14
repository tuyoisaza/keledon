const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '../../../..');

function loadService(relativePath, calls) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        experimentalDecorators: true,
        esModuleInterop: true,
      },
    },
  ).outputText;
  class ForbiddenException extends Error {}
  class BadRequestException extends Error {}
  class Logger {
    warn() {}
  }
  class QdrantClient {
    async getCollection() {
      return { points_count: 50, config: { params: { vectors: { size: 768, distance: 'Cosine' } } } };
    }
    async count(collection, options) {
      calls.counts.push({ collection, options });
      return { count: 2 };
    }
    async scroll(collection, options) {
      calls.scrolls.push({ collection, options });
      return { points: [{ id: 'own-point', payload: { company_id: 'company-a', team_id: 'team-a', content: 'owned' } }] };
    }
    async retrieve(collection, options) {
      calls.retrieves.push({ collection, options });
      const id = options.ids[0];
      return [{ id, payload: { company_id: id === 'foreign-point' ? 'company-b' : 'company-a', team_id: 'team-a' } }];
    }
    async delete(collection, options) {
      calls.deletes.push({ collection, options });
    }
    async upsert(collection, options) {
      calls.upserts.push({ collection, options });
    }
  }
  class OpenAI {}
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env: {} },
    require: (name) =>
      name === '@nestjs/common'
        ? new Proxy(
            { ForbiddenException, BadRequestException, Logger },
            { get: (target, key) => target[key] || (() => () => {}) },
          )
        : name === '@qdrant/qdrant-js'
          ? { QdrantClient }
          : name === 'openai'
            ? { default: OpenAI }
            : name === 'crypto'
              ? require('node:crypto')
              : {},
  });
  return module.exports.VectorStoreService;
}

async function main() {
  for (const relativePath of [
    'services/api/src/vector-store/vector-store.service.ts',
    'cloud/src/vector-store/vector-store.service.ts',
  ]) {
    const calls = { counts: [], scrolls: [], retrieves: [], deletes: [], upserts: [] };
    const VectorStoreService = loadService(relativePath, calls);
    const service = new VectorStoreService({
      team: { findUnique: async () => null },
    });
    service.embedText = async () => [0.1, 0.2];
    const scope = { companyId: 'company-a', teamId: 'team-a' };

    const status = await service.getStatus(scope);
    assert.equal(status.documentCount, 2);
    const statusFilter = calls.counts[0].options.filter.must;
    assert.equal(JSON.stringify(statusFilter.map(({ key, match }) => [key, match.value])), JSON.stringify([
      ['company_id', 'company-a'], ['team_id', 'team-a'],
    ]));

    const listed = await service.listDocuments(scope);
    assert.equal(listed.documents[0].content, 'owned');
    const listFilter = calls.scrolls[0].options.filter.must;
    assert.equal(JSON.stringify(listFilter.map(({ key, match }) => [key, match.value])), JSON.stringify([
      ['company_id', 'company-a'], ['team_id', 'team-a'],
    ]));

    await service.deleteDocument('own-point', scope);
    const updated = await service.updateDocument('123', { content: 'updated' }, scope);
    assert.equal(updated.id, '123');
    assert.equal(calls.upserts[0].options.points[0].id, 123);
    await assert.rejects(
      service.deleteDocument('foreign-point', scope),
      /Vector document access denied/,
    );
    assert.equal(calls.deletes.length, 1);
    assert.equal(calls.deletes[0].options.points[0], 'own-point');
  }
  console.log('PASS API/Cloud vector status and list are scoped, and direct document deletion checks stored point ownership.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
