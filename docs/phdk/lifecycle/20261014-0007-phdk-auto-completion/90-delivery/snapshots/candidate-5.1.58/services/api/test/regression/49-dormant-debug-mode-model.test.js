const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const repo = path.resolve(__dirname, '../../../..');
const api = path.join(repo, 'services', 'api');
const cloud = path.join(repo, 'cloud');
const matrix = fs.readFileSync(path.join(repo, 'CRUD_MATRIX.md'), 'utf8');
const webPage = fs.readFileSync(path.join(repo, 'services', 'web', 'src', 'pages', 'ManagementDebugPage.tsx'), 'utf8');

test('DebugMode Prisma record stays dormant and the UI toggle remains explicitly local-only', () => {
  assert.equal(fs.existsSync(path.join(api, 'src', 'services', 'debug-mode.service.ts')), false);
  assert.equal(fs.existsSync(path.join(cloud, 'src', 'services', 'debug-mode.service.ts')), false);
  assert.equal(fs.existsSync(path.join(api, 'dist', 'services', 'debug-mode.service.js')), false);
  assert.equal(fs.existsSync(path.join(cloud, 'dist', 'services', 'debug-mode.service.js')), false);
  for (const sourceRoot of [path.join(api, 'src'), path.join(cloud, 'src')]) {
    const files = fs.readdirSync(sourceRoot, { recursive: true });
    for (const file of files) {
      if (!String(file).endsWith('.ts')) continue;
      const source = fs.readFileSync(path.join(sourceRoot, String(file)), 'utf8');
      assert.doesNotMatch(source, /DebugModeService/, `${file} must not wire an unreachable global toggle service`);
    }
  }
  assert.match(webPage, /localStorage\.getItem\('keldon-debug-mode'\)/);
  assert.match(webPage, /debugCapture\.setDebugMode\(enabled\)/);
  assert.doesNotMatch(webPage, /debugModeService|\/debug-mode/);

  const start = matrix.indexOf('| Prisma model | Role | Surface |');
  const end = matrix.indexOf('## Explicitly scoped exceptions', start);
  assert.ok(start >= 0 && end > start);
  const rows = matrix.slice(start, end).split(/\r?\n/)
    .filter((line) => line.startsWith('| DebugMode |'))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));
  assert.equal(rows.length, 14);
  assert.ok(rows.every((row) => row.at(-1) === 'NOT APPLICABLE'));
  assert.match(matrix, /DebugMode — dormant Prisma model; local diagnostics switch is separate/);
});
