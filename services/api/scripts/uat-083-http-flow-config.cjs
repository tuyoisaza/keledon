const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const apiRoot = path.join(repoRoot, 'services/api');
const cloudRoot = path.join(repoRoot, 'cloud');
const authSecret = process.env.KELEDON_AUTH_SECRET;
const apiDatabaseUrl = process.env.KELEDON_UAT_API_DATABASE_URL;
const cloudDatabaseUrl = process.env.KELEDON_UAT_CLOUD_DATABASE_URL;

if (!authSecret || !apiDatabaseUrl || !cloudDatabaseUrl) {
  throw new Error(
    'Set KELEDON_AUTH_SECRET, KELEDON_UAT_API_DATABASE_URL, and KELEDON_UAT_CLOUD_DATABASE_URL for isolated UAT.',
  );
}

const baseEnvironment = (databaseUrl, port, dataDirectory) => {
  const env = {};
  for (const key of [
    'PATH',
    'SystemRoot',
    'WINDIR',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {
    DATABASE_URL: databaseUrl,
    KELEDON_AUTH_SECRET: authSecret,
    KELEDON_DATA_DIR: dataDirectory,
    NODE_ENV: 'development',
    PORT: String(port),
    HOST: '127.0.0.1',
  });
  return env;
};

const sign = (user, role) => {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role,
      expiresAt: Date.now() + 120_000,
    }),
  ).toString('base64');
  return `${payload}.${crypto
    .createHmac('sha256', authSecret)
    .update(payload)
    .digest('hex')}`;
};

async function request(baseUrl, route, method = 'GET', token, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  return { status: response.status, data };
}

async function waitUntilReady(child, url, output) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited (${child.exitCode}): ${output.join('').slice(-3000)}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(700) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Server did not become ready at ${url}: ${output.join('').slice(-3000)}`);
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function runBackend({ label, root, databaseUrl, port }) {
  const PrismaClient = require(path.join(root, 'node_modules/@prisma/client')).PrismaClient;
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const companyNames = [`UAT083 ${label} A`, `UAT083 ${label} B`];
  const emails = [
    `uat083-${label.toLowerCase()}-superadmin@keledon.invalid`,
    `uat083-${label.toLowerCase()}-coordinator@keledon.invalid`,
  ];
  const baseUrl = `http://127.0.0.1:${port}`;
  let assertions = 0;
  const clean = async () => {
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.company.deleteMany({ where: { name: { in: companyNames } } });
  };

  try {
    await clean();
    const companyA = await db.company.create({ data: { name: companyNames[0] } });
    const companyB = await db.company.create({ data: { name: companyNames[1] } });
    const superadmin = await db.user.create({
      data: { email: emails[0], role: 'superadmin' },
    });
    const coordinator = await db.user.create({
      data: { email: emails[1], role: 'coordinator', companyId: companyA.id },
    });
    const legacyFlow = await db.tenantFlowConfigDefinition.create({
      data: {
        name: `${label} unassigned legacy flow`,
        category: 'case',
        status: 'active',
      },
    });
    const superadminToken = sign(superadmin, 'user');
    const forgedCoordinatorToken = sign(coordinator, 'superadmin');

    let response = await request(baseUrl, '/api/flow-definitions');
    assert.equal(response.status, 401, 'anonymous flow reads are denied');
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/flow-definitions',
      'POST',
      superadminToken,
      {
        companyId: companyA.id,
        name: `${label} flow A`,
        category: 'case',
        status: 'active',
        intentTags: [],
      },
    );
    assert.equal(response.status, 201);
    const flowA = response.data;
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/flow-definitions',
      'POST',
      superadminToken,
      {
        companyId: companyB.id,
        name: `${label} flow B`,
        category: 'case',
        status: 'active',
        intentTags: [],
      },
    );
    assert.equal(response.status, 201);
    const flowB = response.data;
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-definitions/${flowB.id}`,
      'PUT',
      superadminToken,
      {
        companyId: companyB.id,
        name: `${label} flow B updated`,
        category: 'case',
        status: 'active',
        intentTags: ['support'],
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.name, `${label} flow B updated`);
    assertions += 1;

    response = await request(baseUrl, '/api/flow-definitions', 'GET', superadminToken);
    assert(response.data.some((flow) => flow.id === flowA.id));
    assert(response.data.some((flow) => flow.id === flowB.id));
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-definitions?companyId=${companyB.id}`,
      'GET',
      forgedCoordinatorToken,
    );
    assert(response.data.some((flow) => flow.id === flowA.id));
    assert(!response.data.some((flow) => flow.id === flowB.id));
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/flow-definitions',
      'POST',
      forgedCoordinatorToken,
      {
        companyId: companyB.id,
        name: `${label} coordinator scoped flow`,
        category: 'case',
        status: 'active',
        intentTags: [],
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.companyId, companyA.id);
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-definitions/${flowB.id}`,
      'PUT',
      forgedCoordinatorToken,
      {
        companyId: companyB.id,
        name: 'foreign update',
        category: 'case',
        status: 'active',
        intentTags: [],
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data, null);
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/flow-versions',
      'POST',
      superadminToken,
      {
        flowDefinitionId: flowB.id,
        version: 1,
        status: 'draft',
        steps: [{ type: 'browser', action: 'open' }],
      },
    );
    assert.equal(response.status, 201);
    const version = response.data;
    assert.equal(version.createdBy, superadmin.id);
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-versions/${version.id}`,
      'PUT',
      superadminToken,
      { status: 'approved' },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.status, 'approved');
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-versions/${version.id}`,
      'PUT',
      superadminToken,
      { steps: [{ type: 'browser', action: 'changed-after-approval' }] },
    );
    assert.equal(response.status, 400, 'approved flow versions are immutable');
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-versions?companyId=${companyB.id}`,
      'GET',
      superadminToken,
    );
    assert(response.data.some((item) => item.id === version.id));
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-versions?companyId=${companyB.id}`,
      'GET',
      forgedCoordinatorToken,
    );
    assert.equal(response.status, 200);
    assert(!response.data.some((item) => item.id === version.id));
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/tenant-flow-permissions',
      'POST',
      superadminToken,
      [{
        companyId: companyB.id,
        flowDefinitionId: flowB.id,
        isEnabled: true,
        defaultForIntent: 'support',
      }],
    );
    assert.equal(response.status, 201);
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/tenant-flow-permissions/${companyB.id}`,
      'GET',
      superadminToken,
    );
    assert(response.data.some((item) => item.flowDefinitionId === flowB.id && item.isEnabled));
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/tenant-flow-permissions',
      'POST',
      superadminToken,
      [{
        companyId: companyB.id,
        flowDefinitionId: flowB.id,
        isEnabled: false,
        defaultForIntent: 'support',
      }],
    );
    assert.equal(response.status, 201);
    response = await request(
      baseUrl,
      `/api/tenant-flow-permissions/${companyB.id}`,
      'GET',
      superadminToken,
    );
    assert(response.data.some((item) => item.flowDefinitionId === flowB.id && !item.isEnabled));
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/tenant-flow-permissions',
      'POST',
      forgedCoordinatorToken,
      [{ companyId: companyB.id, flowDefinitionId: flowB.id, isEnabled: true }],
    );
    assert.equal(response.status, 400);
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/intent-flow-mappings',
      'POST',
      superadminToken,
      {
        companyId: companyB.id,
        intent: 'support',
        allowedFlowDefinitionIds: [flowB.id],
      },
    );
    assert.equal(response.status, 201);
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/intent-flow-mappings/${companyB.id}`,
      'GET',
      superadminToken,
    );
    assert(response.data.some((item) => item.intent === 'support' && item.allowedFlowDefinitionIds.includes(flowB.id)));
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/intent-flow-mappings',
      'POST',
      superadminToken,
      {
        companyId: companyB.id,
        intent: 'support',
        allowedFlowDefinitionIds: [],
      },
    );
    assert.equal(response.status, 201);
    response = await request(
      baseUrl,
      `/api/intent-flow-mappings/${companyB.id}`,
      'GET',
      superadminToken,
    );
    assert.deepEqual(response.data.find((item) => item.intent === 'support').allowedFlowDefinitionIds, []);
    assertions += 1;

    response = await request(
      baseUrl,
      '/api/intent-flow-mappings',
      'POST',
      forgedCoordinatorToken,
      {
        companyId: companyB.id,
        intent: 'foreign',
        allowedFlowDefinitionIds: [flowB.id],
      },
    );
    assert.equal(response.status, 400);
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-definitions/${flowA.id}`,
      'DELETE',
      superadminToken,
    );
    assert.equal(response.status, 200);
    response = await request(baseUrl, '/api/flow-definitions', 'GET', superadminToken);
    assert.equal(response.data.find((flow) => flow.id === flowA.id).status, 'inactive');
    assertions += 1;

    response = await request(
      baseUrl,
      `/api/flow-definitions/${legacyFlow.id}`,
      'PUT',
      superadminToken,
      {
        companyId: companyA.id,
        name: `${label} legacy flow assigned`,
        category: 'case',
        status: 'active',
        intentTags: [],
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.companyId, companyA.id);
    response = await request(
      baseUrl,
      `/api/flow-definitions?companyId=${companyA.id}`,
      'GET',
      superadminToken,
    );
    assert(response.data.some((flow) => flow.id === legacyFlow.id));
    assertions += 1;

    const secondClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const persistedVersion = await secondClient.tenantFlowConfigVersion.findUnique({
      where: { id: version.id },
    });
    const persistedPermission = await secondClient.tenantFlowConfigPermission.findUnique({
      where: {
        companyId_flowDefinitionId: {
          companyId: companyB.id,
          flowDefinitionId: flowB.id,
        },
      },
    });
    const persistedMapping = await secondClient.tenantIntentFlowConfigMapping.findUnique({
      where: { companyId_intent: { companyId: companyB.id, intent: 'support' } },
    });
    await secondClient.$disconnect();
    assert.equal(persistedVersion.status, 'approved');
    assert.equal(persistedVersion.createdBy, superadmin.id);
    assert.equal(persistedPermission.isEnabled, false);
    assert.deepEqual(persistedMapping.allowedFlowDefinitionIds, []);
    assertions += 1;

    return { backend: label, result: 'PASS', assertions };
  } finally {
    await clean();
    await db.$disconnect();
  }
}

async function main() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'keledon-uat083-http-'));
  const children = [];
  const outputs = [];
  try {
    const apiPort = Number(process.env.KELEDON_UAT_API_PORT || 3041);
    const cloudPort = Number(process.env.KELEDON_UAT_CLOUD_PORT || 3042);
    const api = spawn(process.execPath, ['dist/main.js'], {
      cwd: apiRoot,
      env: baseEnvironment(apiDatabaseUrl, apiPort, path.join(dataRoot, 'api')),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(api);
    for (const stream of [api.stdout, api.stderr]) stream.on('data', (data) => outputs.push(data.toString()));
    await waitUntilReady(api, `http://127.0.0.1:${apiPort}/api/cloud-config`, outputs);

    const cloud = spawn(process.execPath, ['dist/main.js'], {
      cwd: cloudRoot,
      env: baseEnvironment(cloudDatabaseUrl, cloudPort, path.join(dataRoot, 'cloud')),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(cloud);
    for (const stream of [cloud.stdout, cloud.stderr]) stream.on('data', (data) => outputs.push(data.toString()));
    await waitUntilReady(cloud, `http://127.0.0.1:${cloudPort}/api/cloud-config`, outputs);

    const results = [
      await runBackend({ label: 'API', root: apiRoot, databaseUrl: apiDatabaseUrl, port: apiPort }),
      await runBackend({ label: 'Cloud', root: cloudRoot, databaseUrl: cloudDatabaseUrl, port: cloudPort }),
    ];
    console.log(JSON.stringify({ case: 'UAT-083', status: 'PASS', results, externalRequests: 'none; loopback services and disposable PostgreSQL only' }, null, 2));
  } finally {
    for (const child of children.reverse()) await stop(child);
    await fs.promises.rm(dataRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
