const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

class Forbidden extends Error {}
const decorator = () => () => {};
const repoRoot = path.resolve(__dirname, '../../../..');

function loadGuard(relativePath) {
  const loaded = { exports: {} };
  const output = ts.transpileModule(
    fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        experimentalDecorators: true,
      },
    },
  ).outputText;
  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    require: (name) =>
      name === '@nestjs/common'
        ? new Proxy(
            { ForbiddenException: Forbidden },
            { get: (target, key) => target[key] || decorator },
          )
        : {},
  });
  return loaded.exports.CrudAccessGuard;
}

async function main() {
  for (const backend of ['services/api', 'cloud']) {
    const CrudAccessGuard = loadGuard(
      `${backend}/src/guards/crud-access.guard.ts`,
    );
    const guard = new CrudAccessGuard({
      user: {
        findUnique: async () => ({
          id: 'admin-a',
          role: 'admin',
          companyId: 'company-a',
          teamId: 'team-a',
        }),
      },
      team: {
        findFirst: async ({ where }) =>
          ['team-a', 'team-a2'].includes(where.id) &&
          where.brand.companyId === 'company-a'
            ? { id: where.id }
            : null,
      },
    });
    const run = (teamId) => {
      const req = {
        method: 'PUT',
        route: { path: '/api/crud/teams/:id/interfaces' },
        params: { id: teamId },
        body: { interfaceIds: [] },
        query: {},
        user: { userId: 'admin-a', role: 'superadmin' },
      };
      return guard.canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({ name: 'setTeamInterfaces' }),
      });
    };
    await assert.doesNotReject(run('team-a2'));
    await assert.rejects(run('team-b'), Forbidden);
  }
  console.log(
    'PASS API and Cloud TeamInterface endpoint guards accept an in-company team and deny a foreign direct team ID',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
