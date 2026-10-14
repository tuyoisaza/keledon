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
        if (name === 'crypto') return crypto;
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

async function main() {
  const previousEnv = process.env.NODE_ENV;
  delete process.env.KELEDON_AUTH_SECRET;
  process.env.NODE_ENV = 'production';
  assert.throws(() => new AuthGuard({}), /required in production/);
  assert.throws(() => new LocalAuthService({}), /required in production/);
  process.env.NODE_ENV = 'development';
  assert.doesNotThrow(() => new AuthGuard({}));
  assert.doesNotThrow(() => new LocalAuthService({}));
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;
  process.env.KELEDON_AUTH_SECRET = 'isolated-test-only-secret';
  const auth = new AuthGuard({ getAllAndOverride: () => false });
  let lookups = 0;
  const local = new LocalAuthService({
    user: {
      findUnique: async () => {
        lookups++;
        return { id: 'u1', role: 'user' };
      },
    },
  });
  const sign = (payload) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `${encoded}.${crypto.createHmac('sha256', process.env.KELEDON_AUTH_SECRET).update(encoded).digest('hex')}`;
  };
  const valid = {
    userId: 'u1',
    email: 'fixture@example.invalid',
    role: 'user',
    expiresAt: Date.now() + 60000,
  };
  const malformed = [
    null,
    {},
    { ...valid, userId: '' },
    { ...valid, expiresAt: undefined },
    { ...valid, expiresAt: 'never' },
    { ...valid, expiresAt: String(Date.now() + 60000) },
    { ...valid, expiresAt: Date.now() - 1 },
  ];
  for (const payload of malformed) {
    const token = sign(payload);
    await assert.rejects(
      () => auth.canActivate(
        context({ headers: { authorization: `Bearer ${token}` } }),
      ),
      Denied,
    );
    assert.equal(await local.validateToken(token), null);
  }
  assert.equal(lookups, 0, 'invalid signed payload must not reach database');
  for (const header of [
    undefined,
    'Basic abc',
    'Bearer bad',
    `Bearer ${sign(valid)}tampered`,
  ]) {
    await assert.rejects(
      () => auth.canActivate(context({ headers: { authorization: header } })),
      Denied,
    );
  }
  const request = { headers: { authorization: `Bearer ${sign(valid)}` } };
  assert.equal(await auth.canActivate(context(request)), true);
  assert.equal(request.user.userId, 'u1');
  assert.equal((await local.validateToken(sign(valid))).id, 'u1');

  for (const role of [
    'user',
    'guest',
    'admin',
    'coordinator',
    'agent',
    undefined,
  ]) {
    const prisma = {
      user: { findUnique: async () => (role ? { role } : null) },
    };
    const ctx = context({ user: { userId: 'u1', role: 'superadmin' } });
    await assert.rejects(
      () => new SuperAdminGuard(prisma).canActivate(ctx),
      Denied,
    );
    await assert.rejects(
      () =>
        new RolesGuard(
          { getAllAndOverride: () => ['superadmin'] },
          prisma,
        ).canActivate(ctx),
      Denied,
    );
  }
  const superGuard = new SuperAdminGuard({
    user: { findUnique: async () => ({ role: 'superadmin' }) },
  });
  await assert.rejects(() => superGuard.canActivate(context({})), Denied);
  assert.equal(
    await superGuard.canActivate(context({ user: { userId: 'u1' } })),
    true,
  );

  let teamQuery, detailQuery, companyQuery;
  const service = new CrudCompanyService({
    team: {
      findMany: async (query) => {
        teamQuery = query;
        return [];
      },
      findUnique: async (query) => {
        detailQuery = query;
        return { id: query.where.id };
      },
    },
    company: {
      findUnique: async (query) => {
        companyQuery = query;
        return { id: 'co-a' };
      },
    },
  });
  await service.getTeams('co-a');
  assert.equal(
    teamQuery.where.brand.companyId,
    'co-a',
    'filter must reach Prisma relation',
  );
  await service.getTeams();
  assert.equal(teamQuery.where, undefined);
  assert.equal((await service.getTeam('team-a')).id, 'team-a');
  assert.equal(detailQuery.where.id, 'team-a');
  for (const secret of [
    'openaiApiKey',
    'deepgramApiKey',
    'elevenlabsApiKey',
    'speachesApiKey',
    'ttsApiKey',
  ]) {
    assert.equal(detailQuery.select[secret], undefined);
  }
  await service.getCompany('co-a');
  assert.equal(companyQuery.include.users.select.passwordHash, undefined);
  assert.equal(companyQuery.include.users.select.id, true);
  const controller = new CrudController({ getTeam: (id) => ({ id }) }, {});
  assert.equal(controller.getTeam('team-a').id, 'team-a');

  console.log(
    'PASS admin boundaries: 7 signed malformed payloads, 4 auth negatives, 12 stale-role negatives, absent actor, valid controls, tenant filter/detail and secret projections.',
  );

}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
