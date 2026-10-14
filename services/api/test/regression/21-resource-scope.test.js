const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
class Denied extends Error {}
const decorator = () => () => {};
function load(file, adapters = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        experimentalDecorators: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process,
    Buffer,
    Date,
    console,
    require: (name) =>
      name === '@nestjs/common'
        ? new Proxy(
            { ForbiddenException: Denied },
            { get: (obj, key) => obj[key] || decorator },
          )
        : name === 'crypto'
          ? require('crypto')
          : adapters[name] || {},
  });
  return module.exports;
}
const { ResourceScopeGuard } = load('guards/resource-scope.guard.ts');
const { DeviceAccessGuard } = load('guards/device-access.guard.ts', {
  '../gateways/runtime-identity': { resolveRuntimeIdentity: async () => null },
});
const { DeviceService } = load('devices/device.service.ts');
async function main() {
  let actor = { id: 'u-a', companyId: 'co-a', teamId: 'team-a', role: 'admin' };
  let pairs = 0,
    pairedData;
  const prisma = {
    user: { findUnique: async () => actor },
    team: {
      findFirst: async ({ where }) =>
        where.id === 'team-a' && where.brand.companyId === 'co-a'
          ? { id: 'team-a' }
          : null,
    },
    flow: {
      findUnique: async ({ where }) => ({
        id: where.id,
        teamId: where.id === 'flow-a' ? 'team-a' : 'team-b',
      }),
    },
    flowStep: {
      findUnique: async ({ where }) => ({
        flowId: where.id === 'step-a' ? 'flow-a' : 'flow-b',
      }),
    },
    flowRun: { findUnique: async () => ({ sessionId: 'session-b' }) },
    session: {
      findUnique: async ({ where }) => ({
        userId: where.id === 'session-a' ? 'u-a' : 'u-b',
        teamId: where.id === 'session-a' ? 'team-a' : 'team-b',
      }),
    },
    knowledgeBase: {
      findUnique: async ({ where }) => ({
        companyId: where.id === 'kb-a' ? 'co-a' : 'co-b',
      }),
    },
    device: {
      findUnique: async ({ where }) => ({
        id: where.id,
        userId: where.id === 'device-a' ? 'u-a' : 'u-b',
        organizationId: where.id === 'device-a' ? 'co-a' : 'co-b',
        keledonId: 'k-a',
      }),
      findFirst: async () => ({
        id: 'pending',
        userId: 'stored-owner',
        organizationId: 'co-a',
        keledonId: 'stored-k',
        status: 'pending',
      }),
      update: async ({ data }) => {
        pairs++;
        pairedData = data;
        return { id: 'pending', ...data };
      },
    },
    keledon: {
      findUnique: async ({ where }) => ({
        id: where.id,
        userId: 'stored-owner',
        team: { brand: { companyId: where.id === 'k-a' ? 'co-a' : 'co-b' } },
      }),
    },
    vendor: { findMany: async () => [] },
  };
  const run = (
    guard,
    kind,
    handler,
    params = {},
    body = {},
    query = {},
    method = 'GET',
  ) => {
    const req = {
      method,
      params,
      body,
      query,
      headers: {},
      user: { userId: 'u-a', role: 'superadmin' },
    };
    const context = {
      getClass: () => ({ name: kind }),
      getHandler: () => ({ name: handler }),
      switchToHttp: () => ({ getRequest: () => req }),
    };
    return { req, result: guard.canActivate(context) };
  };
  const scope = new ResourceScopeGuard(prisma);
  // Legacy MVP configuration endpoints have no complete company-scoped contract
  // yet. Keep them unavailable to tenant actors while preserving the three safe
  // read-only catalogs/status handlers and the explicitly public cloud endpoint.
  const tenantMvpHandlers = [
    'getTTSConfig',
    'updateTTSConfig',
    'getInterfaces',
    'createInterface',
    'updateInterface',
    'deleteInterface',
    'getFlowDefinitions',
    'createFlowDefinition',
    'getFlowVersions',
    'createFlowVersion',
    'updateFlowVersion',
    'getTenantFlowPermissions',
    'upsertTenantFlowPermissions',
    'getIntentFlowMappings',
    'upsertIntentFlowMapping',
    'getKnowledgeDocuments',
    'createKnowledgeDocument',
  ];
  for (const role of ['guest', 'user', 'agent', 'admin', 'coordinator']) {
    actor = { id: 'u-a', companyId: 'co-a', teamId: 'team-a', role };
    for (const handler of tenantMvpHandlers) {
      await assert.rejects(
        run(scope, 'MvpDataController', handler, {}, {}, {}, 'GET').result,
        Denied,
        `${role} must not access unscoped MVP handler ${handler}`,
      );
    }
    for (const handler of [
      'getTechStatus',
      'getProviderCatalog',
      'getRpaProviders',
    ]) {
      const result = run(scope, 'MvpDataController', handler).result;
      if (['admin', 'coordinator'].includes(role)) await result;
      else await assert.rejects(result, Denied);
    }
  }
  actor = null;
  await run(scope, 'MvpDataController', 'getCloudConfig').result;
  actor = { id: 'root', companyId: null, teamId: null, role: 'superadmin' };
  for (const handler of tenantMvpHandlers)
    await run(scope, 'MvpDataController', handler).result;

  actor = { id: 'u-a', companyId: 'co-a', teamId: 'team-a', role: 'admin' };
  for (const [kind, handler, params, body] of [
    ['FlowController', 'findOne', { id: 'flow-b' }, {}],
    ['FlowController', 'updateStep', { stepId: 'step-b' }, {}],
    [
      'FlowController',
      'reorderSteps',
      { id: 'flow-a' },
      { stepIds: ['step-a', 'step-b'] },
    ],
    [
      'FlowController',
      'updateStep',
      { stepId: 'step-a' },
      { nextStepId: 'step-b' },
    ],
    ['KnowledgeController', 'getKnowledgeBaseStats', { id: 'kb-b' }, {}],
    [
      'KnowledgeController',
      'searchKnowledge',
      {},
      { knowledgeBaseId: 'kb-b', companyId: 'co-b' },
    ],
    ['SubAgentController', 'getSessionAgents', { sessionId: 'session-b' }, {}],
    [
      'SubAgentController',
      'executeFlow',
      {},
      { sessionId: 'session-a', flowId: 'flow-b' },
    ],
    ['SubAgentController', 'getFlowRunStatus', { runId: 'run-b' }, {}],
    ['CallsController', 'getCall', { sessionId: 'session-b' }, {}],
    ['CallsController', 'createCall', {}, { deviceId: 'device-b' }],
    ['VectorStoreController', 'listDocuments', {}, {}],
    ['VectorStoreController', 'deleteDocument', { id: 'foreign-point' }, {}],
  ])
    await assert.rejects(
      run(scope, kind, handler, params, body).result,
      Denied,
    );
  const vector = run(
    scope,
    'VectorStoreController',
    'search',
    {},
    { company_id: 'co-b', team_id: 'team-b' },
    {},
    'POST',
  );
  await vector.result;
  assert.equal(vector.req.body.company_id, 'co-a');
  assert.equal(vector.req.body.team_id, 'team-a');
  await assert.rejects(
    run(
      scope,
      'VectorStoreController',
      'addDocument',
      {},
      { id: 'foreign-point', content: 'overwrite attempt' },
      {},
      'POST',
    ).result,
    Denied,
    'tenant managers must not supply a Qdrant upsert ID',
  );
  const vectorCreate = run(
    scope,
    'VectorStoreController',
    'addDocument',
    {},
    { content: 'new scoped document' },
    {},
    'POST',
  );
  await vectorCreate.result;
  assert.equal(vectorCreate.req.body.company_id, 'co-a');
  assert.equal(vectorCreate.req.body.team_id, 'team-a');
  const knowledge = run(
    scope,
    'KnowledgeController',
    'searchKnowledge',
    {},
    { companyId: 'co-b' },
    { companyId: 'co-b' },
    'POST',
  );
  await knowledge.result;
  assert.equal(knowledge.req.body.companyId, 'co-a');
  assert.equal(knowledge.req.query.companyId, 'co-a');
  const flowList = run(scope, 'FlowController', 'findAll');
  await flowList.result;
  assert.equal(flowList.req.query.teamId, 'team-a');
  const calls = run(
    scope,
    'CallsController',
    'createCall',
    {},
    {
      deviceId: 'device-a',
      userId: 'forged',
      teamId: 'team-b',
      keledonId: 'k-b',
    },
    {},
    'POST',
  );
  await calls.result;
  assert.equal(calls.req.body.userId, 'u-a');
  assert.equal(calls.req.body.teamId, 'team-a');
  assert.equal(calls.req.body.keledonId, 'k-a');
  actor = { ...actor, role: 'user' };
  await assert.rejects(
    run(scope, 'FlowController', 'create', {}, { teamId: 'team-a' }, {}, 'POST')
      .result,
    Denied,
  );
  await assert.rejects(
    run(scope, 'KnowledgeController', 'createKnowledgeBase', {}, {}, {}, 'POST')
      .result,
    Denied,
  );
  const devices = new DeviceAccessGuard(prisma);
  await assert.rejects(
    run(
      devices,
      'DeviceController',
      'revokeDevice',
      { id: 'device-b' },
      {},
      {},
      'DELETE',
    ).result,
    Denied,
  );
  await assert.rejects(
    run(
      devices,
      'DeviceController',
      'createPairingCode',
      {},
      { keledon_id: 'k-a' },
      {},
      'POST',
    ).result,
    Denied,
  );
  actor = { ...actor, role: 'admin' };
  await assert.rejects(
    run(
      devices,
      'DeviceController',
      'createPairingCode',
      {},
      { keledon_id: 'k-b' },
      {},
      'POST',
    ).result,
    Denied,
  );
  await assert.rejects(
    run(
      devices,
      'DeviceController',
      'updateDeviceRpaConfig',
      { id: 'device-b' },
      {},
      {},
      'PUT',
    ).result,
    Denied,
  );
  const binding = run(
    devices,
    'DeviceController',
    'createPairingCode',
    {},
    { keledon_id: 'k-a', userId: 'forged', organizationId: 'co-b' },
    {},
    'POST',
  );
  await binding.result;
  assert.equal(binding.req.deviceBinding.userId, 'stored-owner');
  assert.equal(binding.req.deviceBinding.companyId, 'co-a');
  const service = new DeviceService(prisma);
  await service.pairDevice({
    pairing_code: 'proof',
    userId: 'forged',
    organizationId: 'co-b',
    keledonId: 'k-b',
  });
  assert.equal(pairs, 1);
  assert.equal(pairedData.userId, 'stored-owner');
  assert.equal(pairedData.organizationId, 'co-a');
  assert.equal(pairedData.keledonId, 'stored-k');
  assert.match(pairedData.authToken, /^keledon_[a-f0-9]{64}$/);
  actor = null;
  await assert.rejects(run(scope, 'FlowController', 'findAll').result, Denied);
  await assert.rejects(
    run(devices, 'DeviceController', 'getDevices').result,
    Denied,
  );
  console.log(
    'PASS secondary resource scopes: cross-tenant flow/step/reorder/knowledge/session/call/device denials; trusted filters and pairing bindings; low-role mutations; removed actors; cryptographic device token.',
  );
  console.log(
    'PASS MVP data policy: ordinary roles are denied on management catalogs; admin/coordinator are limited to management reads; unscoped configuration/mutations remain denied; public cloud config and superadmin access remain available.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
