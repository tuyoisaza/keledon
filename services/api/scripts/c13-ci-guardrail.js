#!/usr/bin/env node

const { spawn } = require('child_process');

const DEV_ONLY_FLAG = '--dev-only-bootstrap';
const REQUIRED_MARKERS = [
  '[C12-PROOF] session_id=',
  '[C12-PROOF] decision_id=',
  '[C12-PROOF] trace_id=',
  'keledon.vector.retrieve',
  'keledon.command.emit',
  'keledon.agent.exec',
];

function fail(message) {
  console.error(`[C13-CI-GUARDRAIL][FAIL] ${message}`);
  process.exit(1);
}

function assertDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    fail('NODE_ENV=production blocked. C13 CI guardrail is DEV-ONLY.');
  }

  if (!process.argv.includes(DEV_ONLY_FLAG)) {
    fail(`Missing ${DEV_ONLY_FLAG}. DEV-ONLY bootstrap must be explicit.`);
  }
}

async function main() {
  assertDevOnly();

  if (process.env.KELEDON_C12_CI_GUARDRAIL !== '1') {
    console.log('[C13-CI-GUARDRAIL] Skipped (set KELEDON_C12_CI_GUARDRAIL=1 to enforce).');
    process.exit(0);
  }

  const npmCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const npmArgs = process.platform === 'win32' ? ['/c', 'npm', 'run', 'proof:c12:local'] : ['run', 'proof:c12:local'];

  const outputChunks = [];
  const child = spawn(npmCommand, npmArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    outputChunks.push(text);
    process.stdout.write(text);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    outputChunks.push(text);
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolve) => {
    child.on('exit', resolve);
  });

  if (exitCode !== 0) {
    fail(`proof:c12:local exited with code ${exitCode}`);
  }

  const output = outputChunks.join('');
  for (const marker of REQUIRED_MARKERS) {
    if (!output.includes(marker)) {
      fail(`Required proof output marker missing: ${marker}`);
    }
  }

  console.log('[C13-CI-GUARDRAIL][PASS] C12 proof markers validated.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
