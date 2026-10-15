// Real Nest controllers/guards over an in-process HTTP server; isolated persistence/services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const ts = require('typescript');
require('reflect-metadata');
// Password authentication is outside this signed-token wiring test; native bcrypt
// is deliberately not built by locked dependency restoration with --ignore-scripts.
require.cache[require.resolve('bcrypt')] = {
  exports: {
    hash: async () => {
      throw new Error('Unexpected password hash call');
    },
    compare: async () => {
      throw new Error('Unexpected password comparison');
    },
  },
};
require.extensions['.ts'] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
};
const { Test } = require('@nestjs/testing');
const { Reflector } = require('@nestjs/core');
const { ConfigService } = require('@nestjs/config');
const request = require('supertest');
const { PrismaService } = require('../../src/prisma/prisma.service.ts');
const { AuthGuard } = require('../../src/guards/auth.guard.ts');
const { DeviceController } = require('../../src/devices/device.controller.ts');
const { DeviceService } = require('../../src/devices/device.service.ts');
const { FlowController } = require('../../src/flows/flow.controller.ts');
const { FlowService } = require('../../src/flows/flow.service.ts');
const {
  VectorStoreController,
} = require('../../src/vector-store/vector-store.controller.ts');
const {
  VectorStoreService,
} = require('../../src/vector-store/vector-store.service.ts');
const {
  MvpDataController,
} = require('../../src/controllers/mvp-data.controller.ts');
const { MvpStoreService } = require('../../src/mvp/mvp-store.service.ts');
const { TenantFlowConfigService } = require('../../src/mvp/tenant-flow-config.service.ts');
const { CrudController } = require('../../src/crud/crud.controller.ts');
const { CrudService } = require('../../src/crud/crud.service.ts');
const { LocalAuthController } = require('../../src/auth-local/auth-local.controller.ts');
const { LocalAuthService } = require('../../src/auth-local/auth-local.service.ts');
const { AuthAttemptGuard } = require('../../src/guards/auth-attempt.guard.ts');
const { SuperAdminGuard } = require('../../src/guards/roles.guard.ts');
const { UatTestProfilesService } = require('../../src/auth-local/uat-test-profiles.service.ts');

async function main() {
  process.env.KELEDON_AUTH_SECRET = 'isolated-http-wiring-secret';
  process.env.KELEDON_DEPLOYMENT_ENV = 'staging';
  process.env.KELEDON_ENABLE_UAT_TEST_PROFILES = 'true';
  process.env.KELEDON_UAT_TEST_PROFILE_IDS = 'profile-admin,real-user';
  const actors = {
    member: { id: 'member', role: 'user', companyId: 'co-a', teamId: 'team-a' },
    'user-a': { id: 'user-a', role: 'user', companyId: 'co-a', teamId: 'team-a' },
    guest: { id: 'guest', role: 'guest', companyId: 'co-a', teamId: 'team-a' },
    agent: { id: 'agent', role: 'agent', companyId: 'co-a', teamId: 'team-a' },
    admin: { id: 'admin', role: 'admin', companyId: 'co-a', teamId: 'team-a' },
    coordinator: { id: 'coordinator', role: 'coordinator', companyId: 'co-a', teamId: 'team-a' },
    'profile-admin': { id: 'profile-admin', name: 'QA Admin', email: 'qa-admin@example.invalid', role: 'admin', companyId: 'co-a', teamId: 'team-a' },
    'real-user': { id: 'real-user', name: 'Real Account', email: 'person@example.com', role: 'user', companyId: 'co-a', teamId: 'team-a' },
    superadmin: {
      id: 'superadmin',
      role: 'superadmin',
      companyId: 'co-a',
      teamId: 'team-a',
    },
  };
  const auditEntries = [];
  const prisma = {
    user: {
      findUnique: async ({ where }) => actors[where.id] || null,
      findMany: async ({ where }) => where.id.in.map((id) => actors[id]).filter(Boolean),
    },
    auditLog: {
      create: async ({ data }) => {
        const row = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        auditEntries.push(row);
        return row;
      },
      findFirst: async ({ where }) => auditEntries.find((row) =>
        row.entity === where.entity && row.entityId === where.entityId && row.action === where.action,
      ) || null,
    },
    device: {
      findFirst: async ({ where }) =>
        where.authToken === 'paired-device-token'
          ? {
              id: 'device-a',
              authToken: 'paired-device-token',
              userId: 'member',
              keledonId: 'k-a',
              status: 'paired',
              user: actors.member,
            }
          : null,
      findUnique: async ({ where }) => ({
        id: where.id,
        organizationId: where.id === 'device-a' ? 'co-a' : 'co-b',
        userId: 'member',
      }),
    },
    team: {
      findFirst: async ({ where }) =>
        ['team-a', 'team-c'].includes(where.id) ? { id: where.id } : null,
    },
    flow: {
      findUnique: async ({ where }) => ({
        id: where.id,
        teamId: where.id === 'flow-a' ? 'team-a' : 'team-b',
      }),
    },
    keledon: {
      findUnique: async () => ({
        id: 'k-a',
        isActive: true,
        userId: 'member',
        teamId: 'team-a',
        team: {
          id: 'team-a',
          brand: {
            id: 'brand-a',
            companyId: 'co-a',
            name: 'Brand A',
            company: { name: 'Company A' },
          },
        },
      }),
    },
  };
  let writes = 0,
    lastVectorScope,
    userListScope,
    managedInterfaceReads = 0,
    updatedUser,
    auditReads = 0,
    launchedActor;
  const module = await Test.createTestingModule({
    controllers: [
      DeviceController,
      FlowController,
      VectorStoreController,
      MvpDataController,
      CrudController,
      LocalAuthController,
    ],
    providers: [
      { provide: PrismaService, useValue: prisma },
      { provide: TenantFlowConfigService, useValue: {} },
      { provide: LocalAuthService, useFactory: () => {
        const service = new LocalAuthService(prisma);
        service.getCrudData = async () => ({ companies: [], brands: [], teams: [] });
        return service;
      } },
      { provide: UatTestProfilesService, useClass: UatTestProfilesService },
      { provide: AuthAttemptGuard, useClass: AuthAttemptGuard },
      { provide: SuperAdminGuard, useValue: new SuperAdminGuard(prisma) },
      { provide: require('../../src/auth-local/google-oauth.service.ts').GoogleOAuthService, useValue: {} },
      { provide: ConfigService, useValue: { get: () => undefined } },
      {
        provide: CrudService,
        useValue: {
          getHealth: async () => ({
            status: 'ok',
            env: { CLOUD_HOST: 'cloud.example.invalid' },
          }),
          getUsers: async (companyId) => {
            userListScope = companyId;
            return [];
          },
          getAuditLogs: async () => {
            auditReads++;
            return { data: [], pagination: { total: 0 } };
          },
          getUser: async (id) => ({ id }),
          getManagedInterface: async (id) => {
            managedInterfaceReads++;
            return { id, name: 'CRM fixture', hasCredentials: true };
          },
          updateUser: async (id, data) => {
            updatedUser = { id, ...data };
            return updatedUser;
          },
          generateKeledonLaunchLink: async (_id, userId) => {
            launchedActor = userId;
            return { success: true };
          },
        },
      },
      {
        provide: DeviceService,
        useValue: {
          pairDevice: async () => ({ device_id: 'isolated-pair-fixture' }),
          getRpaProviderConfig: async () => ({
            providers: { crm: { apiKey: 'runtime-only-secret' } },
          }),
          updateRpaProviderConfig: async () => {
            writes++;
            return { success: true };
          },
          getDevicesByOrganization: async () => [
            {
              id: 'device-a',
              authToken: 'hidden-token',
              pairingCode: 'hidden-code',
              pairingCodeExpiresAt: new Date(),
              rpaProviderConfig:
                '{"providers":{"crm":{"apiKey":"list-only-secret"}}}',
              cdpUrl: 'ws://127.0.0.1:9222/devtools/browser/list-only',
              status: 'paired',
            },
          ],
          getDevicesByUser: async () => [],
        },
      },
      { provide: FlowService, useValue: { findOne: async (id) => ({ id }) } },
      {
        provide: VectorStoreService,
        useValue: {
          search: async (_q, scope) => {
            lastVectorScope = scope;
            return { results: [] };
          },
        },
      },
      {
        provide: MvpStoreService,
        useValue: {
          getTechStatus: () => ({
            server: {
              status: 'online',
              uptime: 456,
              nodeVersion: 'node-fixture',
              memoryUsage: { used: 10, total: 20, percentage: 50 },
            },
            techStack: [{ name: 'NestJS', version: '11', category: 'backend' }],
            dependencies: [{ name: 'fixture-package', hasUpdate: true }],
          }),
          getProviderCatalog: () => [],
          getRpaProviders: () => [],
          getTTSConfig: () => ({
            apiKey: 'hidden-provider-key',
            providerId: 'test',
          }),
          getCloudConfig: () => ({
            api_url: 'https://example.invalid',
            ws_url: 'wss://example.invalid',
            secret: 'hidden',
          }),
        },
      },
    ],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  app.useGlobalGuards(new AuthGuard(app.get(Reflector), prisma));
  await app.init();
  const token = (userId) => {
    const encoded = Buffer.from(
      JSON.stringify({
        userId,
        email: 'fixture@example.invalid',
        role: 'superadmin',
        expiresAt: Date.now() + 60000,
      }),
    ).toString('base64');
    return `Bearer ${encoded}.${crypto.createHmac('sha256', process.env.KELEDON_AUTH_SECRET).update(encoded).digest('hex')}`;
  };
  let interfaceLookup;
  const interfaceService = new CrudService(
    {
      managedInterface: {
        findUnique: async (query) => {
          interfaceLookup = query;
          return {
            id: 'interface-a',
            name: 'CRM fixture',
            baseUrl: 'https://crm.example.invalid',
            category: 'case',
            providerKey: 'fixture',
            capabilities: null,
            icon: null,
            status: 'connected',
            credentials: '{"apiKey":"must-not-leak"}',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          };
        },
      },
    },
    {}, {}, {}, {}, {}, {},
  );
  const safeInterface = await interfaceService.getManagedInterface('interface-a');
  assert.equal(interfaceLookup.where.id, 'interface-a');
  assert.equal(interfaceLookup.select.credentials, true);
  assert.equal(safeInterface.hasCredentials, true);
  assert.equal('credentials' in safeInterface, false);
  const missingInterfaceService = new CrudService(
    { managedInterface: { findUnique: async () => null } },
    {}, {}, {}, {}, {}, {},
  );
  assert.equal(await missingInterfaceService.getManagedInterface('missing'), null);
  try {
    const http = app.getHttpServer();
    await request(http)
      .post('/api/crud/migrate')
      .set('Authorization', token('superadmin'))
      .expect(410);
    await request(http)
      .post('/api/crud/seed')
      .set('Authorization', token('superadmin'))
      .expect(410);
    const testProfiles = await request(http)
      .get('/api/auth/uat-test-profiles')
      .set('Authorization', token('superadmin'))
      .expect(200);
    assert.deepEqual(testProfiles.body.profiles, [
      { id: 'profile-admin', name: 'QA Admin', role: 'admin' },
    ]);
    await request(http)
      .get('/api/auth/uat-test-profiles')
      .set('Authorization', token('admin'))
      .expect(403);
    await request(http)
      .post('/api/auth/uat-test-profiles/switch')
      .set('Authorization', token('admin'))
      .send({ profileId: 'profile-admin' })
      .expect(403);
    await request(http)
      .post('/api/auth/uat-test-profiles/switch')
      .set('Authorization', token('superadmin'))
      .send({ profileId: 'real-user' })
      .expect(404);
    const switched = await request(http)
      .post('/api/auth/uat-test-profiles/switch')
      .set('Authorization', token('superadmin'))
      .send({ profileId: 'profile-admin' })
      .expect(201);
    assert.equal(switched.body.user.id, 'profile-admin');
    assert.equal(switched.body.user.role, 'admin');
    assert.equal(switched.body.user.uatTestProfile, true);
    assert.equal(auditEntries[0].userId, 'superadmin');
    assert.equal(auditEntries[0].action, 'UAT_TEST_PROFILE_START');
    const profileMe = await request(http)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${switched.body.token}`)
      .expect(200);
    assert.equal(profileMe.body.user.id, 'profile-admin');
    assert.equal(profileMe.body.user.uatTestProfile, true);
    await request(http)
      .post('/api/auth/uat-test-profiles/return')
      .set('Authorization', token('superadmin'))
      .send({ sessionId: switched.body.sessionId })
      .expect(201);
    assert.equal(auditEntries[1].userId, 'superadmin');
    assert.equal(auditEntries[1].action, 'UAT_TEST_PROFILE_END');
    await request(http)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${switched.body.token}`)
      .expect(401);
    await request(http)
      .get('/api/auth/me')
      .set('Authorization', token('superadmin'))
      .expect(200);
    process.env.KELEDON_ENABLE_UAT_TEST_PROFILES = 'false';
    await request(http)
      .get('/api/auth/uat-test-profiles')
      .set('Authorization', token('superadmin'))
      .expect(404);
    await request(http).get('/api/crud/health').expect(401);
    await request(http)
      .get('/api/crud/health')
      .set('Authorization', token('member'))
      .expect(403);
    const crudHealth = await request(http)
      .get('/api/crud/health')
      .set('Authorization', token('superadmin'))
      .expect(200);
    assert.equal(crudHealth.body.status, 'ok');
    assert.equal(crudHealth.body.env.CLOUD_HOST, 'cloud.example.invalid');
    assert.equal('errors' in crudHealth.body, false);
    await request(http)
      .get('/api/crud/interfaces/interface-a')
      .set('Authorization', token('admin'))
      .expect(403);
    const managedInterface = await request(http)
      .get('/api/crud/interfaces/interface-a')
      .set('Authorization', token('superadmin'))
      .expect(200);
    assert.deepEqual(managedInterface.body, {
      id: 'interface-a',
      name: 'CRM fixture',
      hasCredentials: true,
    });
    assert.equal(managedInterfaceReads, 1);
    await request(http)
      .get('/api/crud/audit-logs')
      .set('Authorization', token('admin'))
      .expect(403);
    const auditLogs = await request(http)
      .get('/api/crud/audit-logs')
      .set('Authorization', token('superadmin'))
      .expect(200);
    assert.deepEqual(auditLogs.body.data, []);
    assert.equal(auditReads, 1);
    await request(http)
      .post('/api/crud/audit-logs')
      .set('Authorization', token('superadmin'))
      .send({ userId: 'member', action: 'FORGED', entity: 'company' })
      .expect(404);
    await request(http)
      .put('/api/crud/users/user-a')
      .set('Authorization', token('admin'))
      .send({ teamId: 'team-c' })
      .expect(200);
    assert.deepEqual(updatedUser, { id: 'user-a', teamId: 'team-c' });
    await request(http)
      .put('/api/crud/users/user-a')
      .set('Authorization', token('admin'))
      .send({ teamId: 'team-b' })
      .expect(403);
    await request(http)
      .put('/api/crud/users/user-a')
      .set('Authorization', token('admin'))
      .send({ companyId: 'co-b' })
      .expect(403);
    await request(http)
      .put('/api/crud/users/user-a')
      .set('Authorization', token('admin'))
      .send({ role: 'admin' })
      .expect(403);
    assert.deepEqual(updatedUser, { id: 'user-a', teamId: 'team-c' });
    for (let attempt = 0; attempt < 20; attempt++) {
      await request(http).post('/api/devices/pair').send({ pairing_code: 'isolated-proof' }).expect(201);
    }
    await request(http).post('/api/devices/pair').send({ pairing_code: 'isolated-proof' }).expect(429);
    await request(http).get('/api/crud/users').expect(401);
    await request(http)
      .get('/api/crud/users')
      .set('Authorization', token('member'))
      .expect(403);
    await request(http)
      .get('/api/crud/users?companyId=co-b')
      .set('Authorization', token('admin'))
      .expect(200);
    assert.equal(userListScope, 'co-a');
    await request(http)
      .get('/api/crud/users/foreign-user')
      .set('Authorization', token('admin'))
      .expect(403);
    await request(http)
      .get('/api/crud/users/member')
      .set('Authorization', token('admin'))
      .expect(200);
    await request(http)
      .post('/api/crud/users')
      .set('Authorization', token('admin'))
      .send({ email: 'fixture@example.invalid', role: 'superadmin' })
      .expect(403);
    await request(http)
      .post('/api/crud/keledons/k-a/launch')
      .set('Authorization', token('member'))
      .send({ userId: 'superadmin' })
      .expect(201);
    assert.equal(launchedActor, 'member');
    await request(http)
      .put('/api/devices/device-a/rpa-config')
      .send({})
      .expect(401);
    await request(http).get('/api/devices/device-a/rpa-config').expect(403);
    for (const human of [
      'guest',
      'member',
      'agent',
      'admin',
      'coordinator',
      'superadmin',
    ]) {
      await request(http)
        .get('/api/devices/device-a/rpa-config')
        .set('Authorization', token(human))
        .expect(403);
    }
    await request(http)
      .get('/api/devices/device-b/rpa-config')
      .set('Authorization', 'Bearer paired-device-token')
      .expect(403);
    const runtimeRpaConfig = await request(http)
      .get('/api/devices/device-a/rpa-config')
      .set('Authorization', 'Bearer paired-device-token')
      .expect(200);
    assert.equal(
      runtimeRpaConfig.body.providers.crm.apiKey,
      'runtime-only-secret',
    );
    await request(http).get('/api/devices/debug/device/k-a').expect(401);
    await request(http)
      .post('/api/devices/pairing-code')
      .send({ keledon_id: 'k-a' })
      .expect(401);
    await request(http)
      .put('/api/devices/device-b/rpa-config')
      .set('Authorization', token('admin'))
      .send({})
      .expect(403);
    await request(http)
      .put('/api/devices/device-a/rpa-config')
      .set('Authorization', token('member'))
      .send({})
      .expect(403);
    assert.equal(writes, 0);
    await request(http)
      .put('/api/devices/device-a/rpa-config')
      .set('Authorization', token('admin'))
      .send({})
      .expect(200);
    assert.equal(writes, 1);
    await request(http)
      .get('/api/flows/flow-b')
      .set('Authorization', token('admin'))
      .expect(403);
    await request(http)
      .get('/api/flows/flow-a')
      .set('Authorization', token('admin'))
      .expect(200);
    await request(http)
      .get('/api/flows/flow-a')
      .set('Authorization', token('deleted-actor'))
      .expect(403);
    await request(http)
      .get('/api/tts-config')
      .set('Authorization', token('member'))
      .expect(403);
    await request(http)
      .get('/api/tech-status')
      .set('Authorization', token('member'))
      .expect(403);
    await request(http)
      .get('/api/provider-catalog')
      .set('Authorization', token('member'))
      .expect(403);
    const safeTechStatus = await request(http)
      .get('/api/tech-status')
      .set('Authorization', token('admin'))
      .expect(200);
    assert.deepEqual(safeTechStatus.body, {
      detailsAvailable: false,
      server: { status: 'online' },
      techStack: [],
      dependencies: [],
    });
    const detailedTechStatus = await request(http)
      .get('/api/tech-status')
      .set('Authorization', token('superadmin'))
      .expect(200);
    assert.equal(detailedTechStatus.body.detailsAvailable, true);
    assert.equal(detailedTechStatus.body.server.nodeVersion, 'node-fixture');
    const config = await request(http)
      .get('/api/tts-config')
      .set('Authorization', token('superadmin'))
      .expect(200);
    assert.equal(config.body.apiKey, '');
    assert.equal(config.body.apiKeySet, true);
    const devices = await request(http)
      .get('/api/devices')
      .set('Authorization', token('admin'))
      .set('x-user-id', 'victim')
      .expect(200);
    assert.equal(JSON.stringify(devices.body).includes('hidden-'), false);
    assert.equal(JSON.stringify(devices.body).includes('list-only-secret'), false);
    assert.equal(JSON.stringify(devices.body).includes('devtools/browser'), false);
    assert.equal(devices.body[0].rpaProviderConfig, undefined);
    assert.equal(devices.body[0].cdpUrl, undefined);
    assert.equal(devices.body[0].hasRpaProviderConfig, true);
    assert.equal(devices.body[0].hasCdpUrl, true);
    const cloud = await request(http).get('/api/cloud-config').expect(200);
    assert.equal(cloud.body.secret, undefined);
    await request(http)
      .post('/api/vector-store/search')
      .set('Authorization', token('member'))
      .send({ query: 'fixture', company_id: 'co-b', team_id: 'team-b' })
      .expect(201);
    assert.equal(lastVectorScope.company_id, 'co-a');
    assert.equal(lastVectorScope.team_id, 'team-a');
    console.log(
      'PASS real Nest HTTP guard wiring: anonymous/role/tenant denials, audited UAT profile selection/return, token revocation and safe API projections.',
    );
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
