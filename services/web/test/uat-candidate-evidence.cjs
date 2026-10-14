const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const sourceRoots = ['browser', 'cloud', 'services/api', 'services/web', 'landing'];

async function getCandidateFingerprint() {
  const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  const trackedDiff = execFileSync(
    'git',
    ['diff', '--binary', 'HEAD', '--', ...sourceRoots],
    { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 },
  );
  const untracked = execFileSync(
    'git',
    ['ls-files', '--others', '--exclude-standard'],
    { cwd: repoRoot, encoding: 'utf8' },
  )
    .split(/\r?\n/)
    .filter((file) => sourceRoots.some((root) => file.startsWith(`${root}/`)));
  untracked.sort();

  const hash = crypto.createHash('sha256').update(trackedDiff);
  for (const relativePath of untracked) {
    hash.update(relativePath);
    hash.update(await fs.readFile(path.join(repoRoot, relativePath)));
  }
  return {
    baseCommit,
    sourceFingerprint: `sha256:${hash.digest('hex')}`,
    dirtyUntrackedSourceFiles: untracked.length,
    sourceRoots,
  };
}

module.exports = { getCandidateFingerprint };
