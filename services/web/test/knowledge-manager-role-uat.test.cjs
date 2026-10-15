const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));

const dist = path.resolve(__dirname, '../dist');
const companies = [
  { id: 'company-a', name: 'Tenant A' },
  { id: 'company-b', name: 'Tenant B' },
];

test('Knowledge manager actions follow coordinator and superadmin tenant scope', { timeout: 60000 }, async () => {
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
      const writes = [];
      let bases = [];
      await page.routeWebSocket('**/*', socket => socket.close());
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/health/deep') {
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
            body: JSON.stringify({ success: true, user: { id: `synthetic-${role}`, name: 'Synthetic Operator', email: `${role}@example.invalid`, role, companyId: role === 'coordinator' ? 'company-a' : null, teamId: role === 'coordinator' ? 'team-a' : null } }),
          });
        }
        if (url.pathname === '/api/crud/companies') {
          const visibleCompanies = role === 'superadmin' ? companies : companies.slice(0, 1);
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(visibleCompanies) });
        }
        if (url.pathname === '/api/crud/knowledge') {
          if (route.request().method() === 'POST') {
            const payload = route.request().postDataJSON();
            writes.push(payload);
            const created = { id: `base-${role}`, ...payload, _count: { documents: 0 } };
            bases = [...bases, created];
            return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
          }
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bases) });
        }
        if (url.pathname === '/api/vector-store/status') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ collectionExists: true, documentCount: 0, collectionSize: '0 KB', dimensions: 1536, distance: 'Cosine' }) });
        }
        if (url.pathname === '/api/vector-store/documents') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ documents: [] }) });
        }
        if (url.pathname.startsWith('/api/')) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        }
        return route.continue();
      });
      await page.addInitScript(({ currentRole }) => {
        localStorage.setItem('keledon-locale', 'en');
        sessionStorage.setItem('auth_token', `SYNTHETIC-UAT-${currentRole.toUpperCase()}-TOKEN-NOT-A-CREDENTIAL`);
      }, { currentRole: role });
      await page.goto(`${origin}/knowledge`);
      return { context, page, writes };
    }

    const coordinator = await openAs('coordinator');
    await coordinator.page.getByRole('heading', { name: 'Knowledge bases', exact: true }).waitFor();
    await coordinator.page.getByRole('button', { name: 'Create base', exact: true }).click();
    const coordinatorDialog = coordinator.page.getByRole('dialog', { name: 'Create knowledge base' });
    await coordinatorDialog.waitFor();
    const coordinatorCompany = coordinatorDialog.getByLabel('Company');
    assert.deepEqual(await coordinatorCompany.locator('option').evaluateAll(options => options.map(option => option.value)), ['', 'company-a']);
    await coordinatorCompany.selectOption('company-a');
    await coordinatorDialog.getByLabel('Name').fill('Coordinator Tenant A Base');
    await coordinatorDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await coordinatorDialog.waitFor({ state: 'hidden' });
    assert.deepEqual(coordinator.writes, [{ name: 'Coordinator Tenant A Base', companyId: 'company-a' }]);
    await coordinator.context.close();

    const superadmin = await openAs('superadmin');
    await superadmin.page.getByRole('heading', { name: 'Knowledge bases', exact: true }).waitFor();
    await superadmin.page.getByRole('button', { name: 'Create base', exact: true }).click();
    const superadminDialog = superadmin.page.getByRole('dialog', { name: 'Create knowledge base' });
    await superadminDialog.waitFor();
    const superadminCompany = superadminDialog.getByLabel('Company');
    assert.deepEqual(await superadminCompany.locator('option').evaluateAll(options => options.map(option => option.value)), ['', 'company-a', 'company-b']);
    await superadminCompany.selectOption('company-b');
    await superadminDialog.getByLabel('Name').fill('Superadmin Tenant B Base');
    await superadminDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await superadminDialog.waitFor({ state: 'hidden' });
    assert.deepEqual(superadmin.writes, [{ name: 'Superadmin Tenant B Base', companyId: 'company-b' }]);
    await superadmin.context.close();

    const user = await openAs('user');
    await user.page.getByRole('heading', { name: 'Knowledge Base', exact: true }).waitFor();
    assert.equal(await user.page.getByRole('heading', { name: 'Knowledge bases', exact: true }).count(), 0);
    assert.equal(await user.page.getByRole('button', { name: 'Create base', exact: true }).count(), 0);
    assert.deepEqual(user.writes, []);
    await user.context.close();

    console.log('PASS Knowledge role UAT: coordinator writes only company-a; superadmin may select company-b; user receives no manager controls; external traffic blocked');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
