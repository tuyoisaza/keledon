const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { firstValueFrom, of } = require('rxjs');

class ForbiddenException extends Error {}

function loadGuard(file) {
  const filename = path.resolve(__dirname, file);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
    },
  }).outputText;
  const loaded = { exports: {} };
  const common = {
    Injectable: () => (target) => target,
    SetMetadata: () => () => undefined,
    ForbiddenException,
  };
  const localRequire = (name) => {
    if (name === '@nestjs/common') return common;
    if (name === '@nestjs/core') return {};
    return {};
  };
  new Function('module', 'exports', 'require', output)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

function httpContext(request) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

function loadAuditInterceptor(relativeFile) {
  const filename = path.resolve(__dirname, relativeFile);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
    },
  }).outputText;
  const loaded = { exports: {} };
  const common = {
    Injectable: () => (target) => target,
    Logger: class { debug() {} error() {} },
  };
  const localRequire = (name) => name === '@nestjs/common' ? common : require(name);
  new Function('module', 'exports', 'require', output)(loaded, loaded.exports, localRequire);
  return loaded.exports.AuditInterceptor;
}

for (const [runtime, file] of [
  ['API', '../src/guards/roles.guard.ts'],
  ['Cloud', '../../../cloud/src/guards/roles.guard.ts'],
]) {
  test(`${runtime} denied role access records a minimal tenant-attributed event and still rejects`, async () => {
    const { RolesGuard, SuperAdminGuard } = loadGuard(file);
    const events = [];
    const prisma = {
      user: { findUnique: async () => ({ id: 'actor-1', role: 'admin', companyId: 'tenant-7' }) },
      auditLog: { create: async ({ data }) => { events.push(data); return data; } },
    };
    const request = {
      user: { userId: 'actor-1' }, method: 'POST',
      route: { path: '/api/admin/prompts' },
      body: { password: 'must-not-be-recorded' },
      headers: { authorization: 'Bearer must-not-be-recorded' },
    };
    const roles = new RolesGuard({ getAllAndOverride: () => ['superadmin'] }, prisma);
    await assert.rejects(roles.canActivate(httpContext(request)), ForbiddenException);
    assert.deepEqual(events[0], {
      userId: 'actor-1', companyId: 'tenant-7', action: 'ACCESS_DENIED',
      entity: 'Authorization', entityId: 'POST /api/admin/prompts',
      changes: JSON.stringify({ reason: 'ROLE_REQUIRED', requiredRoles: ['superadmin'] }),
    });
    assert.equal(JSON.stringify(events).includes('must-not-be-recorded'), false);

    await assert.rejects(new SuperAdminGuard(prisma).canActivate(httpContext(request)), ForbiddenException);
    assert.equal(events.length, 2);
    assert.equal(events[1].companyId, 'tenant-7');
  });

  test(`${runtime} keeps role denial closed when audit persistence fails`, async () => {
    const { RolesGuard } = loadGuard(file);
    const prisma = {
      user: { findUnique: async () => ({ role: 'user', companyId: 'tenant-8' }) },
      auditLog: { create: async () => { throw new Error('database unavailable'); } },
    };
    const guard = new RolesGuard({ getAllAndOverride: () => ['admin'] }, prisma);
    await assert.rejects(
      guard.canActivate(httpContext({ user: { userId: 'actor-2' }, method: 'GET', route: { path: '/admin' } })),
      ForbiddenException,
    );
  });
}

test('Cloud registers the audit interceptor as an application-wide provider', () => {
  const root = path.resolve(__dirname, '../../..');
  const source = fs.readFileSync(path.join(root, 'cloud/src/app.module.ts'), 'utf8');
  assert.match(source, /import \{ APP_INTERCEPTOR \} from '@nestjs\/core'/);
  assert.match(source, /import \{ AuditInterceptor \} from '\.\/interceptors\/audit\.interceptor'/);
  assert.match(source, /provide:\s*APP_INTERCEPTOR,\s*useClass:\s*AuditInterceptor/);
});

test('audit event tenant snapshot is additive and survives company deletion', () => {
  const root = path.resolve(__dirname, '../../..');
  for (const runtime of ['services/api', 'cloud']) {
    const schema = fs.readFileSync(path.join(root, runtime, 'prisma/schema.prisma'), 'utf8');
    const migration = fs.readFileSync(path.join(root, runtime, 'prisma/migrations/20261016020000_audit_event_tenant_snapshot/migration.sql'), 'utf8');
    const model = schema.match(/model AuditLog \{([\s\S]*?)\n\}/)?.[1] || '';
    assert.match(model, /companyId\s+String\?/);
    assert.match(model, /@@index\(\[companyId, createdAt\]\)/);
    assert.match(migration, /ADD COLUMN IF NOT EXISTS "companyId" TEXT/);
    assert.match(migration, /CREATE INDEX IF NOT EXISTS "audit_logs_companyId_createdAt_idx"/);
    assert.doesNotMatch(model, /@relation/);
  }
});

for (const [runtime, file] of [
  ['API', '../src/interceptors/audit.interceptor.ts'],
  ['Cloud', '../../../cloud/src/interceptors/audit.interceptor.ts'],
]) {
  test(`${runtime} audit attribution ignores caller-supplied body user IDs`, () => {
    const interceptor = new (loadAuditInterceptor(file))({});
    assert.equal(interceptor.extractUserId({ body: { userId: 'forged-actor' } }), undefined);
    assert.equal(interceptor.extractUserId({ user: { userId: 'db-authenticated-actor' }, body: { userId: 'forged-actor' } }), 'db-authenticated-actor');
  });

  test(`${runtime} successful mutation audit uses the actor tenant captured before the handler`, async () => {
    const entries = [];
    const lookupOrder = [];
    const prisma = {
      user: { findUnique: async ({ where, select }) => {
        lookupOrder.push({ where, select });
        return { companyId: 'tenant-at-request-start' };
      } },
      auditLog: { create: async ({ data }) => { entries.push(data); return data; } },
    };
    const interceptor = new (loadAuditInterceptor(file))(prisma);
    const request = {
      method: 'PUT', url: '/api/crud/vendors/vendor-1',
      route: { path: '/api/crud/vendors/:id' }, params: { id: 'vendor-1' },
      user: { userId: 'actor-1' }, body: { name: 'Changed' }, headers: {},
    };
    const result = await interceptor.intercept(httpContext(request), { handle: () => of({ id: 'vendor-1' }) });
    await firstValueFrom(result);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(lookupOrder[0], {
      where: { id: 'actor-1' }, select: { companyId: true },
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].companyId, 'tenant-at-request-start');
    assert.equal(entries[0].userId, 'actor-1');
    assert.equal(entries[0].entityId, 'vendor-1');
  });
}
