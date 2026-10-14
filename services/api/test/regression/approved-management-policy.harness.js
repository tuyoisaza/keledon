// Shared isolated Nest harness for the approved management policy regression.
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
  { get: (target, key) => target[key] || decorator },
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
  const loaded = { exports: {} };
  vm.runInNewContext(
    output,
    {
      module: loaded,
      exports: loaded.exports,
      Buffer,
      URL,
      process,
      Date,
      console,
      require: (name) => {
        if (name === '@nestjs/common' || name === '@nestjs/swagger')
          return common;
        if (name.endsWith('public.decorator')) return { Public: decorator };
        if (name === 'crypto') return crypto;
        if (name === 'bcrypt') return { hash: async () => 'isolated-hash' };
        return adapters[name] || {};
      },
    },
    { filename },
  );
  return loaded.exports;
}

const context = (request) => ({
  getHandler() {},
  getClass() {},
  switchToHttp: () => ({ getRequest: () => request }),
});

module.exports = {
  crypto,
  Denied,
  context,
  load,
  AuthGuard: load('guards/auth.guard.ts').AuthGuard,
  LocalAuthService: load('auth-local/auth-local.service.ts').LocalAuthService,
  roles: load('guards/roles.guard.ts'),
  CrudCompanyService: load('crud/crud-company.service.ts').CrudCompanyService,
  CrudController: load('crud/crud.controller.ts').CrudController,
  CrudAccessGuard: load('guards/crud-access.guard.ts').CrudAccessGuard,
  TeamController: load('controllers/team.controller.ts').TeamController,
  CrudKeledonService: load('crud/crud-keledon.service.ts').CrudKeledonService,
  CrudService: load('crud/crud.service.ts').CrudService,
  TenantController: load('controllers/tenant.controller.ts').TenantController,
};
