const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

class Forbidden extends Error {}
const root = path.resolve(__dirname, '../../../..');

function loadGuard(backend) {
  const source = fs.readFileSync(
    path.join(root, `${backend}/src/guards/crud-access.guard.ts`),
    'utf8',
  );
  const module = { exports: {} };
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
    require: (name) => {
      if (name === '@nestjs/common')
        return new Proxy(
          { ForbiddenException: Forbidden },
          { get: (target, key) => target[key] || (() => () => {}) },
        );
      if (name === '@prisma/client') return {};
      return {};
    },
  });
  return module.exports.CrudAccessGuard;
}

async function main() {
  for (const backend of ['services/api', 'cloud']) {
    let targetCompany = 'company-a';
    const lookups = [];
    const prisma = {
      user: {
        findUnique: async (args) => {
          lookups.push(args);
          if (args.where.id === 'actor')
            return {
              id: 'actor',
              role: 'admin',
              companyId: 'company-a',
              teamId: 'team-a',
            };
          if (args.where.id === 'target')
            return {
              id: 'target',
              role: 'user',
              companyId: targetCompany,
              teamId: 'team-a',
              passwordHash: 'must-not-be-selected',
            };
          return null;
        },
      },
    };
    const Guard = loadGuard(backend);
    const guard = new Guard(prisma);
    const run = () =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            route: { path: '/api/crud/users/:id' },
            params: { id: 'target' },
            body: {},
            query: {},
            // A forged role in the token cannot grant access over the DB role.
            user: { userId: 'actor', role: 'superadmin' },
          }),
        }),
        getHandler: () => ({ name: 'getUser' }),
      });

    await run();
    const targetLookup = lookups.find((entry) => entry.where.id === 'target');
    assert.equal(targetLookup.select.companyId, true);
    assert.equal(targetLookup.select.teamId, true);
    assert.equal(targetLookup.select.role, true);
    assert.equal(Object.keys(targetLookup.select).length, 3);
    assert.equal(targetLookup.select.passwordHash, undefined);

    targetCompany = 'company-b';
    await assert.rejects(run(), Forbidden);
  }
  console.log(
    'PASS API/Cloud CRUD guards derive role from the DB, scope user detail by company, and select no password hash',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
