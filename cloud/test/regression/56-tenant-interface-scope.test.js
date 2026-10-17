const assert = require('node:assert/strict');
const { Denied, CrudAccessGuard, CrudService } = require('./admin-boundaries.test-helpers');

async function main() {
  const actors = {
    admin: { id: 'admin-a', role: 'admin', companyId: 'co-a', teamId: 'team-a' },
    coordinator: { id: 'coord-a', role: 'coordinator', companyId: 'co-a', teamId: 'team-a' },
    agent: { id: 'agent-a', role: 'agent', companyId: 'co-a', teamId: 'team-a' },
  };
  const prisma = {
    user: { findUnique: async ({ where }) => actors[where.id.replace(/-a$/, '')] || null },
    team: { findFirst: async ({ where }) => where.id === 'team-a' && where.brand?.companyId === 'co-a' ? { id: 'team-a' } : null },
    managedInterface: {
      findMany: async ({ where }) => (where.companyId === 'co-a' && (!where.id?.in || where.id.in.includes('iface-a')) ? [{ id: 'iface-a' }] : []),
    },
  };
  const guard = new CrudAccessGuard(prisma);
  const authorize = async (actorId, method, path, params = {}, body = {}, handler = 'operation') => {
    const req = { user: { userId: actorId }, method, path, route: { path }, params, body };
    return guard.canActivate({
      getHandler: () => ({ name: handler }),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    });
  };
  assert.equal(await authorize('admin', 'GET', '/api/crud/interfaces'), true);
  assert.equal(await authorize('coordinator', 'GET', '/api/crud/interfaces'), true);
  await assert.rejects(() => authorize('agent', 'GET', '/api/crud/interfaces'), Denied);
  assert.equal(await authorize('admin', 'PUT', '/api/crud/teams/:id/interfaces', { id: 'team-a' }, { interfaceIds: ['iface-a'] }, 'setTeamInterfaces'), true);
  await assert.rejects(() => authorize('admin', 'PUT', '/api/crud/teams/:id/interfaces', { id: 'team-a' }, { interfaceIds: ['iface-b'] }, 'setTeamInterfaces'), Denied);

  const rows = [];
  const service = new CrudService({
    managedInterface: { findMany: async (query) => { rows.push(query); return [{ id: 'iface-a', companyId: 'co-a', name: 'Tenant CRM', credentials: 'synthetic-secret' }]; } },
  }, {}, {}, {}, {}, {}, {}, {});
  const result = await service.getManagedInterfaces('co-a');
  assert.equal(JSON.stringify(rows[0].where), JSON.stringify({ companyId: 'co-a' }));
  assert.equal('credentials' in result[0], false);
  assert.equal(result[0].hasCredentials, true);
  console.log('PASS Cloud tenant interface catalog scope, low-role denial and credential-safe projection.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
