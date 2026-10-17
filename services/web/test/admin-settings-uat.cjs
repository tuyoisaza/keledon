// Scoped PHDK UAT: production-built settings navigation with synthetic identity, no external requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('../../api/node_modules/playwright');

const dist = path.resolve(__dirname, '../dist');
const evidence = path.resolve(__dirname, '../../../docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/admin-settings-uat.json');

async function main() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const candidate = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    const file = candidate.startsWith(dist + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      ? candidate
      : path.join(dist, 'index.html');
    res.setHeader('Content-Type', { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let role = 'superadmin';
  let externalBlocked = 0;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      sessionStorage.setItem('auth_token', 'isolated-admin-settings-uat');
      if (!localStorage.getItem('keledon-locale')) localStorage.setItem('keledon-locale', 'en');
    });
    const address = `http://127.0.0.1:${server.address().port}`;
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/api/auth/me') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: 'uat-admin-settings', name: 'Synthetic reviewer', email: 'uat@example.invalid', role, companyId: 'uat-company', teamId: 'uat-team' } }) });
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (url.origin !== address) { externalBlocked++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(`${address}/admin/settings`);
    await page.getByRole('heading', { name: 'Settings' }).waitFor();
    for (const label of ['Companies and tenants', 'AI prompts and workflows', 'Visual templates', 'Audit history', 'System status']) {
      await page.getByRole('link', { name: new RegExp(label) }).waitFor();
    }
    await page.evaluate(() => localStorage.setItem('keledon-locale', 'es'));
    role = 'admin';
    await page.reload();
    await page.getByRole('heading', { name: 'Configuración' }).waitFor();
    await page.getByRole('link', { name: /Usuarios y roles/ }).waitFor();
    await page.getByRole('link', { name: /Configuración de voz de mi empresa/ }).waitFor();
    for (const label of ['Empresas y tenants', 'Prompts y flujos de IA', 'Templates visuales', 'Historial de auditoría', 'Estado del sistema']) {
      assert.equal(await page.getByRole('link', { name: new RegExp(label) }).count(), 0, `tenant admin must not see ${label}`);
    }
    role = 'user';
    await page.reload();
    await page.waitForURL('**/dashboard');
    assert.equal(externalBlocked, 0);
    fs.mkdirSync(path.dirname(evidence), { recursive: true });
    fs.writeFileSync(evidence, JSON.stringify({ date: new Date().toISOString(), candidate: require('../package.json').version, target: 'production-built Web SPA with synthetic identity API', result: 'PASS_SCOPED', assertions: 14, checks: ['superadmin sees platform configuration links in English', 'tenant admin sees tenant links and voice configuration in Spanish but no platform-only links', 'ordinary user cannot enter management settings'], limitations: ['synthetic identity/API only; route authorization and backend CRUD are verified separately', 'no customer data or external endpoints'] }, null, 2) + '\n');
    console.log('PASS admin settings UAT: role-aware platform/tenant links, English/Spanish labels, and ordinary-user route denial; synthetic API only.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
