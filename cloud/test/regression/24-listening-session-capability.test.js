const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadService() {
  const module = { exports: {} };
  const logs = [];
  const code = ts.transpileModule(
    fs.readFileSync(
      path.resolve(__dirname, '../../src/listening-sessions/listening-session.service.ts'),
      'utf8',
    ),
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
    Date,
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    require: (name) =>
      name === '@nestjs/common'
        ? { Injectable: () => () => undefined }
        : name === 'uuid'
          ? { v4: () => '8f19ae82-d985-47df-a332-022715331391' }
          : require(name),
  });
  return { ListeningSessionService: module.exports.ListeningSessionService, logs };
}

function loadGateway(logs) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(
      path.resolve(__dirname, '../../src/listening-sessions/listening.gateway.ts'),
      'utf8',
    ),
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
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    require: (name) =>
      name === '@nestjs/websockets'
        ? new Proxy({}, { get: () => (..._args) => () => undefined })
        : name === 'socket.io'
          ? {}
          : require(name),
  });
  return module.exports.ListeningSessionGateway;
}

function loadRuntimeActorGuard() {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(
      path.resolve(__dirname, '../../src/gateways/runtime-identity.ts'),
      'utf8',
    ),
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
    require: (name) => {
      if (name === '@nestjs/common')
        return new Proxy({ UnauthorizedException: class Unauthorized extends Error {} }, {
          get: (target, key) => target[key] || (() => () => undefined),
        });
      if (name === '../auth-local/auth-local.service')
        return {
          LocalAuthService: class {
            async validateToken(token) {
              if (token === 'unassigned')
                return { id: 'actor-1', company_id: null, team_id: null, role: 'user' };
              if (token === 'assigned')
                return { id: 'actor-1', company_id: 'co-a', team_id: 'team-a', role: 'user', email: 'a@example.test' };
              return null;
            }
          },
        };
      return {};
    },
  });
  return module.exports.RuntimeActorGuard;
}

async function main() {
  const { ListeningSessionService, logs } = loadService();
  const service = new ListeningSessionService();
  const session = await service.createSession({ source: 'regression' });
  assert.equal(session.sessionId, 'ls_8f19ae82-d985-47df-a332-022715331391');
  assert.ok(session.sessionId.length >= 35, 'capability must not be practically guessable');
  assert.equal(service.validateSession(session.sessionId), true);
  assert.ok(!logs.join('\n').includes(session.sessionId), 'capability must not appear in logs');

  service.getSession(session.sessionId).expiresAt = new Date(0).toISOString();
  assert.equal(service.validateSession(session.sessionId), false);
  assert.equal(service.getSession(session.sessionId), undefined);

  const ListeningSessionGateway = loadGateway(logs);
  const gateway = new ListeningSessionGateway(service);
  let workerStarts = 0;
  gateway.startWorker = () => { workerStarts += 1; };
  const invalidClient = {
    id: 'invalid-client',
    handshake: { query: { session: session.sessionId } },
    emit: () => undefined,
    disconnect: () => { invalidClient.disconnected = true; },
  };
  gateway.handleConnection(invalidClient);
  assert.equal(invalidClient.disconnected, true, 'expired websocket capabilities must be rejected');
  assert.equal(workerStarts, 0, 'expired capabilities must not start an audio worker');

  const active = await service.createSession({ source: 'gateway-regression' });
  const activeClient = {
    id: 'active-client',
    handshake: { query: { session: active.sessionId } },
    emit: () => undefined,
    disconnect: () => { activeClient.disconnected = true; },
  };
  gateway.handleConnection(activeClient);
  assert.equal(workerStarts, 1, 'a valid capability should start the assigned audio worker');
  assert.ok(!logs.join('\n').includes(active.sessionId), 'websocket logs must not disclose capabilities');

  const controller = fs.readFileSync(
    path.resolve(__dirname, '../../src/listening-sessions/listening-session.controller.ts'),
    'utf8',
  );
  assert.match(controller, /@UseGuards\(RuntimeActorGuard\)/);

  const RuntimeActorGuard = loadRuntimeActorGuard();
  const guard = new RuntimeActorGuard({
    device: { findFirst: async () => null },
    team: {
      findUnique: async () => ({
        id: 'team-a',
        brand: { id: 'brand-a', companyId: 'co-a', company: { name: 'Co A' } },
      }),
    },
  });
  const guardResult = (authorization) => {
    const request = { headers: authorization ? { authorization } : {} };
    return {
      request,
      result: guard.canActivate({ switchToHttp: () => ({ getRequest: () => request }) }),
    };
  };
  await assert.rejects(guardResult(undefined).result, /Authentication required/);
  await assert.rejects(guardResult('Bearer unassigned').result, /Assigned user required/);
  const assigned = guardResult('Bearer assigned');
  assert.equal(await assigned.result, true);
  assert.equal(assigned.request.runtimeIdentity.userId, 'actor-1');
  assert.equal(assigned.request.runtimeIdentity.teamId, 'team-a');
  assert.equal(assigned.request.runtimeIdentity.companyId, 'co-a');
  console.log('PASS listening-session capability: assigned runtime identity required, full UUID bearer token, expiry enforced, stale sockets denied before worker start, and IDs redacted from logs.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
