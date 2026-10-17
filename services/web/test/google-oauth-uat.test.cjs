const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));

const dist = path.resolve(__dirname, '../dist');
const fixtureCode = 'fixture-one-time-oauth-code';

test('Google callback removes the fragment code and exchanges it by POST', { timeout: 60000 }, async () => {
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    let candidate = path.resolve(dist, `.${pathname}`);
    if (!candidate.startsWith(dist + path.sep) && candidate !== dist) {
      response.writeHead(403).end();
      return;
    }
    try {
      if (pathname === '/' || !path.extname(pathname)) candidate = path.join(dist, 'index.html');
      const content = await fs.readFile(candidate);
      response.setHeader('Content-Type', candidate.endsWith('.js') ? 'text/javascript' : candidate.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.KELEDON_UAT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      args: ['--no-proxy-server'],
    });
    const page = await browser.newPage();
    const exchangeRequests = [];
    const externalRequests = [];
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) {
        externalRequests.push(url.origin);
        await route.abort();
        return;
      }
      if (url.pathname === '/api/auth/google/exchange') {
        exchangeRequests.push({
          method: route.request().method(),
          body: route.request().postDataJSON(),
          fragment: new URL(page.url()).hash,
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'synthetic-session-token',
            user: { id: 'companyco-001', email: 'companyco.001@company-co.invalid', role: 'user' },
          }),
        });
        return;
      }
      if (url.pathname === '/api/auth/me') {
        assert.match(route.request().headers().authorization || '', /^Bearer synthetic-session-token$/);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, user: { id: 'companyco-001', name: 'Synthetic User', email: 'companyco.001@company-co.invalid', role: 'user' } }),
        });
        return;
      }
      if (url.pathname.startsWith('/api/')) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    await page.goto(`${origin}/login#oauth_code=${fixtureCode}`);
    await page.waitForURL(`${origin}/dashboard`, { timeout: 15000 });
    assert.equal(await page.evaluate(() => sessionStorage.getItem('auth_token')), 'synthetic-session-token');
    assert.equal(exchangeRequests.length, 1);
    assert.equal(exchangeRequests[0].method, 'POST');
    assert.deepEqual(exchangeRequests[0].body, { code: fixtureCode });
    assert.equal(exchangeRequests[0].fragment, '');
    assert.deepEqual(externalRequests, []);
    await page.close();
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
