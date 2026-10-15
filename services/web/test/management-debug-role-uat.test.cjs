const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));

const dist = path.resolve(__dirname, '../dist');

test('debug diagnostics route matches backend admin roles', { timeout: 60000 }, async () => {
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let file = path.resolve(dist, `.${pathname}`);
    if (!file.startsWith(`${dist}${path.sep}`) && file !== dist) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (pathname === '/' || !path.extname(pathname)) file = path.join(dist, 'index.html');
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(await fs.readFile(file));
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
      const context = await browser.newContext({ locale: 'en-US' });
      const page = await context.newPage();
      let deepReads = 0;
      await page.routeWebSocket('**/*', socket => socket.close());
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/health/deep') {
          deepReads++;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'healthy', version: 'synthetic', gitSha: 'uat-fixture', buildTimestamp: '2026-10-14T00:00:00.000Z', endpointDiagnostics: [], latestSafeProbes: [] }),
          });
        }
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/api/auth/me') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user: { id: `synthetic-${role}`, name: 'Company Co Test', email: `${role}@company-co.invalid`, role, companyId: 'company-co' } }),
          });
        }
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health/')) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        }
        return route.continue();
      });
      await page.addInitScript(() => {
        localStorage.setItem('keledon-locale', 'en');
        sessionStorage.setItem('auth_token', 'SYNTHETIC-UAT-TOKEN-NOT-A-CREDENTIAL');
      });
      await page.goto(`${origin}/management/debug`);
      return { context, page, deepReads: () => deepReads };
    }

    const coordinator = await openAs('coordinator');
    await coordinator.page.waitForURL(`${origin}/dashboard`);
    assert.equal(coordinator.deepReads(), 0, 'coordinator must not enter a diagnostics view whose backend denies the role');
    await coordinator.context.close();

    const admin = await openAs('admin');
    await admin.page.getByText('Debug mode', { exact: true }).waitFor();
    const debugSwitch = admin.page.getByRole('checkbox');
    if (!(await debugSwitch.isChecked())) {
      await admin.page.locator('label').filter({ has: debugSwitch }).click();
    }
    await admin.page.getByText('Endpoint diagnostics', { exact: true }).waitFor();
    assert.ok(admin.deepReads() > 0, 'admin remains able to use the protected diagnostics page');
    await admin.context.close();

    console.log('PASS debug diagnostics UAT: coordinator redirected; admin allowed; all API responses synthetic and external requests blocked');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
