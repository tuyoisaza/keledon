const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '../../../..');

function loadService(relativePath, calls) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
      esModuleInterop: true,
    },
  }).outputText;
  class BadRequestException extends Error {}
  class Logger {
    warn() {}
  }
  class QdrantClient {
    constructor() {}
    async search(collection, options) {
      calls.push({ collection, options });
      return [];
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
            { BadRequestException, Logger },
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
    const calls = [];
    const VectorStoreService = loadService(relativePath, calls);
    const service = new VectorStoreService({
      team: { findUnique: async () => null },
    });
    await service.search('tenant scoped query', {
      company_id: 'company-a',
      brand_id: 'brand-a',
      team_id: 'team-a',
    });
    assert.equal(calls.length, 1, `${relativePath} should issue one Qdrant search`);
    const must = calls[0].options.filter?.must || [];
    assert.equal(
      JSON.stringify(must.map(({ key, match }) => [key, match.value])),
      JSON.stringify([
        ['company_id', 'company-a'],
        ['brand_id', 'brand-a'],
        ['team_id', 'team-a'],
      ]),
      `${relativePath} must intersect company, brand, and team scope in Qdrant`,
    );
  }
  console.log('PASS API/Cloud vector search applies company, brand, and team filters to Qdrant.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
