const { assert, LocalAuthService } = require('./admin-boundaries.test-helpers');

async function main() {
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
  console.log(
    'PASS account provisioning defaults to user without changing existing roles',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
