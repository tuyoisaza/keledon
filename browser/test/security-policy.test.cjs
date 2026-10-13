const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  isAllowedVendorTabUrl,
  isAllowedVendorUrl,
  isTrustedAppRendererUrl,
  sanitizeVendorNotification,
  secureRendererPreferences,
} = require('../dist/security-policy.js');

test('Electron renderers stay sandboxed, isolated and web-secured', () => {
  assert.deepEqual(secureRendererPreferences('preload.js'), {
    preload: 'preload.js',
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
  });
});

test('only the exact local app document may retain its privileged preload', () => {
  const appFile = path.resolve('renderer/index.html');
  const trustedUrl = require('node:url').pathToFileURL(appFile).href;
  assert.equal(isTrustedAppRendererUrl(trustedUrl + '#home', appFile), true);
  assert.equal(isTrustedAppRendererUrl('https://crm.example.test/', appFile), false);
  assert.equal(
    isTrustedAppRendererUrl(
      require('node:url').pathToFileURL(path.resolve('renderer/other.html')).href,
      appFile,
    ),
    false,
  );
  assert.equal(isTrustedAppRendererUrl('javascript:alert(1)', appFile), false);
});

test('vendor tabs reject non-web schemes and credentials in URLs', () => {
  assert.equal(isAllowedVendorUrl('https://crm.example.test/login'), true);
  assert.equal(isAllowedVendorUrl('http://127.0.0.1:8080/'), true);
  assert.equal(isAllowedVendorUrl('https://agent:secret@crm.example.test/'), false);
  assert.equal(isAllowedVendorUrl('file:///etc/passwd'), false);
  assert.equal(isAllowedVendorUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedVendorUrl('not a URL'), false);
});

test('the executor can create an empty, restricted tab before vendor selection', () => {
  assert.equal(isAllowedVendorTabUrl('about:blank'), true);
  assert.equal(isAllowedVendorTabUrl('file:///C:/secret.txt'), false);
  assert.equal(isAllowedVendorTabUrl('javascript:alert(1)'), false);
});

test('vendor notifications accept bounded text only', () => {
  assert.deepEqual(
    sanitizeVendorNotification({
      title: ' Call ringing ',
      body: 'Incoming call',
      silent: true,
      icon: 'https://tracker.example.test/pixel',
    }),
    { title: 'Call ringing', body: 'Incoming call', silent: true },
  );
  assert.equal(sanitizeVendorNotification({ title: '   ' }), null);
  assert.equal(sanitizeVendorNotification({ title: 42 }), null);
  assert.equal(
    sanitizeVendorNotification({ title: 't'.repeat(121) }).title.length,
    120,
  );
  assert.equal(
    sanitizeVendorNotification({ title: 't', body: 'b'.repeat(501) }).body
      .length,
    500,
  );
});
