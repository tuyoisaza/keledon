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
const { CrudController } = require('../../src/crud/crud.controller.ts');
const { CrudService } = require('../../src/crud/crud.service.ts');
const { CrudMigrationService } = require('../../src/crud/crud-migration.service.ts');

async function main() {
  process.env.KELEDON_AUTH_SECRET = 'isolated-http-wiring-secret';
  const actors = {
    member: { id: 'member', role: 'user', companyId: 'co-a', teamId: 'team-a' },
    admin: { id: 'admin', role: 'admin', companyId: 'co-a', teamId: 'team-a' },
    superadmin: {
      id: 'superadmin',
      role: 'superadmin',
      companyId: 'co-a',
      teamId: 'team-a',
    },
  };
  const prisma = {
    user: { findUnique: async ({ where }) => actors[where.id] || null },
    device: {
      findUnique: async ({ where }) => ({
        id: where.id,
        organizationId: where.id === 'device-a' ? 'co-a' : 'co-b',
        userId: 'member',
      }),
    },
    team: {
      findFirst: async ({ where }) =>
        where.id === 'team-a' ? { id: 'team-a' } : null,
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
        userId: 'member',
        teamId: 'team-a',
      }),
    },
  };
  let writes = 0,
    lastVectorScope,
    userListScope,
    launchedActor;
  const module = await Test.createTestingModule({
    controllers: [
      DeviceController,
      FlowController,
      VectorStoreController,
      MvpDataController,
      CrudController,
    ],
    providers: [
      { provide: PrismaService, useValue: prisma },
      { provide: CrudMigrationService, useValue: { ensureVendorsSchema: async () => ({ status: 'ok' }) } },
      { provide: ConfigService, useValue: { get: () => undefined } },
      {
        provide: CrudService,
        useValue: {
          getUsers: async (companyId) => {
            userListScope = companyId;
            return [];
          },
          getUser: async (id) => ({ id }),
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
          updateRpaProviderConfig: async () => {
            writes++;
            return { success: true };
          },
          getDevicesByOrganization: async () => [
            {
              id: 'device-a',
              authToken: 'hidden-token',
              pairingCode: 'hidden-code',
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
  app.useGlobalGuards(new AuthGuard(app.get(Reflector)));
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
  try {
    const http = app.getHttpServer();
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
      'PASS real Nest HTTP guard wiring: anonymous/role/tenant/removed-actor denials, legitimate controls, trusted search filters, safe device/provider/public-config responses.',
    );
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
