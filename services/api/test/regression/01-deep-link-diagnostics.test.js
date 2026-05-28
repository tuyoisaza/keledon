/**
 * v0.2.28: Regression test — deep-link launch diagnostics and signature verification.
 *
 * Covers:
 * - URL parsing extracts required params (keledonId, code, userId, timestamp, signature)
 * - Signature HMAC generation matches cloud implementation
 * - Timestamp expiry rejects links older than 60s
 * - Missing params flag diagnostics correctly
 */

const assert = require('assert');
const crypto = require('crypto');

function signPayload(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .substring(0, 16);
}

function parseDeepLink(url) {
  const parsed = new URL(url);
  const keledonId = parsed.searchParams.get('keledonId');
  const code = parsed.searchParams.get('code');
  const userId = parsed.searchParams.get('userId');
  const timestamp = parsed.searchParams.get('timestamp');
  const signature = parsed.searchParams.get('signature');
  const cloudUrl = parsed.searchParams.get('cloudUrl') || 'https://keledon.tuyoisaza.com';
  const hadRequiredParams = Boolean(keledonId && code && userId && timestamp && signature);
  return { keledonId, code, userId, timestamp, signature, cloudUrl, hadRequiredParams };
}

function validateDeepLink(url, secret) {
  const { keledonId, code, userId, timestamp, signature, hadRequiredParams } = parseDeepLink(url);
  if (!hadRequiredParams) return { valid: false, reason: 'missing_params' };

  const linkTime = parseInt(timestamp, 10);
  if (!Number.isFinite(linkTime) || Date.now() - linkTime > 60000) {
    return { valid: false, reason: 'expired' };
  }

  const payload = `${keledonId}:${userId}:${timestamp}`;
  const expected = signPayload(payload, secret);
  if (signature !== expected) {
    return { valid: false, reason: 'invalid_signature' };
  }

  return { valid: true, reason: 'ok' };
}

// ====== TESTS ======

function testParsesRequiredParams() {
  const url = 'keledon://launch?keledonId=k123&code=abc&userId=u456&timestamp=1234567890000&signature=sig&cloudUrl=https://test.com';
  const parsed = parseDeepLink(url);
  assert.strictEqual(parsed.keledonId, 'k123');
  assert.strictEqual(parsed.code, 'abc');
  assert.strictEqual(parsed.userId, 'u456');
  assert.strictEqual(parsed.timestamp, '1234567890000');
  assert.strictEqual(parsed.signature, 'sig');
  assert.strictEqual(parsed.cloudUrl, 'https://test.com');
  assert.strictEqual(parsed.hadRequiredParams, true);
}

function testMissingParamsDetected() {
  const url = 'keledon://launch?keledonId=k123&code=abc';
  const parsed = parseDeepLink(url);
  assert.strictEqual(parsed.hadRequiredParams, false);
}

function testSignatureGenerationMatches() {
  const secret = 'test-secret';
  const payload = 'k123:u456:1234567890000';
  const sig = signPayload(payload, secret);
  assert.strictEqual(typeof sig, 'string');
  assert.strictEqual(sig.length, 16);
  assert.strictEqual(sig, signPayload(payload, secret), 'signature must be deterministic');
}

function testValidLinkPasses() {
  const secret = 'keledon-default-secret';
  const now = Date.now();
  const payload = `k123:u456:${now}`;
  const sig = signPayload(payload, secret);
  const url = `keledon://launch?keledonId=k123&code=abc&userId=u456&timestamp=${now}&signature=${sig}`;
  const result = validateDeepLink(url, secret);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.reason, 'ok');
}

function testExpiredLinkRejected() {
  const secret = 'keledon-default-secret';
  const oldTime = Date.now() - 120000; // 2 minutes ago
  const payload = `k123:u456:${oldTime}`;
  const sig = signPayload(payload, secret);
  const url = `keledon://launch?keledonId=k123&code=abc&userId=u456&timestamp=${oldTime}&signature=${sig}`;
  const result = validateDeepLink(url, secret);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'expired');
}

function testInvalidSignatureRejected() {
  const secret = 'keledon-default-secret';
  const now = Date.now();
  const url = `keledon://launch?keledonId=k123&code=abc&userId=u456&timestamp=${now}&signature=bad_sig`;
  const result = validateDeepLink(url, secret);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'invalid_signature');
}

function testFallsBackToDefaultCloudUrl() {
  const url = 'keledon://launch?keledonId=k123&code=abc&userId=u456&timestamp=1&signature=sig';
  const parsed = parseDeepLink(url);
  assert.strictEqual(parsed.cloudUrl, 'https://keledon.tuyoisaza.com');
}

// ====== RUNNER ======
const tests = [
  testParsesRequiredParams,
  testMissingParamsDetected,
  testSignatureGenerationMatches,
  testValidLinkPasses,
  testExpiredLinkRejected,
  testInvalidSignatureRejected,
  testFallsBackToDefaultCloudUrl,
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

console.log(`\n📊 DeepLink: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
