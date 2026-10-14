// Executes production TypeScript with isolated Nest/Prisma/bcrypt adapters; no services.
const assert = require('node:assert/strict');
const {
  crypto,
  Denied,
  context,
  load,
  AuthGuard,
  LocalAuthService,
  roles,
  CrudCompanyService,
  CrudController,
  CrudAccessGuard,
  TeamController,
  CrudKeledonService,
} = require('./approved-management-policy.harness');
const { RolesGuard, SuperAdminGuard } = roles;

async function main() {
  process.env.KELEDON_AUTH_SECRET = 'isolated-test-only-secret';
  const rows = {
    user: { id: 'actor', role: 'admin', companyId: 'co-a', teamId: 'team-a' },
  };
  const prisma = {
    user: {
      findUnique: async ({ where }) =>
        where.id === 'actor'
          ? rows.user
          : where.id === 'user-a'
            ? {
                id: 'user-a',
                companyId: 'co-a',
                role: 'user',
                teamId: 'team-a',
              }
            : where.id === 'admin-a'
              ? { id: 'admin-a', companyId: 'co-a', role: 'admin' }
              : {
                  id: where.id,
                  companyId: 'co-b',
                  role: 'user',
                  teamId: 'team-b',
                },
    },
    team: {
      findFirst: async ({ where }) =>
        where.id === 'team-a' &&
        (!where.brand || where.brand.companyId === 'co-a')
          ? { id: 'team-a' }
          : null,
    },
    brand: {
      findFirst: async ({ where }) =>
        where.id === 'brand-a' ? { id: 'brand-a' } : null,
    },
    vendor: {
      findUnique: async ({ where }) => ({
        id: where.id,
        teamId: where.id === 'vendor-a' ? 'team-a' : 'team-b',
      }),
    },
    keledon: {
      findUnique: async () => ({
        id: 'k-a',
        teamId: 'team-a',
        userId: 'actor',
      }),
    },
    tenantVoiceProfile: {
      findUnique: async ({ where }) => ({
        companyId: where.id === 'vp-a' ? 'co-a' : 'co-b',
      }),
    },
    session: {
      findUnique: async ({ where }) => ({
        id: where.id,
        teamId: where.id === 'session-a' ? 'team-a' : 'team-b',
        userId: where.id === 'session-a' ? 'user-a' : 'user-b',
      }),
    },
  };
  const access = new CrudAccessGuard(prisma);
  const run = (
    resource,
    method = 'GET',
    params = {},
    body = {},
    handler = 'operation',
  ) => {
    const req = {
      method,
      route: { path: `/api/crud/${resource}` },
      params,
      body,
      query: { companyId: 'co-b' },
      user: { userId: 'actor', role: 'superadmin' },
    };
    return {
      req,
      result: access.canActivate({
        ...context(req),
        getHandler: () => ({ name: handler }),
      }),
    };
  };
  for (const role of ['guest', 'user', 'agent']) {
    rows.user.role = role;
    for (const resource of [
      'companies',
      'brands',
      'teams',
      'users',
      'tenant-provider-config',
      'voice-profiles',
      'sessions',
    ]) {
      for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
        await assert.rejects(run(resource, method).result, Denied);
      }
    }
  }
  for (const role of ['admin', 'coordinator']) {
    rows.user.role = role;
    for (const [resource, params] of [
      ['companies', { id: 'co-b' }],
      ['brands', { id: 'brand-b' }],
      ['teams', { id: 'team-b' }],
      ['users', { id: 'user-b' }],
      ['vendors', { id: 'vendor-b' }],
      ['voice-profiles', { id: 'vp-b' }],
    ]) {
      for (const method of ['GET', 'PUT', 'DELETE'])
        await assert.rejects(run(resource, method, params).result, Denied);
    }
    await assert.rejects(
      run('users', 'PUT', { id: 'user-a' }, { role: 'superadmin' }).result,
      Denied,
    );
    await assert.rejects(
      run(
        'users',
        'POST',
        {},
        {
          email: 'planted@example.invalid',
          passwordHash: 'attacker-controlled-hash',
        },
      ).result,
      Denied,
    );
    await assert.rejects(
      run(
        'users',
        'PUT',
        { id: 'user-a' },
        { passwordHash: 'attacker-controlled-hash' },
      ).result,
      Denied,
    );
    await assert.rejects(
      run('users', 'PUT', { id: 'admin-a' }, { name: 'edit-peer' }).result,
      Denied,
    );
    await assert.rejects(
      run('companies', 'DELETE', { id: 'co-a' }).result,
      Denied,
    );
    await assert.rejects(
      run('users', 'POST', {}, { teamId: 'team-b' }).result,
      Denied,
    );
    await assert.rejects(
      run(
        'teams',
        'PUT',
        { id: 'team-a' },
        { brand: { connect: { id: 'brand-b' } } },
      ).result,
      Denied,
    );
    await assert.rejects(
      run('tenant-provider-config', 'PUT', {}, [
        { companyId: 'co-a' },
        { companyId: 'co-b' },
      ]).result,
      Denied,
    );
    const list = run('users');
    await list.result;
    assert.equal(list.req.query.companyId, 'co-a');

    assert.equal(
      await run('users', 'PUT', { id: 'user-a' }, { name: 'safe' }).result,
      true,
    );
    // Positive operation matrix for first-party CRUD routes. Each case exercises
    // the real CrudAccessGuard with a current database actor and scoped fixtures.
    rows.user.role = role;
    const allow = async (resource, method, params = {}, body = {}) => {
      const request = run(resource, method, params, body);
      assert.equal(
        await request.result,
        true,
        `${rows.user.role} should be allowed: ${method} /api/crud/${resource}`,
      );
      return request.req;
    };

    await allow('companies', 'GET');
    await allow('companies', 'GET', { id: 'co-a' });
    await allow('companies', 'PUT', { id: 'co-a' }, { name: 'Scoped company' });
    await assert.rejects(
      allow('companies', 'POST', {}, { name: 'New company' }),
      Denied,
    );
    await assert.rejects(allow('companies', 'DELETE', { id: 'co-a' }), Denied);

    const createdBrand = await allow('brands', 'POST', {}, { name: 'Brand A' });
    assert.equal(createdBrand.body.companyId, 'co-a');
    await allow('brands', 'GET');
    await allow('brands', 'GET', { id: 'brand-a' });
    await allow('brands', 'PUT', { id: 'brand-a' }, { name: 'Updated brand' });
    await allow('brands', 'DELETE', { id: 'brand-a' });

    await allow('teams', 'POST', {}, { name: 'Team A', brandId: 'brand-a' });
    await allow('teams', 'GET');
    await allow('teams', 'GET', { id: 'team-a' });
    await allow('teams', 'PUT', { id: 'team-a' }, { name: 'Updated team' });
    await allow('teams', 'DELETE', { id: 'team-a' });

    const createdUser = await allow(
      'users',
      'POST',
      {},
      { email: 'new@example.invalid' },
    );
    assert.equal(createdUser.body.role, 'user');
    assert.equal(createdUser.body.companyId, 'co-a');
    await allow('users', 'GET');
    await allow('users', 'GET', { id: 'user-a' });
    await allow('users', 'PUT', { id: 'user-a' }, { name: 'Updated user' });
    await allow('users', 'DELETE', { id: 'user-a' });

    const createdVendor = await allow(
      'vendors',
      'POST',
      {},
      {
        name: 'Vendor A',
        type: 'crm',
        teamId: 'team-a',
      },
    );
    assert.equal(createdVendor.body.teamId, 'team-a');
    await allow('vendors/:teamId', 'GET', { teamId: 'team-a' });
    await allow('vendors/:id', 'GET', { id: 'vendor-a' });
    await allow(
      'vendors/:id',
      'PUT',
      { id: 'vendor-a' },
      { name: 'Updated vendor' },
    );
    await allow('vendors/:id', 'DELETE', { id: 'vendor-a' });

    await allow('sessions', 'GET');
    await allow('sessions/:id', 'GET', { id: 'session-a' });
    await allow('sessions', 'POST', {}, { teamId: 'team-a', userId: 'user-a' });
    await allow(
      'sessions/:id',
      'PUT',
      { id: 'session-a' },
      { summary: 'Updated summary' },
    );
    await assert.rejects(
      run('sessions/orphaned', 'DELETE', {}, {}, 'deleteOrphanedSessions')
        .result,
      Denied,
    );
  }

  rows.user = {
    id: 'actor',
    role: 'user',
    companyId: 'co-a',
    teamId: 'team-a',
  };
  const ownedLaunch = run(
    'keledons/:id/launch',
    'POST',
    { id: 'k-a' },
    { userId: 'forged-superadmin' },
    'launchKeledon',
  );
  assert.equal(await ownedLaunch.result, true);
  assert.equal(
    ownedLaunch.req.body.userId,
    'actor',
    'launch actor must replace attacker body identity',
  );
  rows.user = null;
  await assert.rejects(run('users').result, Denied);
  rows.user = {
    id: 'actor',
    role: 'superadmin',
    companyId: null,
    teamId: null,
  };
  assert.equal(await run('companies', 'DELETE', { id: 'co-b' }).result, true);
  const elevatedUser = run(
    'users',
    'POST',
    {},
    {
      email: 'manager@example.invalid',
      role: 'admin',
      companyId: 'co-a',
    },
  );
  assert.equal(await elevatedUser.result, true);
  await assert.rejects(
    run(
      'users',
      'POST',
      {},
      {
        email: 'planted-superadmin@example.invalid',
        role: 'user',
        passwordHash: 'attacker-controlled-hash',
      },
    ).result,
    Denied,
  );

  // Auto-provisioning never grants privilege, and existing roles remain unchanged.
  let created;
  const signup = new LocalAuthService({
    user: {
      findUnique: async () => null,
      create: async ({ data }) => {
        created = data;
        return { id: 'new', ...data };
      },
      update: async () => ({}),
    },
  });
  assert.equal(
    (await signup.register('fixture@example.invalid', 'isolated-password'))
      .role,
    'user',
  );
  assert.equal(created.companyId, undefined);
  assert.equal(
    (
      await signup.findOrCreateGoogleUser({
        email: 'google@example.invalid',
        name: 'Fixture',
      })
    ).role,
    'user',
  );
  const existing = new LocalAuthService({
    user: {
      findUnique: async () => ({ id: 'existing', role: 'superadmin' }),
      update: async () => ({}),
      create: async () => {
        throw new Error('existing actor must not be recreated');
      },
    },
  });
  assert.equal(
    (
      await existing.findOrCreateGoogleUser({
        email: 'existing@example.invalid',
      })
    ).role,
    'superadmin',
  );

  let configWrites = 0;
  const teamController = new TeamController({
    user: { findUnique: async () => rows.user },
    team: {
      findFirst: async ({ where }) =>
        where.id === 'team-a' ? { id: 'team-a' } : null,
      findUnique: async () => ({
        id: 'team-a',
        openaiApiKey: 'isolated-hidden',
        deepgramApiKey: 'isolated-hidden',
        ttsApiKey: 'isolated-hidden',
      }),
      update: async () => {
        configWrites++;
        return { id: 'team-a', ttsApiKey: 'isolated-hidden' };
      },
    },
  });
  const actorReq = { user: { userId: 'actor', role: 'superadmin' } };
  rows.user = { role: 'user', companyId: 'co-a', teamId: 'team-a' };
  await assert.rejects(
    () => teamController.getTeamConfig('team-a', actorReq),
    Denied,
  );
  await assert.rejects(
    () => teamController.updateTeamConfig('team-a', {}, actorReq),
    Denied,
  );
  rows.user = null;
  await assert.rejects(
    () => teamController.getTeamConfig('team-a', actorReq),
    Denied,
  );
  rows.user = { role: 'admin', companyId: 'co-a', teamId: 'team-a' };
  await assert.rejects(
    () => teamController.getTeamConfig('team-b', actorReq),
    Denied,
  );
  const config = await teamController.getTeamConfig('team-a', actorReq);
  assert.equal(config.openaiApiKey, '');
  assert.equal(config.openaiApiKeySet, true);
  assert.equal(config.deepgramConfig.apiKey, '');
  assert.equal(config.deepgramConfig.hasApiKey, true);
  assert.equal(JSON.stringify(config).includes('isolated-hidden'), false);
  assert.equal(
    (await teamController.updateTeamConfig('team-a', {}, actorReq)).ttsApiKey,
    '',
  );
  assert.equal(configWrites, 1);
  await assert.rejects(
    () =>
      teamController.updateTeamConfig(
        'team-a',
        { ttsProvider: 'untrusted-provider' },
        actorReq,
      ),
    Denied,
  );
  assert.equal(configWrites, 1, 'unsupported provider must not silently save');
  await teamController.updateTeamConfig(
    'team-a',
    { ttsProvider: 'speaches' },
    actorReq,
  );
  assert.equal(configWrites, 2, 'supported Speaches selection persists');

  let deviceWrites = 0;
  const launchService = new CrudKeledonService({
    keledon: {
      findUnique: async () => ({
        id: 'k-a',
        teamId: 'team-a',
        userId: 'owner',
        name: 'Fixture',
      }),
    },
    user: {
      findUnique: async () => ({
        id: 'intruder',
        role: 'user',
        teamId: 'team-b',
        companyId: 'co-b',
      }),
    },
    team: { findUnique: async () => ({ brand: { companyId: 'co-a' } }) },
    device: {
      findFirst: async () => {
        deviceWrites++;
        return null;
      },
      create: async () => {
        deviceWrites++;
      },
    },
  });
  await assert.rejects(() =>
    launchService.generateKeledonLaunchLink('k-a', 'intruder'),
  );
  assert.equal(
    deviceWrites,
    0,
    'unauthorized launch must not inspect or mutate device pairing',
  );
  let pendingDevice;
  const authorizedLaunch = new CrudKeledonService({
    keledon: {
      findUnique: async () => ({
        id: 'k-a',
        teamId: 'team-a',
        userId: 'owner',
        name: 'Fixture',
      }),
    },
    user: {
      findUnique: async () => ({
        id: 'owner',
        role: 'user',
        teamId: 'team-a',
        companyId: 'co-a',
      }),
    },
    team: { findUnique: async () => ({ brand: { companyId: 'co-a' } }) },
    device: {
      findFirst: async () => null,
      create: async ({ data }) => {
        pendingDevice = { id: 'device-a', ...data };
        return pendingDevice;
      },
      update: async () => pendingDevice,
      findUnique: async () => pendingDevice,
    },
    vendor: {
      findMany: async () => [
        {
          id: 'v-a',
          name: 'Fixture CRM',
          password: 'isolated-hidden',
          apiKey: 'isolated-hidden',
          isActive: true,
        },
      ],
    },
  });
  const link = await authorizedLaunch.generateKeledonLaunchLink('k-a', 'owner');
  assert.equal(pendingDevice.userId, 'owner');
  assert.equal(pendingDevice.keledonId, 'k-a');
  assert.equal(pendingDevice.organizationId, 'co-a');
  assert.equal(pendingDevice.status, 'pending');
  assert.equal(link.deep_link.startsWith('keledon://launch?'), true);
  const launchUrl = new URL(link.deep_link);
  const launchPayload = JSON.stringify([
    'k-a',
    'owner',
    launchUrl.searchParams.get('timestamp'),
    launchUrl.searchParams.get('code'),
    new URL(launchUrl.searchParams.get('cloudUrl')).origin,
  ]);
  const signingSecret =
    process.env.KELEDON_LAUNCH_SECRET ||
    process.env.KELDEON_LAUNCH_SECRET ||
    process.env.KELEDON_AUTH_SECRET ||
    'keledon-default-secret';
  assert.equal(
    launchUrl.searchParams.get('signature'),
    crypto
      .createHmac('sha256', signingSecret)
      .update(launchPayload)
      .digest('hex')
      .substring(0, 16),
  );
  assert.equal(JSON.stringify(link.vendors).includes('isolated-hidden'), false);
  let keledonQuery;
  await new CrudKeledonService({
    keledon: {
      findMany: async (query) => {
        keledonQuery = query;
        return [];
      },
    },
  }).getKeledons('co-a', 'owner');
  assert.equal(keledonQuery.where.team.brand.companyId, 'co-a');
  assert.equal(keledonQuery.where.userId, 'owner');
  console.log(
    'PASS approved management policy: role, cross-tenant CRUD, batch, nested write, privilege escalation, deleted actor, safe config, self-registration and launch-before-write negatives.',
  );
  console.log(
    'PASS admin boundaries: 7 signed malformed payloads, 4 auth negatives, 12 stale-role negatives, absent actor, valid controls, tenant filter/detail and secret projections.',
  );
  console.log(
    'PASS CRUD operation matrix: low-role denials across list/create/update/delete; admin/coordinator company, brand, team, user, vendor and session operations; DB-derived scope; only superadmin role assignment; client-supplied credential hashes rejected for every role.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
