/**
 * v0.2.28: Regression test runner — executes all regression tests.
 *
 * Usage: node test/regression/run.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = __dirname;
const testFiles = fs
  .readdirSync(testDir)
  .filter((f) => f.endsWith('.test.js') && f !== 'run.js')
  .sort();

// Keep the managed AI administration contract in the mandatory regression
// gate; it lives beside the runner because it exercises the service directly.
testFiles.push('../ai-admin-contract.test.cjs');

let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  const fullPath = path.join(testDir, file);
  console.log(`\n🧪 Running ${file}...`);
  try {
    execSync(`node "${fullPath}"`, { stdio: 'inherit', cwd: path.resolve(testDir, '../..') });
    totalPassed += 1; // suite passed (individual counts printed by each file)
  } catch {
    totalFailed += 1;
  }
}

console.log(`\n══════════════════════════════════════════════`);
console.log(`📊 Total suites: ${testFiles.length} | Passed: ${totalPassed} | Failed: ${totalFailed}`);
console.log(`══════════════════════════════════════════════`);

if (totalFailed > 0) process.exit(1);
