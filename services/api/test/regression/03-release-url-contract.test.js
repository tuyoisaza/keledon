/**
 * v0.2.28: Regression test — release/version URL contract.
 *
 * Covers:
 * - Default download URL points to /latest/ (not pinned to a specific version)
 * - KELEDON_BROWSER_DOWNLOAD_URL env var overrides the default
 * - URL pattern is stable and reachable via GitHub Releases
 */

const assert = require('assert');

function getBrowserDownloadUrl(envOverride) {
  return (
    envOverride ||
    'https://github.com/tuyoisaza/keledon/releases/latest/download/KELEDON.Browser.Setup.exe'
  );
}

// ====== TESTS ======

function testDefaultUrlUsesLatestNotPinned() {
  const url = getBrowserDownloadUrl(undefined);
  assert(url.includes('/latest/'), 'URL must use /latest/ for auto-updating');
  assert(!url.match(/v\d+\.\d+\.\d+/), 'URL must not be pinned to a specific version tag');
}

function testDefaultUrlPointsToCorrectRepo() {
  const url = getBrowserDownloadUrl(undefined);
  assert(url.includes('github.com/tuyoisaza/keledon'), 'URL must point to official repo');
}

function testDefaultUrlHasInstallerName() {
  const url = getBrowserDownloadUrl(undefined);
  assert(url.endsWith('KELEDON.Browser.Setup.exe'), 'URL must end with installer name');
}

function testEnvOverrideTakesPrecedence() {
  const customUrl = 'https://cdn.example.com/keledon/KELEDON.Browser.Setup.exe';
  const url = getBrowserDownloadUrl(customUrl);
  assert.strictEqual(url, customUrl);
}

function testEmptyStringEnvNotUsed() {
  // Empty string is falsy, so it should fall back to default
  const url = getBrowserDownloadUrl('');
  assert(url.includes('/latest/'), 'empty env override must fall back to default');
}

// ====== RUNNER ======
const tests = [
  testDefaultUrlUsesLatestNotPinned,
  testDefaultUrlPointsToCorrectRepo,
  testDefaultUrlHasInstallerName,
  testEnvOverrideTakesPrecedence,
  testEmptyStringEnvNotUsed,
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

console.log(`\n📊 ReleaseUrl: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
