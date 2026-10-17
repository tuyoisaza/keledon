const assert = require('node:assert/strict');
const { Denied, CrudService } = require('./approved-management-policy.harness');

async function main() {
  const calls = { list: [], teams: [], delete: [], create: [] };
  const prisma = {
    managedInterface: {
      findMany: async (query) => {
        calls.list.push(query);
        const candidates = [
          { id: 'interface-a', companyId: 'co-a', name: 'CRM A', credentials: '{"secret":"a"}' },
          { id: 'interface-b', companyId: 'co-b', name: 'CRM B', credentials: '{"secret":"b"}' },
          { id: 'interface-global', companyId: null, name: 'Global CRM', credentials: '{"secret":"global"}' },
        ];
        return candidates.filter((row) =>
          (!query.where?.companyId || row.companyId === query.where.companyId) &&
          (!query.where?.id?.in || query.where.id.in.includes(row.id)),
        );
      },
    },
    teamInterface: {
      findMany: async ({ where }) => {
        calls.teams.push(where);
        return [
          { managedInterface: { id: 'interface-a', companyId: 'co-a', name: 'CRM A', credentials: 'secret' } },
          { managedInterface: { id: 'interface-global', companyId: null, name: 'Global CRM', credentials: 'secret' } },
        ].filter(({ managedInterface }) => managedInterface.companyId === where.managedInterface.companyId);
      },
    },
    $transaction: async (callback) => callback({
      team: {
        findFirst: async ({ where }) =>
          where.id === 'team-a' && where.brand.companyId === 'co-a'
            ? { id: 'team-a' }
            : null,
      },
      teamInterface: {
        deleteMany: async ({ where }) => { calls.delete.push(where); return { count: 1 }; },
        createMany: async ({ data }) => { calls.create.push(data); return { count: data.length }; },
      },
    }),
  };
  const service = new CrudService(prisma, {}, {}, {}, {}, {}, {});

  const catalog = await service.getManagedInterfaces('co-a');
  assert.equal(JSON.stringify(calls.list[0].where), JSON.stringify({ companyId: 'co-a' }));
  assert.equal(JSON.stringify(catalog.map(({ id }) => id)), JSON.stringify(['interface-a']));
  assert.equal('credentials' in catalog[0], false);
  assert.equal(catalog[0].hasCredentials, true);

  const assigned = await service.getTeamInterfaces('team-a', 'co-a');
  assert.equal(JSON.stringify(calls.teams[0].managedInterface), JSON.stringify({ companyId: 'co-a' }));
  assert.equal(JSON.stringify(assigned.map(({ id }) => id)), JSON.stringify(['interface-a']));
  assert.equal('credentials' in assigned[0], false);

  assert.equal(JSON.stringify(await service.setTeamInterfaces('team-a', ['interface-a'], 'co-a')), JSON.stringify({ count: 1 }));
  assert.equal(JSON.stringify(calls.delete[0]), JSON.stringify({
    teamId: 'team-a',
    managedInterface: { companyId: 'co-a' },
  }));
  assert.equal(JSON.stringify(calls.create[0]), JSON.stringify([{ teamId: 'team-a', interfaceId: 'interface-a' }]));

  await assert.rejects(
    () => service.setTeamInterfaces('team-a', ['interface-b'], 'co-a'),
    Denied,
    'foreign-tenant catalog entries must be rejected',
  );
  await assert.rejects(
    () => service.setTeamInterfaces('team-b', ['interface-a'], 'co-a'),
    Denied,
    'a tenant must not assign interfaces to another tenant team',
  );

  console.log('PASS tenant interface scope: company-only catalog, masked credentials, foreign catalog/team denial, and preservation of platform assignments.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
