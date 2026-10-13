const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.KELEDON_TEST_TYPESCRIPT || 'typescript');

const sourcePath = path.resolve(
  __dirname,
  '../../src/services/database-backup.store.ts',
);
const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(output, {
  module: loaded,
  exports: loaded.exports,
  require,
  process,
  console,
  Date,
  Map,
  Set,
});
const { DatabaseBackupStore } = loaded.exports;

async function main() {
  const previousDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'keledon-backup-test-'),
  );
  process.chdir(temporaryDirectory);
  try {
    const now = new Date();
    const entities = new Map([
      [
        'users:recent',
        {
          id: 'recent',
          data: { name: 'Synthetic' },
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        'users:stale',
        {
          id: 'stale',
          data: { name: 'Old synthetic' },
          createdAt: now,
          updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
      ],
    ]);
    const store = new DatabaseBackupStore();
    const fullProgress = [];
    const full = await store.createBackup('full', entities, (backup) =>
      fullProgress.push(backup.status),
    );
    assert.deepEqual(fullProgress, ['in_progress', 'completed']);
    assert.equal(full.status, 'completed');
    assert.equal(full.size > 0, true);
    assert.equal((await store.restore(full.id)).length, 2);

    const incremental = await store.createBackup(
      'incremental',
      entities,
      () => {},
    );
    const restoredIncremental = await store.restore(incremental.id);
    assert.equal(restoredIncremental.length, 1);
    assert.equal(restoredIncremental[0][0], 'users:recent');
    const history = await store.getHistory();
    assert.equal(history.length, 2);
    assert.equal(await store.cleanupOld(30), 0);
    console.log(
      'PASS database backup extraction: lifecycle notifications, full/incremental selection, restore, history and bounded retention cleanup.',
    );
  } finally {
    process.chdir(previousDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
