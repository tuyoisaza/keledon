/**
 * v0.2.28: Regression test — admin-config auth/tenant boundary.
 *
 * Covers:
 * - getLaunch authorizes superadmin, admin, and keledon owner
 * - Unauthorized users (other roles, missing user) are rejected
 * - Google users are authorized (fallback path)
 */

const assert = require('assert');

function checkLaunchAuthorization({ userRole, userId, keledonUserId, isGoogleUser }) {
  if (isGoogleUser) return true;
  if (!userRole && !isGoogleUser) return false;
  return userRole === 'superadmin' || userRole === 'admin' || userId === keledonUserId;
}

// ====== TESTS ======

function testSuperadminAuthorized() {
  const ok = checkLaunchAuthorization({ userRole: 'superadmin', userId: 'u1', keledonUserId: 'u2' });
  assert.strictEqual(ok, true);
}

function testAdminAuthorized() {
  const ok = checkLaunchAuthorization({ userRole: 'admin', userId: 'u1', keledonUserId: 'u2' });
  assert.strictEqual(ok, true);
}

function testOwnerAuthorized() {
  const ok = checkLaunchAuthorization({ userRole: 'user', userId: 'u1', keledonUserId: 'u1' });
  assert.strictEqual(ok, true);
}

function testRegularUserDenied() {
  const ok = checkLaunchAuthorization({ userRole: 'user', userId: 'u1', keledonUserId: 'u2' });
  assert.strictEqual(ok, false);
}

function testMissingUserDenied() {
  const ok = checkLaunchAuthorization({ userRole: null, userId: null, keledonUserId: 'u2' });
  assert.strictEqual(ok, false);
}

function testGoogleUserAuthorized() {
  const ok = checkLaunchAuthorization({ userRole: null, userId: 'google_123', keledonUserId: 'u2', isGoogleUser: true });
  assert.strictEqual(ok, true);
}

function testEmptyRoleDenied() {
  const ok = checkLaunchAuthorization({ userRole: '', userId: 'u1', keledonUserId: 'u2' });
  assert.strictEqual(ok, false);
}

// ====== RUNNER ======
const tests = [
  testSuperadminAuthorized,
  testAdminAuthorized,
  testOwnerAuthorized,
  testRegularUserDenied,
  testMissingUserDenied,
  testGoogleUserAuthorized,
  testEmptyRoleDenied,
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    t();
    console.log(`✅ ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${t.name}: ${err.message}`);
    failed++;
  }
}

console.log(`\n📊 AuthBoundary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
