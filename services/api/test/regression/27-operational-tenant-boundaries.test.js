// Production guards are exercised with isolated Prisma fixtures; no services or providers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

class Denied extends Error {}
const decorator = () => () => {};
const common = new Proxy(
  {
    ForbiddenException: Denied,
    UnauthorizedException: Denied,
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
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    Date,
    process,
    console,
    require: (name) => {
      if (name === '@nestjs/common') return common;
      if (name === '@nestjs/swagger') return common;
      return adapters[name] || {};
    },
  });
  return module.exports;
}
const context = (req, handler) => ({
  getHandler: () => ({ name: handler }),
  switchToHttp: () => ({ getRequest: () => req }),
});

async function main() {
  const { EscalationAccessGuard } = load('guards/escalation-access.guard.ts');
  const { SuperAdminGuard } = load('guards/roles.guard.ts');
  const { ListeningSessionService } = load(
    'listening-sessions/listening-session.service.ts',
    {
      uuid: { v4: () => '8f19ae82-d985-47df-a332-022715331391' },
    },
  );
  let actor = {
    id: 'manager-a',
    role: 'admin',
    companyId: 'co-a',
    teamId: 'team-a',
    name: 'Manager A',
  };
  const prisma = {
    user: { findUnique: async () => actor },
    team: { findMany: async () => [{ id: 'team-a' }, { id: 'team-aa' }] },
    session: {
      findUnique: async ({ where }) =>
        where.id === 'session-own'
          ? { id: 'session-own', userId: 'user-a', teamId: 'team-a' }
          : where.id === 'session-peer'
            ? { id: 'session-peer', userId: 'user-peer', teamId: 'team-a' }
            : where.id === 'session-other'
              ? { id: 'session-other', userId: 'user-b', teamId: 'team-b' }
              : null,
    },
    escalationLog: {
      findUnique: async ({ where }) =>
        where.id === 'esc-a'
          ? { id: 'esc-a', teamId: 'team-a' }
          : where.id === 'esc-b'
            ? { id: 'esc-b', teamId: 'team-b' }
            : null,
    },
  };
  const guard = new EscalationAccessGuard(prisma);
  const run = (handler, userId = actor.id, params = {}, query = {}) => {
    const req = { user: { userId }, params, query };
    return { req, result: guard.canActivate(context(req, handler)) };
  };

  const managerStats = run('getStats');
  assert.equal(await managerStats.result, true);
  assert.deepEqual(managerStats.req.escalationTeamIds, ['team-a', 'team-aa']);
  await assert.rejects(run('getByTeam', actor.id, { teamId: 'team-b' }).result, Denied);
  await assert.rejects(
    run('getStats', actor.id, {}, { teamId: 'team-b' }).result,
    Denied,
  );
  await assert.rejects(run('getBySession', actor.id, { sessionId: 'session-other' }).result, Denied);
  assert.equal(
    await run('acknowledge', actor.id, { id: 'esc-a' }).result,
    true,
  );
  await assert.rejects(run('resolve', actor.id, { id: 'esc-b' }).result, Denied);

  actor = { ...actor, id: 'user-a', role: 'user', teamId: 'team-a' };
  assert.equal(
    await run('getBySession', actor.id, { sessionId: 'session-own' }).result,
    true,
  );
  await assert.rejects(run('getBySession', actor.id, { sessionId: 'session-peer' }).result, Denied);
  await assert.rejects(run('getActive').result, Denied);
  await assert.rejects(run('acknowledge', actor.id, { id: 'esc-a' }).result, Denied);

  actor = { ...actor, role: 'superadmin', companyId: null, teamId: null };
  assert.equal(await run('getActive').result, true);
  let currentRole = 'user';
  const roleGuard = new SuperAdminGuard({
    user: { findUnique: async () => ({ role: currentRole }) },
  });
  const roleContext = context({ user: { userId: 'actor', role: 'superadmin' } }, 'list');
  await assert.rejects(roleGuard.canActivate(roleContext), Denied);
  currentRole = 'superadmin';
  assert.equal(await roleGuard.canActivate(roleContext), true);

  const sessions = new ListeningSessionService();
  const session = await sessions.createSession({ source: 'test' });
  assert.ok(session.sessionId.length >= 35, 'session capability must be unguessable');
  assert.equal(sessions.validateSession(session.sessionId), true);
  sessions.getSession(session.sessionId).expiresAt = new Date(0).toISOString();
  assert.equal(sessions.validateSession(session.sessionId), false);
  assert.equal(sessions.getSession(session.sessionId), undefined);

  for (const file of [
    'controllers/analytics.controller.ts',
    'controllers/dashboard.controller.ts',
    'controllers/rbac-analysis.controller.ts',
  ]) {
    assert.match(
      fs.readFileSync(path.resolve(__dirname, '../../src', file), 'utf8'),
      /@UseGuards\(SuperAdminGuard\)/,
      `${file} must protect global system-wide data/actions`,
    );
  }
  assert.match(
    fs.readFileSync(
      path.resolve(__dirname, '../../src/listening-sessions/listening-session.controller.ts'),
      'utf8',
    ),
    /@UseGuards\(RuntimeActorGuard\)/,
  );
  console.log(
    'PASS operational boundaries: DB-derived escalation tenant/user scope; cross-company and low-role mutation denials; current-DB superadmin for global dashboards/RBAC; listening-session authentication, 122-bit capability and expiry.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
