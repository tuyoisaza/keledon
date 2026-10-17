const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));

const dist = path.resolve(__dirname, '../dist');
const evidence = process.env.KELEDON_UAT_EVIDENCE_DIR
  ? path.resolve(process.env.KELEDON_UAT_EVIDENCE_DIR)
  : path.resolve(__dirname, '../../../docs/phdk/evidence');
const companies = [
  { id: 'company-a', name: 'Company Co S.A.S.' },
  { id: 'company-b', name: 'Tenant B Ltd.' },
];

test('superadmin flow configuration switches tenant scope and safely assigns legacy definitions', { timeout: 90000 }, async () => {
  let definitions = [
    { id: 'flow-a', companyId: 'company-a', name: 'Company A flow', description: 'A only', category: 'case', status: 'active', intentTags: [], createdAt: '', updatedAt: '' },
    { id: 'flow-b', companyId: 'company-b', name: 'Company B flow', description: 'B only', category: 'case', status: 'active', intentTags: [], createdAt: '', updatedAt: '' },
    { id: 'legacy-flow', name: 'Unassigned legacy flow', description: 'Needs an owner', category: 'case', status: 'active', intentTags: [], createdAt: '', updatedAt: '' },
  ];
  let versions = [];
  let permissions = [];
  let mappings = [];
  const requests = [];
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
    await page.routeWebSocket('**/*', (socket) => socket.close());
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const method = route.request().method();
      const payload = method === 'GET' ? undefined : route.request().postDataJSON();
      requests.push({ method, pathname: url.pathname, search: url.search, payload });
      let body = [];
      let status = 200;
      if (url.pathname === '/api/auth/me') body = { success: true, user: { id: 'synthetic-superadmin', name: 'Synthetic Superadmin', email: 'superadmin@company-co.invalid', role: 'superadmin' } };
      else if (url.pathname === '/api/crud/companies') body = companies;
      else if (url.pathname === '/api/flow-definitions' && method === 'GET') {
        const companyId = url.searchParams.get('companyId');
        body = companyId === null
          ? definitions.filter((flow) => !flow.companyId)
          : definitions.filter((flow) => flow.companyId === companyId);
      } else if (url.pathname === '/api/flow-definitions' && method === 'POST') {
        const record = { id: 'flow-created-b', status: 'active', intentTags: [], createdAt: '', updatedAt: '', ...payload };
        definitions.push(record); body = record; status = 201;
      } else if (url.pathname === '/api/flow-definitions/legacy-flow' && method === 'PUT') {
        definitions = definitions.map((flow) => flow.id === 'legacy-flow' ? { ...flow, ...payload } : flow);
        body = definitions.find((flow) => flow.id === 'legacy-flow');
      } else if (url.pathname === '/api/flow-definitions/flow-b' && method === 'PUT') {
        definitions = definitions.map((flow) => flow.id === 'flow-b' ? { ...flow, ...payload } : flow);
        body = definitions.find((flow) => flow.id === 'flow-b');
      } else if (url.pathname === '/api/flow-definitions/flow-b' && method === 'DELETE') {
        definitions = definitions.map((flow) => flow.id === 'flow-b' ? { ...flow, status: 'inactive' } : flow);
        body = definitions.find((flow) => flow.id === 'flow-b');
      } else if (url.pathname === '/api/flow-definitions/flow-created-b' && method === 'PUT') {
        definitions = definitions.map((flow) => flow.id === 'flow-created-b' ? { ...flow, ...payload } : flow);
        body = definitions.find((flow) => flow.id === 'flow-created-b');
      } else if (url.pathname === '/api/flow-versions' && method === 'GET') {
        const companyId = url.searchParams.get('companyId');
        const visibleFlowIds = new Set(definitions.filter((flow) => companyId === null ? !flow.companyId : flow.companyId === companyId).map((flow) => flow.id));
        body = versions.filter((version) => visibleFlowIds.has(version.flowDefinitionId));
      } else if (url.pathname === '/api/flow-versions' && method === 'POST') {
        const record = { id: 'version-created-b', createdAt: '', updatedAt: '', ...payload };
        versions.push(record); body = record; status = 201;
      } else if (url.pathname === '/api/flow-versions/version-created-b' && method === 'PUT') {
        versions = versions.map((version) => version.id === 'version-created-b' ? { ...version, ...payload } : version);
        body = versions.find((version) => version.id === 'version-created-b');
      } else if (url.pathname.startsWith('/api/tenant-flow-permissions/') && method === 'GET') {
        body = permissions.filter((permission) => permission.companyId === decodeURIComponent(url.pathname.split('/').pop()));
      } else if (url.pathname === '/api/tenant-flow-permissions' && method === 'POST') {
        permissions = [...permissions.filter((permission) => !payload.some((next) => next.companyId === permission.companyId && next.flowDefinitionId === permission.flowDefinitionId)), ...payload];
        body = payload;
      } else if (url.pathname.startsWith('/api/intent-flow-mappings/') && method === 'GET') {
        body = mappings.filter((mapping) => mapping.companyId === decodeURIComponent(url.pathname.split('/').pop()));
      } else if (url.pathname === '/api/intent-flow-mappings' && method === 'POST') {
        mappings = [...mappings.filter((mapping) => mapping.companyId !== payload.companyId || mapping.intent !== payload.intent), payload];
        body = payload;
      }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.addInitScript(() => sessionStorage.setItem('auth_token', 'SYNTHETIC-UAT-TOKEN-NOT-A-CREDENTIAL'));
    await page.goto(`${origin}/management/flow-definitions`);
    await page.getByRole('heading', { name: 'Tenant flow definitions' }).waitFor();

    const companyScope = page.getByLabel('Company scope');
    await companyScope.waitFor();
    await page.getByRole('button', { name: 'Company A flow' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Company B flow' }).count(), 0, 'initial company view excludes Tenant B flows');
    await companyScope.selectOption('company-b');
    await page.getByRole('button', { name: 'Company B flow' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Company A flow' }).count(), 0, 'selected-company view excludes Company A flows');
    assert.ok(requests.some((request) => request.method === 'GET' && request.pathname === '/api/flow-definitions' && request.search.includes('companyId=company-b')));

    const companyBRow = page.locator('li').filter({ hasText: 'Company B flow' });
    await companyBRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Company B flow updated');
    await page.getByRole('button', { name: 'Save definition' }).click();
    await page.getByRole('heading', { name: 'Company B flow updated' }).waitFor();
    const companyBUpdate = requests.find((request) => request.method === 'PUT' && request.pathname === '/api/flow-definitions/flow-b');
    assert.equal(companyBUpdate.payload.companyId, 'company-b');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('li').filter({ hasText: 'Company B flow updated' }).getByRole('button', { name: 'Deactivate' }).click();
    await page.getByText('case · inactive').waitFor();
    assert.ok(requests.some((request) => request.method === 'DELETE' && request.pathname === '/api/flow-definitions/flow-b'));

    await page.getByRole('button', { name: 'New flow' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Tenant B claims intake');
    await page.getByRole('textbox', { name: 'Description' }).fill('Synthetic cross-tenant acceptance flow');
    await page.getByRole('button', { name: 'Save definition' }).click();
    await page.getByRole('heading', { name: 'Tenant B claims intake' }).waitFor();
    const created = requests.find((request) => request.method === 'POST' && request.pathname === '/api/flow-definitions');
    assert.equal(created.payload.companyId, 'company-b');

    await page.getByRole('textbox', { name: 'Steps (JSON array)' }).fill('[{"type":"capture","value":"claim"}]');
    await page.getByRole('button', { name: 'Save version' }).click();
    await page.getByText('v1 · draft · 1 steps').waitFor();
    const versionWrite = requests.find((request) => request.method === 'POST' && request.pathname === '/api/flow-versions');
    assert.equal(versionWrite.payload.flowDefinitionId, 'flow-created-b');
    await page.getByRole('button', { name: 'Edit draft' }).click();
    await page.getByLabel('Status').selectOption('approved');
    await page.getByRole('button', { name: 'Save version' }).click();
    await page.getByText('v1 · approved · 1 steps').waitFor();
    assert.equal(requests.find((request) => request.method === 'PUT' && request.pathname === '/api/flow-versions/version-created-b').payload.status, 'approved');

    const availability = page.getByLabel('Available to this company');
    await availability.check();
    await page.getByText('Tenant flow availability updated').waitFor();
    await page.getByRole('textbox', { name: 'Intent' }).fill('claim');
    await page.getByRole('button', { name: 'Toggle mapping' }).click();
    const permissionWrite = requests.find((request) => request.method === 'POST' && request.pathname === '/api/tenant-flow-permissions');
    const mappingWrite = requests.find((request) => request.method === 'POST' && request.pathname === '/api/intent-flow-mappings');
    assert.equal(permissionWrite.payload[0].companyId, 'company-b');
    assert.equal(permissionWrite.payload[0].flowDefinitionId, 'flow-created-b');
    assert.equal(mappingWrite.payload.companyId, 'company-b');
    assert.deepEqual(mappingWrite.payload.allowedFlowDefinitionIds, ['flow-created-b']);
    await page.getByRole('button', { name: 'Toggle mapping' }).click();
    const replacementMapping = requests.filter((request) => request.method === 'POST' && request.pathname === '/api/intent-flow-mappings').at(-1);
    assert.deepEqual(replacementMapping.payload.allowedFlowDefinitionIds, []);
    await availability.uncheck();
    const disabledPermission = requests.filter((request) => request.method === 'POST' && request.pathname === '/api/tenant-flow-permissions').at(-1);
    assert.equal(disabledPermission.payload[0].isEnabled, false);

    await companyScope.selectOption('__legacy__');
    await page.getByRole('button', { name: /^Unassigned legacy flow/ }).waitFor();
    await page.getByRole('button', { name: 'Edit' }).click();
    const owner = page.getByLabel('Assign to company');
    await owner.selectOption('company-a');
    await page.getByRole('textbox', { name: 'Name' }).fill('Legacy intake assigned to A');
    await page.getByRole('button', { name: 'Save definition' }).click();
    await page.getByRole('heading', { name: 'Legacy intake assigned to A' }).waitFor();
    const legacyUpdate = requests.find((request) => request.method === 'PUT' && request.pathname === '/api/flow-definitions/legacy-flow');
    assert.equal(legacyUpdate.payload.companyId, 'company-a');
    await companyScope.selectOption('company-a');
    await page.getByRole('button', { name: 'Legacy intake assigned to A' }).waitFor();

    const report = {
      case: 'UAT-081',
      version: require('../package.json').version,
      candidateRevision: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8' }).trim(),
      candidateSourceFingerprint: `sha256:${crypto.createHash('sha256').update(await fs.readFile(path.resolve(__dirname, '../src/pages/ManagementFlowDefinitionsPage.tsx'))).digest('hex')}`,
      workingTreeSourceIncluded: true,
      target: 'local production-built Web SPA with synthetic intercepted APIs; external HTTP and WebSockets blocked',
      persona: 'synthetic superadmin',
      result: 'PASS',
      assertions: [
        'Superadmin can switch company scope and reads only the selected company definitions.',
        'Definition create/update/deactivate, draft creation and approval, availability enable/disable, and mapping add/remove carry the selected company and definition.',
        'Superadmin can view an unassigned legacy definition, assign it to a chosen company, and see it under that company after saving.',
      ],
      persistence: 'Synthetic in-memory API fixture only; API/Cloud persistence and authorization are recorded in UAT-079/080.',
      externalTraffic: 'blocked',
    };
    await fs.writeFile(path.join(evidence, `uat-flow-config-superadmin-web-${report.version}.json`), `${JSON.stringify(report, null, 2)}\n`);
    await context.close();
    console.log('PASS superadmin flow configuration UAT: tenant switching, scoped definition/version/permission/mapping writes, and legacy ownership assignment; external requests blocked.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
