const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));

const dist = path.resolve(__dirname, '../dist');
const evidence = process.env.KELEDON_UAT_EVIDENCE_DIR
  ? path.resolve(process.env.KELEDON_UAT_EVIDENCE_DIR)
  : path.resolve(__dirname, '../../../docs/phdk/evidence');
const company = { id: 'company-co', name: 'Company Co S.A.S.' };

test('tenant flow definition editor uses company-scoped API contracts', { timeout: 90000 }, async () => {
  let flows = [];
  let versions = [];
  let permissions = [];
  let mappings = [];
  const writes = [];
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
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.KELEDON_UAT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--no-proxy-server'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await context.newPage();
    await fs.mkdir(evidence, { recursive: true });
    const apiRequests = [];
    await page.routeWebSocket('**/*', (socket) => socket.close());
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const method = route.request().method();
      const payload = method === 'GET' ? undefined : route.request().postDataJSON();
      apiRequests.push({ method, pathname: url.pathname, search: url.search, payload });
      let body = [];
      let status = 200;
      if (url.pathname === '/api/auth/me') body = { success: true, user: { id: 'synthetic-admin', name: 'Synthetic Admin', email: 'admin@tenant-a.invalid', role: 'admin', companyId: company.id } };
      else if (url.pathname === '/api/crud/companies') body = [company];
      else if (url.pathname === '/api/flow-definitions' && method === 'GET') body = flows;
      else if (url.pathname === '/api/flow-definitions' && method === 'POST') {
        const record = { id: 'flow-def-a', status: 'active', intentTags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...payload };
        flows.push(record); body = record; status = 201;
      } else if (url.pathname === '/api/flow-definitions/flow-def-a' && method === 'PUT') {
        flows = flows.map((flow) => flow.id === 'flow-def-a' ? { ...flow, ...payload } : flow);
        body = flows.find((flow) => flow.id === 'flow-def-a');
      } else if (url.pathname === '/api/flow-definitions/flow-def-a' && method === 'DELETE') {
        flows = flows.map((flow) => flow.id === 'flow-def-a' ? { ...flow, status: 'inactive' } : flow);
        body = flows.find((flow) => flow.id === 'flow-def-a');
      } else if (url.pathname === '/api/flow-versions' && method === 'GET') body = versions;
      else if (url.pathname === '/api/flow-versions' && method === 'POST') {
        const record = { id: 'flow-version-a', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...payload };
        versions.push(record); body = record; status = 201;
      } else if (url.pathname === '/api/flow-versions/flow-version-a' && method === 'PUT') {
        versions = versions.map((version) => version.id === 'flow-version-a' ? { ...version, ...payload } : version);
        body = versions.find((version) => version.id === 'flow-version-a');
      } else if (url.pathname === `/api/tenant-flow-permissions/${company.id}` && method === 'GET') body = permissions;
      else if (url.pathname === '/api/tenant-flow-permissions' && method === 'POST') {
        writes.push({ method, pathname: url.pathname, payload });
        permissions = payload;
        body = permissions;
      } else if (url.pathname === `/api/intent-flow-mappings/${company.id}` && method === 'GET') body = mappings;
      else if (url.pathname === '/api/intent-flow-mappings' && method === 'POST') {
        writes.push({ method, pathname: url.pathname, payload });
        const index = mappings.findIndex((entry) => entry.intent === payload.intent);
        if (index < 0) mappings.push(payload); else mappings[index] = payload;
        body = payload;
      }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.addInitScript(() => sessionStorage.setItem('auth_token', 'SYNTHETIC-UAT-TOKEN-NOT-A-CREDENTIAL'));
    await page.goto(`${origin}/management/flow-definitions`);
    await page.getByRole('heading', { name: 'Tenant flow definitions' }).waitFor();
    assert.equal(await page.getByLabel('Company scope').count(), 0, 'tenant admin cannot choose a company in the editor');
    const newFlowButton = page.getByRole('button', { name: 'New flow' });
    await newFlowButton.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'Name' }).fill('Claims intake');
    await page.getByRole('textbox', { name: 'Description' }).fill('Tenant-specific claims call flow');
    await page.getByRole('textbox', { name: 'Intent tags, comma separated' }).fill('claim, claim-status');
    const saveDefinitionButton = page.getByRole('button', { name: 'Save definition' });
    await saveDefinitionButton.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Claims intake' }).waitFor();
    const definitionWrite = apiRequests.find((request) => request.method === 'POST' && request.pathname === '/api/flow-definitions');
    assert.equal(definitionWrite.payload.companyId, company.id);

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Claims intake updated');
    await page.getByRole('button', { name: 'Save definition' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Claims intake updated' }).waitFor();
    const definitionUpdate = apiRequests.find((request) => request.method === 'PUT' && request.pathname === '/api/flow-definitions/flow-def-a');
    assert.equal(definitionUpdate.payload.companyId, company.id);
    assert.equal(definitionUpdate.payload.name, 'Claims intake updated');

    await page.getByRole('textbox', { name: 'Steps (JSON array)' }).fill('[{"type":"navigate","value":"https://example.invalid"}]');
    const saveVersionButton = page.getByRole('button', { name: 'Save version' });
    await saveVersionButton.focus();
    await page.keyboard.press('Enter');
    await page.getByText('v1 · draft · 1 steps').waitFor();
    const versionWrite = apiRequests.find((request) => request.method === 'POST' && request.pathname === '/api/flow-versions');
    assert.equal(versionWrite.payload.flowDefinitionId, 'flow-def-a');
    await page.getByRole('button', { name: 'Edit draft' }).click();
    await page.getByLabel('Steps (JSON array)').fill('[{"type":"navigate","value":"https://example.invalid"},{"type":"wait","value":"250"}]');
    const updateDraft = page.waitForResponse((response) => {
      const request = response.request();
      return new URL(response.url()).pathname === '/api/flow-versions/flow-version-a' && request.method() === 'PUT';
    });
    await page.getByRole('button', { name: 'Save version' }).focus();
    await page.keyboard.press('Enter');
    await updateDraft;
    await page.getByText('v1 · draft · 2 steps').waitFor();
    assert.ok(apiRequests.some((request) => request.method === 'PUT' && request.pathname === '/api/flow-versions/flow-version-a' && request.payload.steps.length === 2));
    await page.getByRole('button', { name: 'Edit draft' }).click();
    await page.getByLabel('Status').selectOption('approved');
    await page.getByRole('button', { name: 'Save version' }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('v1 · approved · 2 steps').waitFor();

    const availability = page.getByLabel('Available to this company');
    const enabledResponse = page.waitForResponse((response) => {
      const request = response.request();
      return new URL(response.url()).pathname === '/api/tenant-flow-permissions' && request.method() === 'POST' && request.postDataJSON()[0]?.isEnabled === true;
    });
    await availability.focus();
    await page.keyboard.press('Space');
    await enabledResponse;
    assert.equal(await availability.isChecked(), true, 'availability can be enabled from the keyboard');
    const disabledResponse = page.waitForResponse((response) => {
      const request = response.request();
      return new URL(response.url()).pathname === '/api/tenant-flow-permissions' && request.method() === 'POST' && request.postDataJSON()[0]?.isEnabled === false;
    });
    await availability.focus();
    await page.keyboard.press('Space');
    await disabledResponse;
    assert.equal(await availability.isChecked(), false, 'availability can be disabled while retaining its row');
    const reenabledResponse = page.waitForResponse((response) => {
      const request = response.request();
      return new URL(response.url()).pathname === '/api/tenant-flow-permissions' && request.method() === 'POST' && request.postDataJSON()[0]?.isEnabled === true;
    });
    await availability.focus();
    await page.keyboard.press('Space');
    await reenabledResponse;
    assert.equal(await availability.isChecked(), true);
    await page.getByRole('textbox', { name: 'Intent' }).fill('claim');
    const toggleMapping = page.getByRole('button', { name: 'Toggle mapping' });
    const mappingAdded = page.waitForResponse((response) => {
      const request = response.request();
      return new URL(response.url()).pathname === '/api/intent-flow-mappings' && request.method() === 'POST' && request.postDataJSON().allowedFlowDefinitionIds?.includes('flow-def-a');
    });
    await toggleMapping.focus();
    await page.keyboard.press('Enter');
    await mappingAdded;
    const mappingRemoved = page.waitForResponse((response) => {
      const request = response.request();
      return new URL(response.url()).pathname === '/api/intent-flow-mappings' && request.method() === 'POST' && request.postDataJSON().allowedFlowDefinitionIds?.length === 0;
    });
    await toggleMapping.focus();
    await page.keyboard.press('Enter');
    await mappingRemoved;
    assert.ok(writes.some((write) => write.pathname === '/api/tenant-flow-permissions' && write.payload[0].companyId === company.id));
    assert.deepEqual(writes.filter((write) => write.pathname === '/api/tenant-flow-permissions').map((write) => write.payload[0].isEnabled), [true, false, true]);
    assert.ok(writes.some((write) => write.pathname === '/api/intent-flow-mappings' && write.payload.companyId === company.id));
    assert.deepEqual(writes.filter((write) => write.pathname === '/api/intent-flow-mappings').map((write) => write.payload.allowedFlowDefinitionIds), [['flow-def-a'], []]);
    assert.ok(apiRequests.filter((request) => request.pathname === '/api/flow-definitions').every((request) => request.search.includes(`companyId=${company.id}`) || request.method === 'POST'));
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(evidence, 'flow-editor-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileWidth = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(mobileWidth.content <= mobileWidth.viewport, `flow editor has no horizontal overflow at 390px: ${JSON.stringify(mobileWidth)}`);
    await page.getByRole('main').first().evaluate((element) => { element.scrollTop = 0; });
    await page.getByRole('heading', { name: 'Tenant flow definitions' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(evidence, 'flow-editor-mobile.png') });
    await page.setViewportSize({ width: 1280, height: 900 });
    page.once('dialog', (dialog) => dialog.accept());
    const deactivateButton = page.getByRole('button', { name: 'Deactivate' });
    await deactivateButton.click();
    await deactivateButton.waitFor({ state: 'detached' });
    assert.equal(flows.find((flow) => flow.id === 'flow-def-a').status, 'inactive');
    assert.ok(apiRequests.some((request) => request.method === 'DELETE' && request.pathname === '/api/flow-definitions/flow-def-a'));
    await fs.writeFile(path.join(evidence, 'flow-editor-uat.json'), JSON.stringify({ date: new Date().toISOString(), candidateVersion: require('../package.json').version, target: 'local production SPA on loopback', persona: 'synthetic Company Co admin', actions: ['keyboard-create-definition', 'edit-definition', 'edit-draft-version', 'approve-version', 'availability-enable-disable', 'intent-mapping-add-remove', 'confirmed-soft-deactivate', 'mobile-390px-overflow-check'], network: 'external HTTP and WebSockets blocked; APIs intercepted', mobileWidth }, null, 2));
    await context.close();
    console.log('PASS tenant flow definition UAT: create/edit/soft-deactivate, draft update/approval, availability enable/disable and intent mapping add/remove use synthetic API fixtures; tenant company picker is absent and external requests are blocked.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
