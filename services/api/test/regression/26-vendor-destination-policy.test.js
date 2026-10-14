const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  getVendorAllowedOrigins,
  isAllowedVendorDestination,
  normalizeVendorAllowedOrigins,
  normalizeVendorBaseUrl,
} = require('../../dist/vendor-url-policy.js');
const { CrudVendorService } = require('../../dist/crud/crud-vendor.service.js');

test('vendor URLs accept client-configured private HTTP(S) origins and reject unsafe inputs', () => {
  const base = normalizeVendorBaseUrl('http://192.168.1.20:8080/login');
  const origins = normalizeVendorAllowedOrigins(base, ['https://crm.customer.test', 'http://127.0.0.1:3000']);
  assert.deepEqual(origins, ['http://127.0.0.1:3000', 'http://192.168.1.20:8080', 'https://crm.customer.test']);
  assert.equal(isAllowedVendorDestination('http://192.168.1.20:8080/call/1', origins), true);
  assert.equal(isAllowedVendorDestination('http://127.0.0.1:3000/crm', origins), true);
  assert.equal(isAllowedVendorDestination('http://127.0.0.1:3001/', origins), false);
  assert.equal(isAllowedVendorDestination('https://crm.customer.test@attacker.test/', origins), false);
  assert.equal(isAllowedVendorDestination('file:///etc/passwd', origins), false);
  assert.throws(() => normalizeVendorBaseUrl('https://user:secret@crm.customer.test/'));
  assert.throws(() => normalizeVendorBaseUrl('http://127.0.0.1/token?key=secret'));
  assert.throws(() => normalizeVendorAllowedOrigins(base, ['https://crm.customer.test/settings']));
  assert.throws(() => normalizeVendorAllowedOrigins(base, Array.from({ length: 32 }, (_, i) => `https://crm-${i}.customer.test`)));
});

test('legacy or malformed persisted allowlists retain only the valid base and entries', () => {
  assert.deepEqual(
    getVendorAllowedOrigins('http://127.0.0.1:8080/', ['https://crm.customer.test', 'javascript:alert(1)']),
    ['http://127.0.0.1:8080', 'https://crm.customer.test'],
  );
});

test('vendor CRUD persists tenant origins while projecting only safe fields', async () => {
  const stored = {
    id: 'vendor-a', teamId: 'team-a', name: 'Local CRM', type: 'crm',
    baseUrl: 'http://192.168.1.20:8080/login', username: 'operator',
    password: 'encrypted-password', apiKey: 'encrypted-api-key', isActive: true,
    config: { integrationSecret: 'must-not-leak', allowedOrigins: ['https://crm.customer.test'] },
    startGoal: 'open calls', createdAt: new Date(0), updatedAt: new Date(0),
  };
  let createData;
  let updateData;
  let createCalls = 0;
  let updateCalls = 0;
  let currentConfig = { allowedOrigins: ['https://crm.customer.test'] };
  const prisma = { vendor: {
    findMany: async () => [stored],
    findUnique: async () => ({ ...stored, config: currentConfig }),
    create: async ({ data }) => { createCalls++; createData = data; return { ...stored, ...data }; },
    update: async ({ data }) => { updateCalls++; updateData = data; return { ...stored, ...data }; },
  } };
  const service = new CrudVendorService(prisma);
  const list = await service.getVendors('team-a');
  assert.deepEqual(list[0].allowedOrigins, ['http://192.168.1.20:8080', 'https://crm.customer.test']);
  assert.equal('config' in list[0], false);
  assert.equal('password' in list[0], false);
  assert.equal('apiKey' in list[0], false);
  assert.equal(list[0].hasPassword, true);

  const created = await service.createVendor({ teamId: 'team-a', name: 'New CRM', type: 'crm', baseUrl: 'http://127.0.0.1:8080', allowedOrigins: ['http://127.0.0.1:9000'] });
  assert.deepEqual(createData.config.allowedOrigins, ['http://127.0.0.1:8080', 'http://127.0.0.1:9000']);
  assert.equal('config' in created, false);
  await assert.rejects(service.createVendor({ teamId: 'team-a', name: 'Unsafe CRM', type: 'crm', config: { auth: { client_secret: 'synthetic-secret' } } }), /not supported/);
  await assert.rejects(service.createVendor({ teamId: 'team-a', name: 'Unsafe CRM', type: 'crm', config: ['not', 'an', 'object'] }), /JSON object/);
  await assert.rejects(service.updateVendor('vendor-a', { config: { provider: { refreshToken: 'synthetic-token' } } }), /not supported/);
  await service.createVendor({ teamId: 'team-a', name: 'Configured CRM', type: 'crm', baseUrl: 'http://127.0.0.1:8080', config: { allowedOrigins: ['http://127.0.0.1:9000'] } });
  assert.deepEqual(createData.config.allowedOrigins, ['http://127.0.0.1:8080', 'http://127.0.0.1:9000']);
  await service.updateVendor('vendor-a', { allowedOrigins: ['http://127.0.0.1:8080'] });
  assert.deepEqual(updateData.config.allowedOrigins, ['http://127.0.0.1:8080', 'http://192.168.1.20:8080']);
  assert.equal('allowedOrigins' in updateData, false);
  currentConfig = { integrationSecret: 'legacy-plaintext' };
  await assert.rejects(service.updateVendor('vendor-a', { name: 'Changed vendor' }), /not supported/);
  assert.equal(createCalls, 2, 'unsafe config must be rejected before create');
  assert.equal(updateCalls, 1, 'unsafe and legacy config must be rejected before update');
});
