// Executes production TypeScript with isolated Nest/Prisma/bcrypt adapters; no services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

const decorator = () => () => {};
class Denied extends Error {}
const common = new Proxy(
  {
    UnauthorizedException: Denied,
    ForbiddenException: Denied,
    BadRequestException: Denied,
  },
  {
    get: (target, key) => target[key] || decorator,
  },
);
function load(relative, adapters = {}) {
  const filename = path.resolve(__dirname, '../../src', relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    output,
    {
      module,
      exports: module.exports,
      Buffer,
      URL,
      process,
      Date,
      console,
      require: (name) => {
        if (name === '@nestjs/common') return common;
        if (name === '@nestjs/swagger') return common;
        if (name.endsWith('public.decorator')) return { Public: decorator };
        if (name === 'crypto' || name === 'node:crypto') return crypto;
        if (name === 'bcrypt') return { hash: async () => 'isolated-hash' };
        return adapters[name] || {};
      },
    },
    { filename },
  );
  return module.exports;
}
const context = (request) => ({
  getHandler() {},
  getClass() {},
  switchToHttp: () => ({ getRequest: () => request }),
});
const { AuthGuard } = load('guards/auth.guard.ts');
const { LocalAuthService } = load('auth-local/auth-local.service.ts');
const { RolesGuard, SuperAdminGuard } = load('guards/roles.guard.ts');
const { CrudCompanyService } = load('crud/crud-company.service.ts');
const { CrudController } = load('crud/crud.controller.ts');
const { CrudAccessGuard } = load('guards/crud-access.guard.ts');
const { TeamController } = load('controllers/team.controller.ts');
const { CrudKeledonService } = load('crud/crud-keledon.service.ts');

module.exports = {
  assert,
  crypto,
  Denied,
  context,
  AuthGuard,
  LocalAuthService,
  RolesGuard,
  SuperAdminGuard,
  CrudCompanyService,
  CrudController,
  CrudAccessGuard,
  TeamController,
  CrudKeledonService,
};
