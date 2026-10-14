const {
  assert,
  crypto,
  Denied,
  context,
  AuthGuard,
  LocalAuthService,
  RolesGuard,
  SuperAdminGuard,
  CrudCompanyService,
  CrudController,
  CrudAccessGuard,
  TeamController,
  CrudKeledonService,
} = require('./admin-boundaries.test-helpers');

async function main() {
  const previousEnv = process.env.NODE_ENV;
  delete process.env.KELEDON_AUTH_SECRET;
  process.env.NODE_ENV = 'production';
  assert.throws(() => new AuthGuard({}), /required in production/);
  assert.throws(() => new LocalAuthService({}), /required in production/);
  process.env.NODE_ENV = 'development';
  assert.doesNotThrow(() => new AuthGuard({}));
  assert.doesNotThrow(() => new LocalAuthService({}));
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;
  process.env.KELEDON_AUTH_SECRET = 'isolated-test-only-secret';
  const auth = new AuthGuard({ getAllAndOverride: () => false });
  let lookups = 0;
  const local = new LocalAuthService({
    user: {
      findUnique: async () => {
        lookups++;
        return { id: 'u1', role: 'user' };
      },
    },
  });
  const sign = (payload) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `${encoded}.${crypto.createHmac('sha256', process.env.KELEDON_AUTH_SECRET).update(encoded).digest('hex')}`;
  };
  const valid = {
    userId: 'u1',
    email: 'fixture@example.invalid',
    role: 'user',
    expiresAt: Date.now() + 60000,
  };
  const malformed = [
    null,
    {},
    { ...valid, userId: '' },
    { ...valid, expiresAt: undefined },
    { ...valid, expiresAt: 'never' },
    { ...valid, expiresAt: String(Date.now() + 60000) },
    { ...valid, expiresAt: Date.now() - 1 },
  ];
  for (const payload of malformed) {
    const token = sign(payload);
    assert.throws(
      () =>
        auth.canActivate(
          context({ headers: { authorization: `Bearer ${token}` } }),
        ),
      Denied,
    );
    assert.equal(await local.validateToken(token), null);
  }
  assert.equal(lookups, 0, 'invalid signed payload must not reach database');
  for (const header of [
    undefined,
    'Basic abc',
    'Bearer bad',
    `Bearer ${sign(valid)}tampered`,
  ]) {
    assert.throws(
      () => auth.canActivate(context({ headers: { authorization: header } })),
      Denied,
    );
  }
  const request = { headers: { authorization: `Bearer ${sign(valid)}` } };
  assert.equal(auth.canActivate(context(request)), true);
  assert.equal(request.user.userId, 'u1');
  assert.equal((await local.validateToken(sign(valid))).id, 'u1');

  for (const role of [
    'user',
    'guest',
    'admin',
    'coordinator',
    'agent',
    undefined,
  ]) {
    const prisma = {
      user: { findUnique: async () => (role ? { role } : null) },
    };
    const ctx = context({ user: { userId: 'u1', role: 'superadmin' } });
    await assert.rejects(
      () => new SuperAdminGuard(prisma).canActivate(ctx),
      Denied,
    );
    await assert.rejects(
      () =>
        new RolesGuard(
          { getAllAndOverride: () => ['superadmin'] },
          prisma,
        ).canActivate(ctx),
      Denied,
    );
  }
  const superGuard = new SuperAdminGuard({
    user: { findUnique: async () => ({ role: 'superadmin' }) },
  });
  await assert.rejects(() => superGuard.canActivate(context({})), Denied);
  assert.equal(
    await superGuard.canActivate(context({ user: { userId: 'u1' } })),
    true,
  );

  let teamQuery, detailQuery, companyQuery;
  const service = new CrudCompanyService({
    team: {
      findMany: async (query) => {
        teamQuery = query;
        return [];
      },
      findUnique: async (query) => {
        detailQuery = query;
        return { id: query.where.id };
      },
    },
    company: {
      findUnique: async (query) => {
        companyQuery = query;
        return { id: 'co-a' };
      },
    },
  });
  await service.getTeams('co-a');
  assert.equal(
    teamQuery.where.brand.companyId,
    'co-a',
    'filter must reach Prisma relation',
  );
  await service.getTeams();
  assert.equal(teamQuery.where, undefined);
  assert.equal((await service.getTeam('team-a')).id, 'team-a');
  assert.equal(detailQuery.where.id, 'team-a');
  for (const secret of [
    'openaiApiKey',
    'deepgramApiKey',
    'elevenlabsApiKey',
    'speachesApiKey',
    'ttsApiKey',
  ]) {
    assert.equal(detailQuery.select[secret], undefined);
  }
  await service.getCompany('co-a');
  assert.equal(companyQuery.include.users.select.passwordHash, undefined);
  assert.equal(companyQuery.include.users.select.id, true);
  const controller = new CrudController({ getTeam: (id) => ({ id }) }, {});
  assert.equal(controller.getTeam('team-a').id, 'team-a');

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
      'vendors',
      'tenant-provider-config',
      'voice-profiles',
    ]) {
      await assert.rejects(run(resource, 'POST').result, Denied);
    }
  }
  rows.user.role = 'admin';
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
  for (const role of ['admin', 'coordinator']) {
    rows.user.role = role;
    await assert.rejects(
      run('users', 'PUT', { id: 'user-a' }, { role: 'superadmin' }).result,
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
  for (const role of ['guest', 'user', 'agent', 'admin', 'coordinator', 'superadmin']) {
    rows.user.role = role;
    await assert.rejects(
      run('users', 'POST', {}, { email: 'hash@example.invalid', passwordHash: 'attacker-controlled-hash' }).result,
      Denied,
      `passwordHash must be rejected for ${role}`,
    );
  }
  rows.user.role = 'superadmin';
  await assert.rejects(
    run('audit-logs', 'POST', {}, { userId: 'forged-user', action: 'FORGED', entity: 'company' }).result,
    Denied,
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
  const signingEnv = [
    process.env.KELEDON_LAUNCH_SECRET,
    process.env.KELDEON_LAUNCH_SECRET,
    process.env.KELEDON_AUTH_SECRET,
  ];
  delete process.env.KELEDON_LAUNCH_SECRET;
  delete process.env.KELDEON_LAUNCH_SECRET;
  delete process.env.KELEDON_AUTH_SECRET;
  const unconfiguredLaunch = new CrudKeledonService({});
  await assert.rejects(
    () => unconfiguredLaunch.generateKeledonLaunchLink('k-a', 'owner'),
    /Launch signing secret is not configured/,
  );
  [
    process.env.KELEDON_LAUNCH_SECRET,
    process.env.KELDEON_LAUNCH_SECRET,
    process.env.KELEDON_AUTH_SECRET,
  ] = signingEnv;
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
  const previousLaunchSecret = process.env.KELEDON_LAUNCH_SECRET;
  process.env.KELEDON_LAUNCH_SECRET = 'regression-test-launch-secret';
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
  if (previousLaunchSecret === undefined)
    delete process.env.KELEDON_LAUNCH_SECRET;
  else process.env.KELEDON_LAUNCH_SECRET = previousLaunchSecret;
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
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
