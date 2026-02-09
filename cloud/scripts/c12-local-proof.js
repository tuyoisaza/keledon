#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const net = require('net');
const path = require('path');
const { launchAndTriggerExtension } = require('./c12-extension-proof-runner');

const DEV_ONLY_FLAG = '--dev-only-bootstrap';
const BASE_PORT = Number(process.env.KELEDON_PROOF_PORT || 3001);
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'keledon_c12_proof';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const IS_WINDOWS = process.platform === 'win32';
const EXTENSION_WAIT_MS = Number(process.env.C12_EXTENSION_WAIT_MS || 180000);

let proofPort = BASE_PORT;

function fail(message) {
  console.error(`\n[C12-PROOF][FAIL] ${message}`);
  process.exit(1);
}

function runOrFail(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });

  if (result.error) {
    fail(`${command} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(`${command} exited with ${result.status}. ${detail}`);
  }

  return result.stdout || '';
}

function runNpmOrFail(args, options = {}) {
  if (IS_WINDOWS) {
    return runOrFail('cmd.exe', ['/c', 'npm', ...args], options);
  }

  return runOrFail('npm', args, options);
}

function spawnCloudProcess(options = {}) {
  if (IS_WINDOWS) {
    return spawn('cmd.exe', ['/c', 'npx', 'ts-node', 'src/main.ts'], options);
  }

  return spawn('npx', ['ts-node', 'src/main.ts'], options);
}

async function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null) {
    return true;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopCloudProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  if (await waitForExit(child, 1500)) {
    return;
  }

  if (IS_WINDOWS) {
    spawnSync('cmd.exe', ['/c', 'taskkill', '/PID', String(child.pid), '/T'], {
      stdio: 'ignore',
    });
    if (await waitForExit(child, 1500)) {
      return;
    }

    spawnSync('cmd.exe', ['/c', 'taskkill', '/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    await waitForExit(child, 1000);
  }
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

async function resolveProofPort() {
  for (let offset = 0; offset < 20; offset += 1) {
    const candidate = BASE_PORT + offset;
    if (await isPortAvailable(candidate)) {
      proofPort = candidate;
      return;
    }
  }

  fail(`No available proof port in range ${BASE_PORT}-${BASE_PORT + 19}.`);
}

function assertDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    fail('NODE_ENV=production blocked. C12 proof is DEV-ONLY.');
  }

  if (!process.argv.includes(DEV_ONLY_FLAG)) {
    fail(`Missing ${DEV_ONLY_FLAG}. DEV-ONLY bootstrap must be explicit.`);
  }
}

function assertContainers() {
  const output = runOrFail('docker', ['ps', '--format', '{{.Names}}']);
  const running = new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  const required = ['keledon-jaeger', 'keledon-postgres', 'keledon-qdrant-dev'];
  for (const name of required) {
    if (!running.has(name)) {
      fail(`Required container '${name}' is not running.`);
    }
  }
}

function bootstrapLocalPostgres() {
  const sql = [
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
    "CREATE TABLE IF NOT EXISTS sessions (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name varchar(255), status varchar(20) NOT NULL DEFAULT 'active', agent_id varchar(50), metadata jsonb, started_at timestamp, ended_at timestamp, last_activity_at timestamp, event_count integer NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), user_id uuid);",
    'CREATE TABLE IF NOT EXISTS events (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), type varchar(20) NOT NULL, payload jsonb NOT NULL, agent_id varchar(50), timestamp timestamp NOT NULL, processing_status varchar(20), processed_at timestamp, processing_result jsonb, created_at timestamp NOT NULL DEFAULT now(), session_id uuid NOT NULL);',
  ].join(' ');

  runOrFail('docker', [
    'exec',
    'keledon-postgres',
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ]);
}

function seedQdrant() {
  console.log('[C12-PROOF] Seeding deterministic Qdrant docs...');
  if (IS_WINDOWS) {
    runOrFail('cmd.exe', ['/c', 'node', 'scripts/c12-seed-qdrant.js'], { cwd: process.cwd() });
    return;
  }

  runOrFail('node', ['scripts/c12-seed-qdrant.js'], { cwd: process.cwd() });
}

async function waitForCloudReady(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Cloud startup timeout after 45s'));
    }, 45000);

    const onData = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
      if (text.includes(`KELEDON Cloud Backend running on port ${proofPort}`)) {
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Cloud process exited with ${code}.\n${output}`));
    });
  });
}

async function queryJaeger(operation) {
  const url = `http://localhost:16686/api/traces?service=keledon-cloud&operation=${encodeURIComponent(operation)}&limit=50`;
  const response = await fetch(url);
  if (!response.ok) {
    fail(`Jaeger query failed for ${operation}: HTTP ${response.status}`);
  }

  return { url, json: await response.json() };
}

function flattenSpans(jaegerJson) {
  return (jaegerJson?.data || []).flatMap((traceData) => traceData.spans || []);
}

function operationSpans(jaegerJson, operation) {
  return flattenSpans(jaegerJson).filter((span) => span?.operationName === operation);
}

function tagsAsMap(span) {
  return Object.fromEntries((span?.tags || []).map((tag) => [tag.key, tag.value]));
}

function findSpanByDecision(spans, decisionId, keys) {
  return spans.find((span) => {
    const tags = tagsAsMap(span);
    return keys.some((key) => String(tags[key] || '').includes(decisionId));
  });
}

async function waitForRealExtensionEvidence(startMicros) {
  const deadline = Date.now() + EXTENSION_WAIT_MS;

  while (Date.now() < deadline) {
    const result = await queryJaeger('keledon.agent.exec');
    const spans = operationSpans(result.json, 'keledon.agent.exec');
    const candidate = spans
      .filter((span) => Number(span?.startTime || 0) >= startMicros)
      .map((span) => ({ span, tags: tagsAsMap(span) }))
      .find(
        ({ tags }) =>
          String(tags['agent.exec.event']) === 'agent.exec.end' &&
          String(tags['execution_status']) === 'success' &&
          String(tags['decision.id'] || '').length > 10,
      );

    if (candidate) {
      return {
        result,
        session_id: String(candidate.tags.session_id || 'unknown'),
        decision_id: String(candidate.tags['decision.id']),
        trace_id: String(candidate.tags.trace_id),
        command_type: String(candidate.tags.command_type || 'unknown'),
        tab_id: String(candidate.tags.tab_id || 'unknown'),
        execution_status: String(candidate.tags.execution_status || 'unknown'),
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  fail('Timed out waiting for real extension execution evidence (keledon.agent.exec).');
}

async function queryJaegerUntilDecision(operation, decisionId, keys, attempts = 25, delayMs = 2000) {
  let latest = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    latest = await queryJaeger(operation);
    const spans = operationSpans(latest.json, operation);
    if (findSpanByDecision(spans, decisionId, keys)) {
      return latest;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return latest;
}

function assertEvidence(evidence, results) {
  const requiredOps = [
    'keledon.vector.retrieve',
    'keledon.policy.check',
    'keledon.decide',
    'keledon.command.emit',
    'keledon.agent.exec',
  ];

  for (const operation of requiredOps) {
    if (!results[operation] || !(results[operation].json?.data || []).length) {
      fail(`Missing Jaeger traces for ${operation}`);
    }
  }

  const vectorSpan = findSpanByDecision(
    operationSpans(results['keledon.vector.retrieve'].json, 'keledon.vector.retrieve'),
    evidence.decision_id,
    ['decision.id'],
  );
  const policySpan = findSpanByDecision(
    operationSpans(results['keledon.policy.check'].json, 'keledon.policy.check'),
    evidence.decision_id,
    ['policy.decision_id'],
  );
  const decideSpan = findSpanByDecision(
    operationSpans(results['keledon.decide'].json, 'keledon.decide'),
    evidence.decision_id,
    ['decision.id'],
  );
  const commandSpan = findSpanByDecision(
    operationSpans(results['keledon.command.emit'].json, 'keledon.command.emit'),
    evidence.decision_id,
    ['decision.id'],
  );
  const agentExecSpan = findSpanByDecision(
    operationSpans(results['keledon.agent.exec'].json, 'keledon.agent.exec'),
    evidence.decision_id,
    ['decision.id'],
  );

  if (!vectorSpan || !policySpan || !decideSpan || !commandSpan || !agentExecSpan) {
    fail('Could not correlate required spans by decision.id.');
  }

  const vectorTags = tagsAsMap(vectorSpan);
  const vectorDocIds = String(vectorTags['vector.doc_ids'] || '');
  if (!vectorDocIds.includes('doc-1') || !vectorDocIds.includes('doc-2') || !vectorDocIds.includes('doc-3')) {
    fail('Vector span missing deterministic doc_ids evidence (doc-1,doc-2,doc-3).');
  }

  const traceIds = new Set([
    String(vectorSpan.traceID || ''),
    String(policySpan.traceID || ''),
    String(decideSpan.traceID || ''),
    String(commandSpan.traceID || ''),
    String(agentExecSpan.traceID || ''),
    String(evidence.trace_id || ''),
  ]);
  traceIds.delete('');
  if (traceIds.size !== 1) {
    fail('Trace correlation failed: required operations do not share one trace_id.');
  }
}

async function main() {
  assertDevOnly();
  await resolveProofPort();
  assertContainers();

  console.log('[C12-PROOF] DEV-ONLY bootstrap: ensuring local DB tables exist...');
  bootstrapLocalPostgres();
  seedQdrant();

  console.log('[C12-PROOF] Building cloud service...');
  runNpmOrFail(['run', 'build'], { cwd: process.cwd() });

  console.log('[C12-PROOF] Building agent extension...');
  runNpmOrFail(['run', 'build'], { cwd: `${process.cwd()}\\..\\agent` });

  const cloudProcess = spawnCloudProcess({
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(proofPort),
      QDRANT_URL,
      QDRANT_COLLECTION,
      KELEDON_REQUIRE_QDRANT: 'true',
      QDRANT_USE_REAL: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let extensionRuntime = null;

  try {
    await waitForCloudReady(cloudProcess);
    const startMicros = Date.now() * 1000;
    const backendUrl = `http://localhost:${proofPort}`;
    const extensionDistPath = path.resolve(process.cwd(), '..', 'agent', 'dist');

    console.log(`[C12-PROOF] Launching Chromium + real extension runtime on ${backendUrl}`);
    extensionRuntime = await launchAndTriggerExtension({
      backendUrl,
      extensionDistPath,
      timeoutMs: 45000,
    });

    console.log(`[C12-PROOF] extension_id=${extensionRuntime.extensionId}`);
    console.log(`[C12-PROOF] extension_page=${extensionRuntime.extensionPageUrl}`);
    console.log(`[C12-PROOF] extension_backend_url=${extensionRuntime.runtimeCloudUrl || backendUrl}`);
    console.log(`[C12-PROOF] extension_session_id=${extensionRuntime.sessionId || 'pending'}`);
    console.log(`[C12-PROOF] waiting up to ${Math.floor(EXTENSION_WAIT_MS / 1000)}s for keledon.agent.exec...`);

    const extensionEvidence = await waitForRealExtensionEvidence(startMicros);

    const results = {};
    results['keledon.vector.retrieve'] = await queryJaegerUntilDecision(
      'keledon.vector.retrieve',
      extensionEvidence.decision_id,
      ['decision.id'],
    );
    results['keledon.policy.check'] = await queryJaegerUntilDecision(
      'keledon.policy.check',
      extensionEvidence.decision_id,
      ['policy.decision_id'],
    );
    results['keledon.decide'] = await queryJaegerUntilDecision(
      'keledon.decide',
      extensionEvidence.decision_id,
      ['decision.id'],
    );
    results['keledon.command.emit'] = await queryJaegerUntilDecision(
      'keledon.command.emit',
      extensionEvidence.decision_id,
      ['decision.id'],
    );
    results['keledon.agent.exec'] = extensionEvidence.result;

    assertEvidence(extensionEvidence, results);

    console.log('\n[C12-PROOF][SUCCESS] Real extension runtime proof automation completed.');
    console.log(`[C12-PROOF] session_id=${extensionEvidence.session_id}`);
    console.log(`[C12-PROOF] decision_id=${extensionEvidence.decision_id}`);
    console.log(`[C12-PROOF] trace_id=${extensionEvidence.trace_id}`);
    console.log(`[C12-PROOF] qdrant_collection=${QDRANT_COLLECTION}`);
    console.log('[C12-PROOF] qdrant_doc_ids=doc-1,doc-2,doc-3');
    console.log('[C12-PROOF] validated_ops=keledon.vector.retrieve,keledon.policy.check,keledon.decide,keledon.command.emit,keledon.agent.exec');
    console.log(`[C12-PROOF] jaeger_query=${results['keledon.command.emit'].url}`);
    console.log(
      `[C12-PROOF] extension_execution_log=event:agent.exec.end command_type:${extensionEvidence.command_type} tab_id:${extensionEvidence.tab_id} execution_status:${extensionEvidence.execution_status}`,
    );
  } catch (error) {
    fail(error.message || String(error));
  } finally {
    if (extensionRuntime) {
      try {
        await extensionRuntime.close();
      } catch (_error) {
        // noop
      }
      extensionRuntime.cleanup();
    }
    await stopCloudProcess(cloudProcess);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => fail(error.message || String(error)));
