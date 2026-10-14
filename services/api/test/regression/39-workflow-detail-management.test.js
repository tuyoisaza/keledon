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
    assert.match(
      controllerSource,
      /@Controller\('api\/crud'\)\s+@UseGuards\(CrudAccessGuard\)/,
      `${backend} CRUD controller must enforce the database-derived guard`,
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
    const canAccess = (method, route, handler) => {
      const req = {
        method,
        route: { path: route },
        params: { id: 'wf-a' },
        body: {},
        query: {},
        user: { userId: 'actor', role: 'user' },
      };
      return guard.canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({ name: handler }),
      });
    };
    const workflowRoutes = [
      ['GET', '/api/crud/workflows', 'getWorkflows'],
      ['GET', '/api/crud/workflows/:id', 'getWorkflow'],
      ['POST', '/api/crud/workflows', 'createWorkflow'],
      ['PUT', '/api/crud/workflows/:id', 'updateWorkflow'],
      ['DELETE', '/api/crud/workflows/:id', 'deleteWorkflow'],
    ];
    for (const [method, route, handler] of workflowRoutes)
      await assert.doesNotReject(canAccess(method, route, handler));
    for (role of [
      'guest',
      'user',
      'agent',
      'admin',
      'coordinator',
    ]) {
      for (const [method, route, handler] of workflowRoutes)
        await assert.rejects(
          canAccess(method, route, handler),
          Forbidden,
          `${backend} ${role} must be denied ${method} ${route}`,
        );
    }
  }
  console.log(
    'PASS API/Cloud CRUD controller guard wiring and Workflow list/detail/create/update/delete: superadmin allowed; every other role denied',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
