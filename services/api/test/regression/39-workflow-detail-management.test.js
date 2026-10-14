const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

class Forbidden extends Error {}
const decorator = () => () => {};
const root = path.resolve(__dirname, '../../../..');

function load(relativePath, adapters = {}) {
  const file = path.join(root, relativePath);
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => {
      if (name === '@nestjs/common') {
        return new Proxy(
          { ForbiddenException: Forbidden },
          { get: (target, key) => target[key] || decorator },
        );
      }
      return adapters[name] || {};
    },
  });
  return loaded.exports;
}

async function main() {
  for (const backend of ['services/api', 'cloud']) {
    const controllerSource = fs.readFileSync(
      path.join(root, `${backend}/src/crud/crud.controller.ts`),
      'utf8',
    );
    assert.match(controllerSource, /@Get\('workflows\/:id'\)\s+getWorkflow/);

    const workflow = {
      id: 'wf-a',
      name: 'Qualified transfer',
      trigger: '{"type":"manual"}',
      steps: '[]',
      variables: '{}',
      isEnabled: true,
    };
    let query;
    const { CrudService } = load(`${backend}/src/crud/crud.service.ts`, {
      './crud-health': { getCrudHealthReport: () => ({}) },
      './crud-keledon.service': { CrudKeledonService: class {} },
      './crud-audit.service': { CrudAuditService: class {} },
      './crud-vendor.service': { CrudVendorService: class {} },
      './crud-company.service': { CrudCompanyService: class {} },
      './crud-session-data.service': { CrudSessionDataService: class {} },
      './crud-health.service': { CrudHealthService: class {} },
      '../prisma/prisma.service': { PrismaService: class {} },
      '@prisma/client': { Prisma: new Proxy({}, { get: () => ({}) }) },
    });
    const service = Object.create(CrudService.prototype);
    service.prisma = {
      workflow: {
        findUnique: async (args) => {
          query = args;
          return workflow;
        },
      },
    };
    assert.equal(await service.getWorkflow('wf-a'), workflow);
    assert.equal(query.where.id, 'wf-a');

    const { CrudAccessGuard } = load(
      `${backend}/src/guards/crud-access.guard.ts`,
    );
    let role = 'superadmin';
    const guard = new CrudAccessGuard({
      user: {
        findUnique: async () => ({
          id: 'actor',
          role,
          companyId: role === 'superadmin' ? null : 'company-a',
          teamId: null,
        }),
      },
    });
    const canRead = () => {
      const req = {
        method: 'GET',
        route: { path: '/api/crud/workflows/:id' },
        params: { id: 'wf-a' },
        body: {},
        query: {},
        user: { userId: 'actor', role: 'user' },
      };
      return guard.canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({ name: 'getWorkflow' }),
      });
    };
    await assert.doesNotReject(canRead());
    role = 'admin';
    await assert.rejects(canRead(), Forbidden);
  }
  console.log(
    'PASS API/Cloud workflow detail endpoints return the selected record and remain superadmin-only',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
