const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

class HttpError extends Error {}
const common = new Proxy(
  {
    ForbiddenException: HttpError,
    NotFoundException: HttpError,
    UnauthorizedException: HttpError,
  },
  { get: (target, key) => target[key] || (() => () => {}) },
);

function load(relative, adapters = {}) {
  const filename = path.resolve(__dirname, '../../src', relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    Buffer,
    Date,
    process,
    JSON,
    Set,
    Promise,
    console,
    require: (name) => {
      if (name === '@nestjs/common') return common;
      if (name === 'crypto') return crypto;
      return adapters[name] || {};
    },
  }, { filename });
  return module.exports;
}

const policy = load('auth-local/uat-test-profile.policy.ts');
const { AuthGuard } = load('guards/auth.guard.ts', {
  '../auth-local/uat-test-profile.policy': policy,
});
const { UatTestProfilesService } = load('auth-local/uat-test-profiles.service.ts', {
  './uat-test-profile.policy': policy,
});

function context(request) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

function tokenFor(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', process.env.KELEDON_AUTH_SECRET)
    .update(encoded)
    .digest('hex');
  return `${encoded}.${signature}`;
}

async function main() {
  const prior = {
    deployment: process.env.KELEDON_DEPLOYMENT_ENV,
    enabled: process.env.KELEDON_ENABLE_UAT_TEST_PROFILES,
    ids: process.env.KELEDON_UAT_TEST_PROFILE_IDS,
    node: process.env.NODE_ENV,
    secret: process.env.KELEDON_AUTH_SECRET,
  };
  Object.assign(process.env, {
    KELEDON_DEPLOYMENT_ENV: 'development',
    KELEDON_ENABLE_UAT_TEST_PROFILES: 'true',
    KELEDON_UAT_TEST_PROFILE_IDS: 'profile-admin, profile-user, real-user',
    NODE_ENV: 'development',
    KELEDON_AUTH_SECRET: 'isolated-uat-profile-secret',
  });

  try {
    assert.equal(policy.uatTestProfilesEnabled(), true);
    assert.equal(policy.uatTestProfilesEnabled({
      KELEDON_ENABLE_UAT_TEST_PROFILES: 'true',
      KELEDON_DEPLOYMENT_ENV: 'production',
      KELEDON_UAT_TEST_PROFILE_IDS: 'profile-user',
      NODE_ENV: 'production',
    }), false);
    assert.equal(policy.uatTestProfilesEnabled({
      KELEDON_ENABLE_UAT_TEST_PROFILES: 'true',
      KELEDON_DEPLOYMENT_ENV: 'development',
      KELEDON_UAT_TEST_PROFILE_IDS: 'profile-user',
      NODE_ENV: 'production',
    }), false);
    assert.equal(policy.uatTestProfilesEnabled({
      KELEDON_ENABLE_UAT_TEST_PROFILES: 'true',
      KELEDON_DEPLOYMENT_ENV: 'staging',
      KELEDON_UAT_TEST_PROFILE_IDS: 'profile-user',
      NODE_ENV: 'production',
    }), true);
    assert.deepEqual(
      Array.from(policy.parseUatTestProfileIds('a, b,a,,c')),
      ['a', 'b', 'c'],
    );

    const users = {
      superadmin: { id: 'superadmin', role: 'superadmin' },
      'profile-admin': { id: 'profile-admin', name: 'QA Admin', email: 'qa-admin@example.invalid', role: 'admin' },
      'profile-user': { id: 'profile-user', name: 'QA User', email: 'qa-user@test.invalid', role: 'user' },
      'real-user': { id: 'real-user', name: 'Real Account', email: 'person@example.com', role: 'user' },
      'profile-elevated': { id: 'profile-elevated', name: 'QA Root', email: 'qa-root@example.invalid', role: 'superadmin' },
    };
    const auditEntries = [];
    const prisma = {
      user: {
        findUnique: async ({ where }) => users[where.id] || null,
        findMany: async ({ where }) => where.id.in.map((id) => users[id]).filter(Boolean),
      },
      auditLog: {
        create: async ({ data }) => {
          const entry = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
          auditEntries.push(entry);
          return entry;
        },
        findFirst: async ({ where }) => auditEntries.find((entry) =>
          entry.entity === where.entity &&
          entry.entityId === where.entityId &&
          entry.action === where.action,
        ) || null,
      },
    };
    const authService = {
      generateUatTestProfileToken: (input) => tokenFor({
        userId: input.userId,
        email: input.email,
        role: input.role,
        expiresAt: input.expiresAt,
        uatTestProfile: true,
        uatTestSessionId: input.sessionId,
        uatActorUserId: input.actorUserId,
      }),
    };
    const service = new UatTestProfilesService(prisma, authService);

    const listed = await service.listProfiles('superadmin');
    assert.deepEqual(JSON.parse(JSON.stringify(listed)), [
      { id: 'profile-admin', name: 'QA Admin', role: 'admin' },
      { id: 'profile-user', name: 'QA User', role: 'user' },
    ]);
    await assert.rejects(() => service.listProfiles('profile-admin'), HttpError);
    await assert.rejects(() => service.startProfile('superadmin', 'real-user', {}), HttpError);
    await assert.rejects(() => service.startProfile('superadmin', 'profile-elevated', {}), HttpError);

    const started = await service.startProfile('superadmin', 'profile-admin', {
      ipAddress: '127.0.0.1',
      userAgent: 'isolated-test',
    });
    assert.equal(started.user.role, 'admin');
    assert.equal(started.user.uatTestProfile, true);
    assert.ok(started.expiresAt - Date.now() <= policy.UAT_TEST_PROFILE_TTL_MS);
    assert.equal(auditEntries[0].userId, 'superadmin');
    assert.equal(auditEntries[0].action, 'UAT_TEST_PROFILE_START');

    const reflector = { getAllAndOverride: () => false };
    const guard = new AuthGuard(reflector, prisma);
    const switchedRequest = { headers: { authorization: `Bearer ${started.token}` } };
    assert.equal(await guard.canActivate(context(switchedRequest)), true);
    assert.equal(switchedRequest.user.userId, 'profile-admin');
    assert.equal(switchedRequest.user.role, 'admin');
    assert.equal(switchedRequest.user.uatActorUserId, 'superadmin');

    assert.equal(await service.endProfileSession('superadmin', started.sessionId, { ipAddress: '127.0.0.1' }).then((result) => result.success), true);
    assert.equal(auditEntries[1].userId, 'superadmin');
    assert.equal(auditEntries[1].action, 'UAT_TEST_PROFILE_END');
    await assert.rejects(
      () => guard.canActivate(context({ headers: { authorization: `Bearer ${started.token}` } })),
      HttpError,
    );

    const stillActive = await service.startProfile('superadmin', 'profile-user', {});
    await assert.rejects(
      () => service.endProfileSession('profile-admin', stillActive.sessionId, {}),
      HttpError,
    );
    users.superadmin.role = 'admin';
    await assert.rejects(
      () => guard.canActivate(context({ headers: { authorization: `Bearer ${stillActive.token}` } })),
      HttpError,
    );
    users.superadmin.role = 'superadmin';
    users['profile-user'].role = 'coordinator';
    await assert.rejects(
      () => guard.canActivate(context({ headers: { authorization: `Bearer ${stillActive.token}` } })),
      HttpError,
    );

    const previousFlag = process.env.KELEDON_ENABLE_UAT_TEST_PROFILES;
    process.env.KELEDON_ENABLE_UAT_TEST_PROFILES = 'false';
    await assert.rejects(
      () => guard.canActivate(context({ headers: { authorization: `Bearer ${stillActive.token}` } })),
      HttpError,
    );
    process.env.KELEDON_ENABLE_UAT_TEST_PROFILES = previousFlag;

    console.log('PASS UAT test profile policy/service/AuthGuard fail-closed cases');
  } finally {
    const restore = (key, value) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('KELEDON_DEPLOYMENT_ENV', prior.deployment);
    restore('KELEDON_ENABLE_UAT_TEST_PROFILES', prior.enabled);
    restore('KELEDON_UAT_TEST_PROFILE_IDS', prior.ids);
    restore('NODE_ENV', prior.node);
    restore('KELEDON_AUTH_SECRET', prior.secret);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
