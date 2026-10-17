// Explicit admin audit UAT: built Web UI and synthetic redacted API response only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('../../api/node_modules/playwright');
const dist = path.resolve(__dirname, '../dist');
async function main() {
  const server = http.createServer((req, res) => {
    const candidate = path.resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    const file = candidate.startsWith(dist + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(dist, 'index.html');
    res.setHeader('Content-Type', { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let role = 'superadmin';
  const requests = [];
  const entry = { id: 'audit-1', userId: 'user-1', action: 'UPDATE', entity: 'vendor', entityId: 'vendor-1', changes: '{"apiKey":"[REDACTED]","safe":"updated"}', ipAddress: '127.0.0.1', userAgent: 'fixture', createdAt: '2026-10-16T12:00:00.000Z', user: { id: 'user-1', name: 'Company Co reviewer', email: 'fixture@example.invalid' } };
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    await context.addInitScript(() => { sessionStorage.setItem('auth_token', 'isolated-audit-token'); localStorage.setItem('keledon-locale', 'en'); });
    const address = 'http://127.0.0.1:' + server.address().port;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const reply = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/auth/me') return reply(200, { success: true, user: { id: 'superadmin-1', name: 'Fixture Superadmin', email: 'admin@example.invalid', role, companyId: null } });
      if (url.pathname === '/api/crud/audit-logs') {
        requests.push(url);
        return role === 'superadmin' ? reply(200, { data: [entry], pagination: { total: 51, limit: 50, offset: Number(url.searchParams.get('offset') || 0), hasMore: true } }) : reply(403, {});
      }
      if (url.origin !== address) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(address + '/admin/audit');
    await page.getByRole('heading', { name: 'Audit Log', exact: true }).waitFor();
    await page.getByText('Company Co reviewer', { exact: true }).waitFor();
    await page.getByText('UPDATE', { exact: true }).waitFor();
    await page.getByText('vendor-1', { exact: true }).waitFor();
    await page.getByText('Successful events only; denied requests are not recorded here.', { exact: true }).waitFor();
    await page.getByText('View redacted details', { exact: true }).click();
    await page.getByText('{"apiKey":"[REDACTED]","safe":"updated"}', { exact: true }).waitFor();
    assert.equal(await page.getByText(/sk-[A-Za-z0-9]{12,}/).count(), 0);
    await page.getByLabel('Action', { exact: true }).fill('UPDATE');
    const filteredResponse = page.waitForResponse(response => response.url().includes('/api/crud/audit-logs') && response.url().includes('action=UPDATE'));
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await filteredResponse;
    assert.equal(requests.at(-1).searchParams.get('action'), 'UPDATE');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export visible page', exact: true }).click();
    const download = await downloadPromise;
    const csvPath = path.join(require('node:os').tmpdir(), 'keledon-audit-uat-' + Date.now() + '.csv');
    await download.saveAs(csvPath);
    const csv = fs.readFileSync(csvPath, 'utf8');
    assert(csv.includes('UPDATE') && csv.includes('vendor-1') && csv.includes('[REDACTED]'));
    fs.unlinkSync(csvPath);
    const nextResponse = page.waitForResponse(response => response.url().includes('/api/crud/audit-logs') && response.url().includes('offset=50'));
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await nextResponse;
    assert.equal(requests.at(-1).searchParams.get('offset'), '50');
    role = 'admin';
    const requestsBeforeDeniedRoute = requests.length;
    await page.goto(address + '/admin/audit');
    await page.waitForURL('**/dashboard');
    assert.equal(requests.length, requestsBeforeDeniedRoute);
    const result = { target: 'isolated local built React SPA with synthetic audit rows', result: 'PASS', cases: ['superadmin route loads sanitized audit data', 'event metadata and success-only limitation shown', 'redacted change details displayed', 'filters sent as encoded query', 'visible page exports CSV with redacted values', 'pagination requests next page', 'tenant admin route denied before audit data request'], providerCalls: 0, persistence: 'fixture only; no database or audit data claim' };
    const evidence = path.resolve(__dirname, '../../../docs/phdk/workstreams/ADMIN-AUDIT-UAT.json');
    fs.writeFileSync(evidence, JSON.stringify(result, null, 2) + '\n');
    console.log('PASS admin audit UI UAT: ' + result.cases.join('; '));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
