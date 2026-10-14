const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  EscalationAccessGuard,
} = require('../../dist/guards/escalation-access.guard.js');
const {
  EscalationController,
} = require('../../dist/controllers/escalation.controller.js');
const {
  EscalationService,
} = require('../../dist/services/escalation.service.js');

const { ForbiddenException: Denied } = require('@nestjs/common');

function context(req, handler) {
  return {
    getHandler: () => ({ name: handler }),
    switchToHttp: () => ({ getRequest: () => req }),
  };
}

test('Cloud escalation guard derives actor and enforces company/team/session policy', async () => {
  let actor = {
    id: 'admin-a',
    role: 'admin',
    companyId: 'company-a',
    teamId: 'team-a',
    name: 'Admin A',
  };
  const prisma = {
    user: { findUnique: async () => actor },
    team: {
      findMany: async () => [{ id: 'team-a' }, { id: 'team-aa' }],
    },
    session: {
      findUnique: async ({ where }) =>
        where.id === 'own-session'
          ? { id: where.id, userId: 'user-a', teamId: 'team-a' }
          : where.id === 'foreign-session'
            ? { id: where.id, userId: 'user-b', teamId: 'team-b' }
            : null,
    },
    escalationLog: {
      findUnique: async ({ where }) =>
        where.id === 'local'
          ? { id: 'local', teamId: 'team-a' }
          : where.id === 'foreign'
            ? { id: 'foreign', teamId: 'team-b' }
            : null,
    },
  };
  const guard = new EscalationAccessGuard(prisma);
  const run = (handler, params = {}, query = {}) => {
    const req = { user: { userId: actor.id }, params, query };
    return { req, result: guard.canActivate(context(req, handler)) };
  };

  const stats = run('getStats');
  assert.equal(await stats.result, true);
  assert.equal(stats.req.actor.id, 'admin-a');
  assert.deepEqual(stats.req.escalationTeamIds, ['team-a', 'team-aa']);
  await assert.rejects(
    run('getStats', {}, { teamId: 'team-b' }).result,
    Denied,
  );
  await assert.rejects(run('getByTeam', { teamId: 'team-b' }).result, Denied);
  await assert.rejects(
    run('getBySession', { sessionId: 'foreign-session' }).result,
    Denied,
  );
  assert.equal(await run('acknowledge', { id: 'local' }).result, true);
  await assert.rejects(run('resolve', { id: 'foreign' }).result, Denied);

  actor = { ...actor, id: 'user-a', role: 'user', teamId: 'team-a' };
  assert.equal(
    await run('getBySession', { sessionId: 'own-session' }).result,
    true,
  );
  await assert.rejects(run('getActive').result, Denied);
  await assert.rejects(run('acknowledge', { id: 'local' }).result, Denied);

  actor = { id: 'root', role: 'superadmin', companyId: null, teamId: null };
  assert.equal(await run('getActive').result, true);
});

test('Cloud escalation controller ignores caller identity and uses DB-derived actor', async () => {
  const calls = [];
  const service = {
    acknowledge: async (...args) => {
      calls.push(['acknowledge', ...args]);
      return { id: args[0], acknowledgedBy: args[1] };
    },
    getStats: async (...args) => {
      calls.push(['stats', ...args]);
      return {};
    },
    getActive: async (...args) => {
      calls.push(['active', ...args]);
      return [];
    },
  };
  const controller = new EscalationController(service);
  await controller.acknowledge('local', {
    actor: { id: 'admin-a' },
    body: { acknowledgedBy: 'forged-user' },
  });
  assert.deepEqual(calls[0], ['acknowledge', 'local', 'admin-a']);

  await controller.getStats(
    { escalationTeamId: undefined, escalationTeamIds: ['team-a', 'team-aa'] },
    undefined,
  );
  assert.deepEqual(calls[1], ['stats', undefined, ['team-a', 'team-aa']]);
  await controller.getActive(
    { actor: { role: 'admin' }, escalationTeamIds: ['team-a', 'team-aa'] },
    '25',
  );
  assert.deepEqual(calls[2], ['active', 25, ['team-a', 'team-aa']]);
  await controller.getActive({ actor: { role: 'superadmin' } }, undefined);
  assert.deepEqual(calls[3], ['active', 100, undefined]);
});

test('Cloud aggregate escalation queries accept only the guard-provided tenant filter', async () => {
  const reads = [];
  const prisma = {
    escalationLog: {
      findMany: async (query) => {
        reads.push(['findMany', query]);
        return [];
      },
      count: async (query) => {
        reads.push(['count', query]);
        return 0;
      },
    },
  };
  const service = new EscalationService(prisma);
  await service.getActive(25, ['team-a', 'team-aa']);
  assert.deepEqual(reads[0][1].where, {
    status: 'triggered',
    teamId: { in: ['team-a', 'team-aa'] },
  });

  reads.length = 0;
  await service.getStats(undefined, ['team-a', 'team-aa']);
  assert.equal(reads.length, 5);
  assert.ok(
    reads.every(
      ([kind, query]) =>
        kind === 'count' &&
        query.where.teamId?.in?.join(',') === 'team-a,team-aa',
    ),
  );
});
