const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadGoalPlanner() {
  const sourcePath = path.join(__dirname, '..', 'src', 'goal-planner.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const sandbox = { exports: {}, module: { exports: {} }, require, console };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(compiled, sandbox, { filename: sourcePath });
  return sandbox.module.exports;
}

const { planGoalActions } = loadGoalPlanner();

function actionSummary(actions) {
  return actions.map((action) => `${action.type}:${action.description}`);
}

const plannedGoal = planGoalActions(
  'Go to example.com then click Sign in then enter tuyo@example.com into email then click Next then enter hunter2 into password then click Submit',
  {},
);

assert.ok(plannedGoal.length >= 7, `expected a real multi-step plan, got ${plannedGoal.length}: ${actionSummary(plannedGoal).join(' | ')}`);
assert.equal(plannedGoal[0].type, 'navigate');
assert.ok(plannedGoal.some((action) => action.type === 'fill' && action.value === 'tuyo@example.com' && /email/i.test(action.description)), actionSummary(plannedGoal).join(' | '));
assert.ok(plannedGoal.some((action) => action.type === 'fill' && action.value === 'hunter2' && /password/i.test(action.description)), actionSummary(plannedGoal).join(' | '));
assert.ok(plannedGoal.filter((action) => action.type === 'click').length >= 3, actionSummary(plannedGoal).join(' | '));
assert.equal(plannedGoal.at(-1).type, 'screenshot');

const objectiveInputs = planGoalActions('Login to Google Meet', { url: 'https://meet.google.com', username: 'tuyo@example.com', password: 'hunter2' });
assert.ok(objectiveInputs.length > 4, `expected Google login to become multiple steps, got ${objectiveInputs.length}`);
assert.equal(JSON.stringify(objectiveInputs.map((action) => action.type).slice(0, 6)), JSON.stringify(['navigate', 'fill', 'click', 'wait', 'fill', 'click']));

// Safety regression: passwords must never appear in logs/progress descriptions.
for (const action of objectiveInputs) {
  assert.ok(!String(action.description).includes('hunter2'), `secret leaked in description: ${action.description}`);
}
assert.ok(objectiveInputs.some((action) => /password/i.test(action.description) && /REDACTED|redacted/i.test(action.description)), actionSummary(objectiveInputs).join(' | '));

// Safety regression: click fallbacks should not devolve to the first generic button/link.
const clickNext = plannedGoal.find((action) => action.type === 'click' && /Next/i.test(action.description));
assert.ok(clickNext, actionSummary(plannedGoal).join(' | '));
assert.ok(!/(^|,\s*)(button|a|\[role="button"\]|\[role="link"\])($|,)/.test(clickNext.selector || ''), clickNext.selector || '');

// Logic regression: explicit login scripts should not get an extra generic login submit after Submit.
assert.equal(plannedGoal.filter((action) => /submit\/login/i.test(action.description)).length, 0, actionSummary(plannedGoal).join(' | '));

// Behavior regression: standalone search should navigate to a known search page before typing.
const searchGoal = planGoalActions('search for safe browser automation', {});
assert.equal(searchGoal[0].type, 'navigate', actionSummary(searchGoal).join(' | '));
assert.ok(searchGoal[0].url.includes('google.com'), searchGoal[0].url);
assert.ok(searchGoal.some((action) => action.type === 'fill' && /safe browser automation/i.test(action.value || '')), actionSummary(searchGoal).join(' | '));

// Behavior regression: extract/scrape goals should still map to extract actions.
const extractGoal = planGoalActions('go to example.com then extract page content', {});
assert.ok(extractGoal.some((action) => action.type === 'extract'), actionSummary(extractGoal).join(' | '));

console.log('goal-planner tests passed');
