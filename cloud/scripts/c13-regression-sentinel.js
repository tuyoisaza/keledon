#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`[C13-SENTINEL][FAIL] ${message}`);
  process.exit(1);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Required file missing: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    fail(`${label} missing required marker: ${needle}`);
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');

  const cloudContractsPath = path.join(repoRoot, 'cloud', 'src', 'contracts', 'events.ts');
  const sharedContractsPath = path.join(repoRoot, 'contracts', 'events.ts');
  const execSchemaPath = path.join(repoRoot, 'contracts', 'v1', 'agent', 'exec.schema.json');
  const c12ProofPath = path.join(repoRoot, 'cloud', 'scripts', 'c12-local-proof.js');

  const cloudContracts = read(cloudContractsPath);
  const sharedContracts = read(sharedContractsPath);
  const execSchemaRaw = read(execSchemaPath);
  const c12Proof = read(c12ProofPath);

  assertIncludes(cloudContracts, 'export interface AgentExecResultAck', 'cloud contracts');
  assertIncludes(cloudContracts, 'decision_id: string;', 'cloud contracts');
  assertIncludes(cloudContracts, 'trace_id: string;', 'cloud contracts');
  assertIncludes(cloudContracts, 'execution_status: \'success\' | \'failure\' | \'blocked\';', 'cloud contracts');

  assertIncludes(sharedContracts, 'export interface AgentExecResultAckEvent', 'shared contracts');
  assertIncludes(sharedContracts, 'decision_id: string;', 'shared contracts');
  assertIncludes(sharedContracts, 'trace_id: string;', 'shared contracts');

  let execSchema;
  try {
    execSchema = JSON.parse(execSchemaRaw);
  } catch (error) {
    fail(`exec schema JSON parse failed: ${error.message}`);
  }

  const requiredFields = new Set(execSchema.required || []);
  for (const field of ['decision_id', 'trace_id', 'execution_status']) {
    if (!requiredFields.has(field)) {
      fail(`exec schema missing required field: ${field}`);
    }
  }

  assertIncludes(c12Proof, 'vector.doc_ids', 'c12 proof');
  assertIncludes(c12Proof, 'doc-1', 'c12 proof');
  assertIncludes(c12Proof, 'doc-2', 'c12 proof');
  assertIncludes(c12Proof, 'doc-3', 'c12 proof');

  console.log('[C13-SENTINEL][PASS] Regression invariants intact.');
}

main();
