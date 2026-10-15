const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));
const { getCandidateFingerprint } = require('./uat-candidate-evidence.cjs');
const appVersion = require('../package.json').version;

const dist = path.resolve(__dirname, '../dist');
const repoRoot = path.resolve(__dirname, '../../..');
const evidenceDir = process.env.KELEDON_UAT_EVIDENCE_DIR
  ? path.resolve(process.env.KELEDON_UAT_EVIDENCE_DIR)
  : path.join(repoRoot, 'docs/phdk/evidence');
const device = {
  id: 'device-co-001',
  name: 'Company Co Desktop',
  status: 'paired',
  platform: 'Windows',
  lastSeen: null,
  version: appVersion,
};

test('device management UAT: read-only role cannot revoke; tenant manager confirms and handles failure', { timeout: 90000 }, async () => {
  await fs.mkdir(evidenceDir, { recursive: true });
  let deviceList = [device];
  let deleteStatus = 500;
  const deletes = [];
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let candidate = path.resolve(dist, `.${pathname}`);
    if (!candidate.startsWith(`${dist}${path.sep}`) && candidate !== dist) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (pathname === '/' || !path.extname(pathname)) candidate = path.join(dist, 'index.html');
      res.setHeader('Content-Type', candidate.endsWith('.js') ? 'text/javascript' : candidate.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(await fs.readFile(candidate));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.KELEDON_UAT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--no-proxy-server'],
  });
  try {
    async function openAs(role) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-MX' });
      const page = await context.newPage();
      await page.routeWebSocket('**/*', socket => socket.close());
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        if (url.pathname === '/api/auth/me') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: 'companyco-admin', name: 'Company Co Admin', email: 'admin@company-co.invalid', role, companyId: 'company-co' } }) });
        }
        if (url.pathname === '/api/devices' && route.request().method() === 'GET') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(deviceList) });
        }
        if (url.pathname === `/api/devices/${device.id}` && route.request().method() === 'DELETE') {
          deletes.push({ role, id: device.id });
          if (deleteStatus !== 200) return route.fulfill({ status: deleteStatus, contentType: 'application/json', body: '{"message":"synthetic denial"}' });
          deviceList = deviceList.filter(item => item.id !== device.id);
          return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });
      await page.addInitScript(() => {
        sessionStorage.setItem('auth_token', 'SYNTHETIC-UAT-TOKEN-NOT-A-CREDENTIAL');
        localStorage.setItem('keledon-locale', 'es');
      });
      await page.goto(`${origin}/devices`);
      await page.getByRole('heading', { name: 'Dispositivos', exact: true }).waitFor();
      await page.getByText('Company Co Desktop', { exact: true }).waitFor();
      return { context, page };
    }

    const readOnly = await openAs('user');
    assert.equal(await readOnly.page.getByRole('button', { name: 'Revocar dispositivo Company Co Desktop', exact: true }).count(), 0);
    assert.equal(deletes.length, 0);
    await readOnly.page.screenshot({ path: path.join(evidenceDir, 'uat-device-read-only.png'), fullPage: true });
    await readOnly.context.close();

    const manager = await openAs('admin');
    const revoke = manager.page.getByRole('button', { name: 'Revocar dispositivo Company Co Desktop', exact: true });
    await revoke.click();
    const dialog = manager.page.getByRole('dialog');
    await dialog.getByText('La credencial del dispositivo dejará de funcionar.', { exact: false }).waitFor();
    await manager.page.screenshot({ path: path.join(evidenceDir, 'uat-device-revoke-confirmation.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(deletes.length, 0, 'cancel must not send a destructive request');

    await revoke.click();
    await dialog.getByRole('button', { name: 'Revocar acceso', exact: true }).click();
    await dialog.getByRole('alert').getByText('No se pudo revocar el dispositivo. Inténtalo de nuevo.', { exact: true }).waitFor();
    await manager.page.screenshot({ path: path.join(evidenceDir, 'uat-device-revoke-failure.png'), fullPage: true });
    assert.deepEqual(deletes, [{ role: 'admin', id: device.id }]);

    deleteStatus = 200;
    await dialog.getByRole('button', { name: 'Revocar acceso', exact: true }).click();
    await manager.page.getByText('No se encontraron dispositivos.', { exact: false }).waitFor();
    assert.equal(deletes.length, 2);
    await manager.page.screenshot({ path: path.join(evidenceDir, 'uat-device-revoked.png'), fullPage: true });
    const packageJson = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf8'));
    const candidate = await getCandidateFingerprint();
    await fs.writeFile(path.join(evidenceDir, 'uat-device-5.1.36.json'), JSON.stringify({
      case: 'UAT-032',
      version: packageJson.version,
      date: new Date().toISOString(),
      candidateRevision: candidate.baseCommit,
      candidateSourceFingerprint: candidate.sourceFingerprint,
      dirtyUntrackedSourceFiles: candidate.dirtyUntrackedSourceFiles,
      targetEnvironment: 'local production SPA with intercepted synthetic APIs; external HTTP and WebSockets blocked',
      personas: ['user', 'admin'],
      checks: [
        'User sees safe device summary and no revoke action.',
        'Admin cancel sends no DELETE.',
        'Admin failure is visible and retryable.',
        'Admin success removes the device from the list.',
      ],
      apiEvidence: 'services/api/test/regression/21-resource-scope.test.js: DB-derived registration binding, company-less denial, same-company manager revoke, foreign-company denial, ordinary-user denial.',
      screenshots: ['uat-device-read-only.png', 'uat-device-revoke-confirmation.png', 'uat-device-revoke-failure.png', 'uat-device-revoked.png'],
      provenance: 'synthetic frontend and isolated guard source evidence only; no real authentication, database, device, pairing, customer data or deployment',
    }, null, 2));
    await manager.context.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
