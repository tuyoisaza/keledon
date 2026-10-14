const assert = require('node:assert/strict');
const {
  Denied,
  context,
  CrudAccessGuard,
  CrudService,
  TenantController,
} = require('./approved-management-policy.harness');

async function main() {
  const queries = [];
  const profile = { id: 'vp-a', name: 'Company A voice', providerId: 'tts-openai', language: 'es', isEnabled: true, isDefault: false };
  const service = Object.create(CrudService.prototype);
  service.prisma = { tenantVoiceProfile: {
    findFirst: async (query) => { queries.push(query); return profile; },
    findMany: async (query) => { queries.push(query); return [profile]; },
    create: async (query) => { queries.push(query); return profile; },
    update: async (query) => { queries.push(query); return profile; },
  } };

  const controller = new TenantController(service);
  const detail = await controller.getTenantVoiceProfile('vp-a', { actor: { role: 'admin', companyId: 'co-a' } });
  assert.equal(detail.id, 'vp-a');
  assert.equal(queries.at(-1).where.companyId, 'co-a');
  await controller.getTenantVoiceProfile('vp-a', { actor: { role: 'superadmin', companyId: null } });
  assert.equal(Object.hasOwn(queries.at(-1).where, 'companyId'), false);

  await service.getTenantVoiceProfiles('co-a');
  await service.createTenantVoiceProfile({ companyId: 'co-a', name: 'Company A voice', providerId: 'tts-openai' });
  await service.updateTenantVoiceProfile('vp-a', { name: 'Company A voice' });
  for (const query of queries.slice(-3)) {
    assert.deepEqual(Object.keys(query.select), ['id', 'name', 'providerId', 'language', 'isEnabled', 'isDefault']);
    assert.equal(Object.hasOwn(query.select, 'config'), false);
    assert.equal(Object.hasOwn(query, 'include'), false);
  }

  const prisma = {
    user: { findUnique: async () => ({ id: 'actor', role: 'admin', companyId: 'co-a' }) },
    tenantVoiceProfile: { findUnique: async ({ where }) => ({ companyId: where.id === 'vp-a' ? 'co-a' : 'co-b' }) },
  };
  const guard = new CrudAccessGuard(prisma);
  const request = (method, id, body = {}) => ({
    method,
    route: { path: `/api/tenant/voice-profiles${id ? '/:id' : ''}` },
    params: id ? { id } : {},
    body,
    query: {},
    user: { userId: 'actor' },
  });
  const allow = (req) => guard.canActivate({ ...context(req), getHandler: () => ({ name: 'operation' }) });
  assert.equal(await allow(request('GET', 'vp-a')), true);
  await assert.rejects(allow(request('GET', 'vp-b')), Denied);
  const create = request('POST', null, { name: 'Scoped', providerId: 'tts-openai' });
  assert.equal(await allow(create), true);
  assert.equal(create.body.companyId, 'co-a');

  console.log('PASS Voice Profile safety: tenant detail boundary, safe response projections, and actor-derived create scope.');
}

main().catch((error) => { console.error(error); process.exit(1); });
