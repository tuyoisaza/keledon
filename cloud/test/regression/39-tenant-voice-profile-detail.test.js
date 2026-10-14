const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  context,
  CrudAccessGuard,
  Denied,
  load,
} = require('./admin-boundaries.test-helpers');

async function main() {
  const controllerSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/controllers/tenant.controller.ts'),
    'utf8',
  );
  assert.match(controllerSource, /@Get\('voice-profiles\/:id'\)/);
  assert.match(controllerSource, /@Put\('voice-profiles\/:id'\)/);

  const profile = {
    id: 'vp-a',
    companyId: 'co-a',
    name: 'Company A voice',
    providerId: 'tts-openai',
    language: 'es',
    isEnabled: true,
    isDefault: false,
    config: '{"apiKey":"synthetic-secret"}',
    providerCatalog: { metadata: 'synthetic-catalog-secret' },
  };
  const queries = [];
  const rows = {
    user: {
      findUnique: async () => ({
        id: 'admin',
        role: 'admin',
        companyId: 'co-a',
        teamId: 'team-a',
      }),
    },
    tenantVoiceProfile: {
      findUnique: async ({ where }) => ({
        companyId: where.id === 'vp-a' ? 'co-a' : 'co-b',
      }),
      findFirst: async (query) => {
        queries.push(query);
        return Object.fromEntries(
          Object.keys(query.select).map((key) => [key, profile[key]]),
        );
      },
    },
  };
  const CrudService = load('crud/crud.service.ts').CrudService;
  const TenantController = load(
    'controllers/tenant.controller.ts',
  ).TenantController;
  const service = Object.create(CrudService.prototype);
  service.prisma = rows;
  const controller = new TenantController(service);
  const detail = await controller.getTenantVoiceProfile('vp-a', {
    actor: { role: 'admin', companyId: 'co-a' },
  });

  assert.equal(detail.id, 'vp-a');
  assert.equal(queries[0].where.companyId, 'co-a');
  assert.deepEqual(Object.keys(queries[0].select), [
    'id',
    'name',
    'providerId',
    'language',
    'isEnabled',
    'isDefault',
  ]);
  assert.equal('config' in detail, false);
  assert.equal('providerCatalog' in detail, false);
  assert.equal(JSON.stringify(detail).includes('synthetic-secret'), false);

  const guard = new CrudAccessGuard(rows);
  const request = (id) => ({
    method: 'GET',
    route: { path: '/api/tenant/voice-profiles/:id' },
    params: { id },
    query: {},
    user: { userId: 'admin' },
  });
  const authorize = (req) =>
    guard.canActivate({
      ...context(req),
      getHandler: () => ({ name: 'getTenantVoiceProfile' }),
    });
  assert.equal(await authorize(request('vp-a')), true);
  await assert.rejects(authorize(request('vp-b')), Denied);

  console.log(
    'PASS Cloud tenant voice-profile detail is company-scoped and omits config/provider metadata',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
