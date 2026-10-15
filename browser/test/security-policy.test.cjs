const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  isAllowedVendorTabUrl,
  isAllowedVendorNavigation,
  isAllowedConfiguredVendorUrl,
  isAllowedVendorRequest,
  isAllowedVendorUrl,
  isTrustedAppRendererUrl,
  getAllowedVendorOrigins,
  sanitizeVendorNotification,
  secureRendererPreferences,
  getRuntimeVendorNavigationScope,
  getRuntimeVendorRequestScope,
  setRuntimeVendorNavigationScope,
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

test('tenant vendor allowlists permit configured private CRM origins and block redirects elsewhere', () => {
  const allowed = ['http://127.0.0.1:8080', 'https://crm.example.test'];
  assert.equal(isAllowedConfiguredVendorUrl('http://127.0.0.1:8080/calls', allowed), true);
  assert.equal(isAllowedConfiguredVendorUrl('https://crm.example.test/record/1', allowed), true);
  assert.equal(isAllowedConfiguredVendorUrl('http://127.0.0.1:8081/', allowed), false);
  assert.equal(isAllowedConfiguredVendorUrl('http://169.254.169.254/latest/meta-data', allowed), false);
  assert.equal(isAllowedConfiguredVendorUrl('https://user:pass@crm.example.test/', allowed), false);
  assert.deepEqual(
    getAllowedVendorOrigins({ baseUrl: 'https://crm.example.test/login', allowedOrigins: ['http://127.0.0.1:8080', 'javascript:alert(1)', 'https://evil.example.test/path'] }),
    ['https://crm.example.test', 'http://127.0.0.1:8080'],
  );
});

test('active RPA resource requests allow only tenant-configured origins', () => {
  const allowed = ['http://192.168.10.20:8080', 'https://crm.example.test'];
  assert.equal(isAllowedVendorRequest('https://crm.example.test/assets/app.js', allowed), true);
  assert.equal(isAllowedVendorRequest('http://192.168.10.20:8080/api/calls', allowed), true);
  assert.equal(isAllowedVendorRequest('wss://crm.example.test/socket', allowed), true);
  assert.equal(isAllowedVendorRequest('wss://socket.example.test/events', allowed), false);
  assert.equal(isAllowedVendorRequest('https://cdn.example.test/tracker.js', allowed), false);
  assert.equal(isAllowedVendorRequest('http://192.168.10.20:8081/api', allowed), false);
  assert.equal(isAllowedVendorRequest('https://user:pass@crm.example.test/private', allowed), false);
  assert.equal(isAllowedVendorRequest('file:///etc/passwd', allowed), false);
});

test('tenant vendor frame navigation permits only configured origins and inherited blank frames', () => {
  const allowed = ['http://192.168.10.20:8080', 'https://crm.example.test'];
  assert.equal(isAllowedVendorNavigation('http://192.168.10.20:8080/calls', allowed), true);
  assert.equal(isAllowedVendorNavigation('about:blank', allowed), true);
  assert.equal(isAllowedVendorNavigation('http://169.254.169.254/latest/meta-data', allowed), false);
  assert.equal(isAllowedVendorNavigation('https://external.example.test/frame', allowed), false);
  assert.equal(isAllowedVendorNavigation('file:///etc/passwd', allowed), false);
});

test('runtime RPA navigation scope is copied, isolated per WebContents, and cleared after the flow', () => {
  const first = {};
  const second = {};
  const configured = ['https://crm.example.test'];
  setRuntimeVendorNavigationScope(first, configured);
  configured.push('https://untrusted.example.test');
  assert.deepEqual(getRuntimeVendorNavigationScope(first), ['https://crm.example.test']);
  assert.equal(getRuntimeVendorNavigationScope(second), undefined);
  setRuntimeVendorNavigationScope(first, undefined);
  assert.equal(getRuntimeVendorNavigationScope(first), undefined);
});

test('service-worker requests resolve the active tenant scope conservatively', () => {
  const session = {};
  const first = { session };
  const second = { session };
  setRuntimeVendorNavigationScope(first, ['https://crm.example.test', 'https://api.example.test']);
  setRuntimeVendorNavigationScope(second, ['https://crm.example.test', 'https://portal.example.test']);
  assert.deepEqual(
    getRuntimeVendorRequestScope(session, undefined, 'https://crm.example.test'),
    ['https://crm.example.test'],
    'overlapping tenants use the intersection, never the union, for an unattributed worker request',
  );
  assert.deepEqual(
    getRuntimeVendorRequestScope(session, undefined, 'https://unknown.example.test'),
    [],
    'an unrecognized worker initiator is denied while RPA scopes are active',
  );
  assert.deepEqual(
    getRuntimeVendorRequestScope(session, first, 'https://unknown.example.test'),
    ['https://crm.example.test', 'https://api.example.test'],
    'a known WebContents remains bound to its own tenant scope',
  );
  setRuntimeVendorNavigationScope(first, undefined);
  setRuntimeVendorNavigationScope(second, undefined);
  assert.equal(getRuntimeVendorRequestScope(session, undefined, 'https://crm.example.test'), undefined);
});

test('frame, popup, and IPC navigation entry points use the active RPA tenant scope', () => {
  const tabManager = fs.readFileSync(path.resolve('src/tab-manager.ts'), 'utf8');
  const ipcHandlers = fs.readFileSync(path.resolve('src/ipc-handlers.ts'), 'utf8');
  const executor = fs.readFileSync(path.resolve('src/rpa-executor.ts'), 'utf8');
  assert.match(tabManager, /getRuntimeVendorNavigationScope\(view\.webContents\) \?\? scopedOrigins/);
  assert.match(tabManager, /on\('will-frame-navigate',[\s\S]*guardVendorNavigation\(event, event\.url\)/);
  assert.match(tabManager, /setWindowOpenHandler\([\s\S]*const allowedOrigins = getNavigationScope\(\)/);
  assert.match(tabManager, /webRequest\.onBeforeRequest\([\s\S]*details\.webContentsId[\s\S]*webContents\.fromId\(details\.webContentsId\)[\s\S]*getRuntimeVendorRequestScope\([\s\S]*details\.initiatorOrigin[\s\S]*isAllowedVendorRequest\(details\.url, allowedOrigins\)/);
  assert.match(ipcHandlers, /getRuntimeVendorNavigationScope\(tab\.view\.webContents\) \?\? tab\.allowedOrigins/);
  assert.match(executor, /setRuntimeVendorNavigationScope\(view\.webContents, flow\.allowed_origins\)/);
  assert.match(executor, /finally \{\s*setRuntimeVendorNavigationScope\(view\.webContents, priorRuntimeScope\)/);
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
