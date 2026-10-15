const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/rpa-executor.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const noop = () => {};
let scripts = 0;
let matched = false;
let currentUrl = 'https://configured.invalid/call';
const loadUrls = [];
let runtimeScope;
const scopesDuringNavigation = [];
const box = {
  exports: {},
  URL,
  setTimeout,
  clearTimeout,
  require: (name) => {
    if (name === 'electron-log') return { info: noop, warn: noop, error: noop };
    if (name === 'electron') return {};
    if (name === './rpa-provider') {
      return {
        findElement: async () => ({ found: true, method: 'synthetic' }),
        getAccessibilityTree: noop,
        setRpaProviderConfig: noop,
      };
    }
    if (name === './security-policy') {
      return {
        getRuntimeVendorNavigationScope: () => runtimeScope && [...runtimeScope],
        setRuntimeVendorNavigationScope: (_webContents, origins) => {
          runtimeScope = origins && [...origins];
        },
      };
    }
    throw new Error(name);
  },
};

vm.runInNewContext(compiled, box);
const rpa = box.exports;
const webContents = Object.assign(new EventEmitter(), {
  getURL: () => currentUrl,
  executeJavaScript: async () => {
    scripts += 1;
    return matched;
  },
  loadURL: async function loadURL(url) {
    loadUrls.push(url);
    scopesDuringNavigation.push(runtimeScope && [...runtimeScope]);
    currentUrl = url;
    this.emit('did-finish-load');
  },
});
rpa.setMainWindow({ getBrowserViews: () => [{ webContents }] });

(async () => {
  const origins = ['https://configured.invalid'];
  const flow = {
    allowed_origins: origins,
    steps: [
      { action: 'assert', selector: '#customer-id', value: 'expected-customer' },
      { action: 'click', selector: '#save-record' },
    ],
  };
  let result = await rpa.executeRpaFlow(flow);
  assert.equal(result.status, 'failed');
  assert.equal(result.steps.length, 1);
  assert.equal(scripts, 1, 'failed assertion must stop before save');

  matched = true;
  scripts = 0;
  result = await rpa.executeRpaFlow(flow);
  assert.equal(result.status, 'completed');
  assert.equal(result.steps.length, 2);

  matched = false;
  result = await rpa.executeRpaFlow({ ...flow, steps: [{ action: 'submit' }] });
  assert.equal(result.status, 'failed');
  result = await rpa.executeRpaFlow({
    ...flow,
    steps: [
      { action: 'navigate', url: 'file:///sensitive' },
      { action: 'click', selector: '#save' },
    ],
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.steps.length, 1);

  const scriptsBeforeUnscoped = scripts;
  const loadsBeforeUnscoped = loadUrls.length;
  result = await rpa.executeRpaFlow({
    steps: [{ action: 'navigate', url: 'http://169.254.169.254/latest/meta-data' }],
  });
  assert.equal(result.status, 'failed');
  assert.match(result.error, /origin scope/);
  assert.equal(loadUrls.length, loadsBeforeUnscoped, 'missing tenant scope must never call loadURL');
  assert.equal(scripts, scriptsBeforeUnscoped, 'missing tenant scope must prevent page actions');

  result = await rpa.executeRpaFlow({ allowed_origins: [], steps: [{ action: 'click', selector: '#save' }] });
  assert.equal(result.status, 'failed');
  assert.equal(scripts, scriptsBeforeUnscoped, 'empty tenant scope must prevent page actions');

  result = await rpa.executeRpaFlow({
    allowed_origins: origins,
    steps: [{ action: 'navigate', url: 'https://foreign.invalid' }],
  });
  assert.equal(result.status, 'failed');
  assert.equal(loadUrls.length, loadsBeforeUnscoped, 'unlisted origin must never call loadURL');

  const privateCrm = 'http://192.168.10.20:8080/login';
  result = await rpa.executeRpaFlow({
    allowed_origins: ['http://192.168.10.20:8080'],
    steps: [{ action: 'navigate', url: privateCrm }],
  });
  assert.equal(result.status, 'completed', `an explicitly configured private CRM origin remains usable: ${JSON.stringify(result)}`);
  assert.equal(loadUrls.at(-1), privateCrm);
  assert.deepEqual(scopesDuringNavigation.at(-1), ['http://192.168.10.20:8080']);
  assert.equal(runtimeScope, undefined, 'temporary navigation scope must be restored after the flow');

  currentUrl = 'https://configured.invalid/call';
  result = await rpa.executeRpaFlow({
    allowed_origins: origins,
    is_cancelled: () => true,
    steps: [{ action: 'click', selector: '#save' }],
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.steps[0].error, 'Flow cancelled after runtime disconnect');
  assert.equal(runtimeScope, undefined, 'runtime disconnect must restore the prior tab scope');

  console.log('PASS production RPA safety: required tenant scope, configured private origin, unscoped/unlisted navigation denied, fail-fast writes');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
