const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateUatPrepTarget } = require('../../scripts/uat-prep-companyco.policy.cjs');
const seeder = fs.readFileSync(
  path.join(__dirname, '../../scripts/uat-prep-companyco.ts'),
  'utf8',
);

const base = {
  NODE_ENV: 'development',
  KELEDON_DEPLOYMENT_ENV: 'development',
  KELEDON_UAT_PREP_CONFIRM: 'true',
  DATABASE_URL: 'postgresql://uat:ephemeral@127.0.0.1:55432/keledon_phdk_uat',
};

function rejected(overrides, expected) {
  assert.throws(
    () => validateUatPrepTarget({ ...base, ...overrides }),
    (error) => error.message.includes(expected) && !error.message.includes('ephemeral'),
  );
}

assert.deepEqual(validateUatPrepTarget(base), {
  host: '127.0.0.1',
  port: '55432',
  database: 'keledon_phdk_uat',
});
rejected({ KELEDON_UAT_PREP_CONFIRM: 'false' }, 'KELEDON_UAT_PREP_CONFIRM');
rejected({ NODE_ENV: 'production' }, 'development/test only');
rejected({ KELEDON_DEPLOYMENT_ENV: 'staging' }, 'development/test only');
rejected({ DATABASE_URL: 'postgresql://user:secret@db.example.invalid/keledon_phdk_uat' }, 'non-loopback');
rejected({ DATABASE_URL: 'postgresql://user:secret@127.0.0.1/postgres' }, 'dedicated keledon_phdk_uat');
rejected({ DATABASE_URL: 'postgresql://user:secret@127.0.0.1/keledon_phdk_uat?sslmode=require' }, 'SSL');
rejected({ DATABASE_URL: 'not-a-url-secret' }, 'invalid');

const cleanupStart = seeder.indexOf('async function cleanup()');
assert.notEqual(cleanupStart, -1, 'UAT Prep must provide fixture cleanup');
const cleanupSource = seeder.slice(cleanupStart);
assert.doesNotMatch(
  cleanupSource,
  /auditLog\.delete(?:Many|One|)/,
  'fixture cleanup must preserve append-only security audit evidence',
);

console.log('PASS UAT Prep policy: explicit confirmation, development/test only, loopback dedicated database, and append-only audit preservation.');
