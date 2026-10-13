const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const apiRoot = path.resolve(__dirname, '../..');
const startupScript = path.join(apiRoot, 'start.sh');
const dockerfile = fs.readFileSync(path.join(apiRoot, 'Dockerfile'), 'utf8');
const startupSource = fs.readFileSync(startupScript, 'utf8');
const shell =
  process.platform === 'win32'
    ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
    : '/bin/sh';

function makeExecutable(dir, name, source) {
  const filename = path.join(dir, name);
  fs.writeFileSync(filename, source, 'utf8');
  fs.chmodSync(filename, 0o755);
}

function toShellPath(filename) {
  if (process.platform !== 'win32') return filename;
  return `/${filename[0].toLowerCase()}${filename.slice(2).replaceAll('\\', '/')}`;
}

function runStartup(migrationMode, companyCountMode = 'valid') {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keledon-migration-start-'));
  const binDir = path.join(fixtureDir, 'bin');
  const callLog = path.join(fixtureDir, 'calls.log');
  fs.mkdirSync(binDir);
  makeExecutable(
    binDir,
    'npx',
    '#!/bin/sh\nprintf "npx %s\\n" "$*" >> "$TEST_CALL_LOG"\n[ "$MIGRATION_MODE" = fail ] && exit 1\nexit 0\n',
  );
  makeExecutable(
    binDir,
    'node',
    '#!/bin/sh\ncase "$1" in -e) echo COMPANY_COUNT >> "$TEST_CALL_LOG"; if [ "$COMPANY_COUNT_MODE" = fail ]; then exit 1; fi; echo 3 ;; *) echo API_STARTED >> "$TEST_CALL_LOG" ;; esac\nexit 0\n',
  );
  makeExecutable(binDir, 'env', '#!/bin/sh\nexit 0\n');
  makeExecutable(binDir, 'awk', '#!/bin/sh\nexit 0\n');

  const childEnv = {
    PATH:
      process.platform === 'win32'
        ? `${toShellPath(binDir)}:/usr/bin:/bin`
        : `${binDir}:${process.env.PATH || ''}`,
    TEST_CALL_LOG: callLog,
    MIGRATION_MODE: migrationMode,
    COMPANY_COUNT_MODE: companyCountMode,
    DATABASE_URL: 'postgresql://synthetic.invalid/keledon',
  };
  for (const key of ['SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC']) {
    if (process.env[key]) childEnv[key] = process.env[key];
  }

  try {
    const result = spawnSync(shell, [startupScript], {
      cwd: apiRoot,
      env: childEnv,
      encoding: 'utf8',
      timeout: 30000,
    });
    const calls = fs.existsSync(callLog) ? fs.readFileSync(callLog, 'utf8') : '';
    return { ...result, calls };
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}

assert.ok(fs.existsSync(shell), `POSIX shell is unavailable: ${shell}`);
assert.match(dockerfile, /COPY --from=builder \/app\/start\.sh/);
assert.match(dockerfile, /CMD \["\/app\/start\.sh"\]/);
assert.doesNotMatch(startupSource, /migrate resolve --rolled-back/);

const successfulStart = runStartup('success');
assert.equal(successfulStart.status, 0, JSON.stringify(successfulStart));
assert.equal(
  (successfulStart.calls.match(/migrate deploy/g) || []).length,
  1,
  JSON.stringify(successfulStart),
);
assert.match(successfulStart.calls, /API_STARTED/);

const failedMigrations = runStartup('fail');
assert.equal(failedMigrations.status, 1, JSON.stringify(failedMigrations));
assert.equal(
  (failedMigrations.calls.match(/migrate deploy/g) || []).length,
  5,
  JSON.stringify(failedMigrations),
);
assert.doesNotMatch(failedMigrations.calls, /API_STARTED/);
assert.match(failedMigrations.stderr, /refusing to start the API/);

const failedCompanyCount = runStartup('success', 'fail');
assert.equal(
  failedCompanyCount.status,
  1,
  JSON.stringify({
    error: failedCompanyCount.error?.message,
    stderr: failedCompanyCount.stderr,
    calls: failedCompanyCount.calls,
  }),
);
assert.equal((failedCompanyCount.calls.match(/migrate deploy/g) || []).length, 1);
assert.match(failedCompanyCount.calls, /COMPANY_COUNT/);
assert.doesNotMatch(failedCompanyCount.calls, /API_STARTED/);
assert.match(failedCompanyCount.stderr, /refusing to seed or start the API/);

console.log(
  'PASS startup gates: successful migrations and company-count verification start API; migration or company-count failures stop before seeding/server; no automatic migration rollback.',
);
