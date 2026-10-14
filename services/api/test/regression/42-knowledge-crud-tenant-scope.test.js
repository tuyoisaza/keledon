const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

class Denied extends Error {}
const repoRoot = path.resolve(__dirname, '../../../..');
const guards = [
  'services/api/src/guards/crud-access.guard.ts',
  'cloud/src/guards/crud-access.guard.ts',
];

function loadGuard(relativePath) {
  const module = { exports: {} };
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
    require: (name) =>
      name === '@nestjs/common'
        ? new Proxy({ ForbiddenException: Denied }, { get: (obj, key) => obj[key] || (() => () => {}) })
        : {},
  });
  return module.exports.CrudAccessGuard;
}

function requestContext({ role = 'admin', method = 'GET', route, params = {}, body = {}, query = {} }) {
  const actor = {
    id: 'actor-a',
    role,
    companyId: role === 'superadmin' ? null : 'company-a',
    teamId: null,
  };
  const req = {
    method,
    route: { path: route },
    params,
    body,
    query,
    user: { userId: actor.id },
  };
  const context = {
    getHandler: () => ({ name: route.includes('documents/:docId') ? 'deleteKnowledgeDocument' : route.includes('/documents') ? method === 'POST' ? 'createKnowledgeDocument' : 'getKnowledgeDocuments' : route.endsWith(':id') ? 'deleteKnowledgeBase' : method === 'POST' ? 'createKnowledgeBase' : 'getKnowledgeBases' }),
    switchToHttp: () => ({ getRequest: () => req }),
  };
  return { actor, req, context };
}

for (const relativePath of guards) {
  test(`${relativePath} scopes knowledge CRUD to the actor company`, async () => {
    const Guard = loadGuard(relativePath);
    const prisma = {
      user: { findUnique: async () => current.actor },
      knowledgeBase: {
        findUnique: async ({ where }) =>
          ({ 'kb-a': { companyId: 'company-a' }, 'kb-b': { companyId: 'company-b' } })[where.id] || null,
      },
      knowledgeDocument: {
        findUnique: async ({ where }) =>
          ({
            'doc-a': { knowledgeBase: { companyId: 'company-a' } },
            'doc-b': { knowledgeBase: { companyId: 'company-b' } },
          })[where.id] || null,
      },
    };
    let current;
    const run = async (options) => {
      current = requestContext(options);
      const guard = new Guard(prisma);
      await guard.canActivate(current.context);
      return current.req;
    };
    const denied = async (options) => {
      current = requestContext(options);
      const guard = new Guard(prisma);
      await assert.rejects(guard.canActivate(current.context), Denied);
    };

    const list = await run({ route: 'knowledge', query: { companyId: 'company-b' } });
    assert.equal(list.query.companyId, 'company-a');
    const createdBase = await run({
      method: 'POST', route: 'knowledge', body: { name: 'Support KB' },
    });
    assert.equal(createdBase.body.companyId, 'company-a');
    await denied({ method: 'POST', route: 'knowledge', body: { companyId: 'company-b', name: 'Foreign' } });
    await run({ method: 'DELETE', route: 'knowledge/:id', params: { id: 'kb-a' } });
    await denied({ method: 'DELETE', route: 'knowledge/:id', params: { id: 'kb-b' } });
    await run({ method: 'GET', route: 'knowledge/:id/documents', params: { id: 'kb-a' } });
    await denied({ method: 'GET', route: 'knowledge/:id/documents', params: { id: 'kb-b' } });
    const createdDocument = await run({
      method: 'POST', route: 'knowledge/:id/documents', params: { id: 'kb-a' },
      body: { knowledgeBaseId: 'kb-b', title: 'Guide', content: 'Text' },
    });
    assert.equal(createdDocument.body.knowledgeBaseId, 'kb-a');
    await denied({ method: 'DELETE', route: 'knowledge/documents/:docId', params: { docId: 'doc-b' } });
    await run({ method: 'DELETE', route: 'knowledge/documents/:docId', params: { docId: 'doc-a' } });
    await denied({ role: 'user', route: 'knowledge' });
  });
}
