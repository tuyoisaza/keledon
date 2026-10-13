const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

const componentPath = path.join(__dirname, '../src/components/common/VersionActions.tsx');
const root = path.resolve(__dirname, '../../..');

async function compileComponent() {
  const aliases = {
    '@/context/I18nContext': `export const useTranslation = () => ({ t: key => ({ 'diagnostics.copy': 'Copy complete diagnostics', 'diagnostics.clear': 'Clear application cache', 'diagnostics.copied': 'Diagnostics copied', 'diagnostics.copyFailed': 'Copy failed', 'diagnostics.cleared': 'Application data cleared', 'diagnostics.clearFailed': 'Clear failed' }[key] || key) });`,
    '@/context/AuthContext': `export const useAuth = () => globalThis.__diagnosticAuth;`,
    'react-router-dom': `export const useLocation = () => ({ pathname: globalThis.window.location.pathname });`,
    '@/lib/debug-report': `export const copyDebugReport = context => globalThis.__diagnosticActions.copy(context); export const resetApplicationState = () => globalThis.__diagnosticActions.reset(); export const recordRoute = route => globalThis.__diagnosticActions.route(route);`,
  };
  const result = await esbuild.build({
    entryPoints: [componentPath], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', 'lucide-react'], define: { __APP_VERSION__: '"5.1.0"' },
    plugins: [{
      name: 'diagnostics-component-test-adapters',
      setup(build) {
        build.onResolve({ filter: /^@\/|^react-router-dom$/ }, args => ({ path: args.path, namespace: 'diagnostics-test' }));
        build.onResolve({ filter: /\.css$/ }, () => ({ path: 'empty-css', namespace: 'diagnostics-test' }));
        build.onLoad({ filter: /.*/, namespace: 'diagnostics-test' }, args => ({
          contents: args.path === 'empty-css' ? '' : aliases[args.path],
          loader: 'js',
        }));
      },
    }],
  });
  const loaded = new Module(path.join(__dirname, '.version-actions-test.cjs'), module);
  loaded.filename = path.join(__dirname, '.version-actions-test.cjs');
  loaded.paths = Module._nodeModulePaths(__dirname);
  loaded._compile(result.outputFiles[0].text, loaded.filename);
  return loaded.exports.VersionActions;
}

async function mount(t, actions = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/login' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.__diagnosticActions = {
    copy: actions.copy || (async () => true),
    reset: actions.reset || (async () => ({ hadSession: false })),
    route: actions.route || (() => {}),
  };
  let sessionCleared = 0;
  globalThis.__diagnosticAuth = {
    user: null,
    isAuthenticated: false,
    clearLocalSession: () => { sessionCleared++; },
  };
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const Component = await compileComponent();
  const rootElement = document.getElementById('root');
  const reactRoot = createRoot(rootElement);
  await React.act(async () => reactRoot.render(React.createElement(Component, { navigateToLogin: actions.navigateToLogin || (() => {}) })));
  t.after(async () => {
    await React.act(async () => reactRoot.unmount());
    dom.window.close();
    delete globalThis.__diagnosticActions;
    delete globalThis.__diagnosticAuth;
  });
  return { React, rootElement, sessionCleared: () => sessionCleared };
}

test('anonymous and debug-off render the exact compact version → clipboard → trash row', async t => {
  const { rootElement } = await mount(t);
  const row = rootElement.querySelector('[data-testid="version-actions"]');
  assert.ok(row);
  assert.equal(row.querySelector('.keledon-version').textContent, 'v5.1.0');
  const buttons = [...row.querySelectorAll('button')];
  assert.equal(buttons.length, 2);
  assert.deepEqual(buttons.map(button => button.dataset.action), ['copy', 'clear']);
  assert.match(buttons[0].getAttribute('aria-label'), /Copy/);
  assert.match(buttons[1].getAttribute('aria-label'), /Clear/);
  assert.match(buttons[0].querySelector('svg').getAttribute('class'), /clipboard/i);
  assert.match(buttons[1].querySelector('svg').getAttribute('class'), /trash/i);
  assert.equal(buttons.every(button => button.textContent.trim() === ''), true);
  assert.deepEqual([...row.querySelectorAll('[role="status"]')].map(status => status.textContent), ['', '']);
  assert.equal(globalThis.__diagnosticAuth.isAuthenticated, false);

  const styles = fs.readFileSync(path.join(__dirname, '../src/components/common/version-actions.css'), 'utf8');
  assert.match(styles, /gap:\s*4px/);
  assert.match(styles, /font-size:\s*12px/);
  assert.match(styles, /width:\s*28px;\s*height:\s*28px;\s*min-width:\s*28px/);
  assert.match(styles, /width:\s*14px;\s*height:\s*14px/);
  assert.match(styles, /clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
});

test('real copy handler only shows the check after clipboard success and restores the clipboard icon', async t => {
  const { React, rootElement } = await mount(t, { copy: async context => { assert.equal(context.pathname, '/login'); return true; } });
  const button = rootElement.querySelector('[data-action="copy"]');
  await React.act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.equal(button.querySelector('svg').getAttribute('class').includes('lucide-check'), true);
  assert.equal(button.disabled, true);
  assert.equal(rootElement.querySelector('[data-action-status="copy"]').textContent, 'Diagnostics copied');
  await React.act(async () => new Promise(resolve => setTimeout(resolve, 1550)));
  assert.match(button.querySelector('svg').getAttribute('class'), /clipboard/i);
});

test('copy failure preserves the clipboard icon and announces the failure without visible helper copy', async t => {
  const { React, rootElement } = await mount(t, { copy: async () => false });
  const button = rootElement.querySelector('[data-action="copy"]');
  await React.act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.match(button.querySelector('svg').getAttribute('class'), /clipboard/i);
  assert.equal(rootElement.querySelector('[data-action-status="copy"]').textContent, 'Copy failed');
  assert.equal(button.textContent.trim(), '');
});

test('copy and clear confirmations remain independent when both actions succeed together', async t => {
  const { React, rootElement } = await mount(t, {
    copy: async () => true,
    reset: async () => ({ hadSession: false }),
  });
  const copy = rootElement.querySelector('[data-action="copy"]');
  const clear = rootElement.querySelector('[data-action="clear"]');
  await React.act(async () => {
    copy.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    clear.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(rootElement.querySelector('[data-action-status="copy"]').textContent, 'Diagnostics copied');
  assert.equal(rootElement.querySelector('[data-action-status="clear"]').textContent, 'Application data cleared');
  assert.match(copy.querySelector('svg').getAttribute('class'), /lucide-check/);
  assert.match(clear.querySelector('svg').getAttribute('class'), /lucide-check/);
});

test('successful clear invalidates auth state, signals success, then navigates after the check window', async t => {
  let navigated = 0;
  const { React, rootElement, sessionCleared } = await mount(t, {
    reset: async () => ({ hadSession: true }),
    navigateToLogin: () => { navigated++; },
  });
  const button = rootElement.querySelector('[data-action="clear"]');
  await React.act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.equal(sessionCleared(), 1);
  assert.equal(button.querySelector('svg').getAttribute('class').includes('lucide-check'), true);
  assert.equal(rootElement.querySelector('[data-action-status="clear"]').textContent, 'Application data cleared');
  assert.equal(navigated, 0);
  await React.act(async () => new Promise(resolve => setTimeout(resolve, 1550)));
  assert.equal(navigated, 1);
  assert.match(button.querySelector('svg').getAttribute('class'), /trash/i);
});

test('clear failure never confirms success and still removes in-memory auth state', async t => {
  const { React, rootElement, sessionCleared } = await mount(t, { reset: async () => { throw new Error('private failure detail'); } });
  const button = rootElement.querySelector('[data-action="clear"]');
  await React.act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
  assert.equal(sessionCleared(), 1);
  assert.match(button.querySelector('svg').getAttribute('class'), /trash/i);
  assert.equal(rootElement.querySelector('[data-action-status="clear"]').textContent, 'Clear failed');
  assert.equal(rootElement.textContent.includes('private failure detail'), false);
});

test('the shared widget covers public, login, app shell, and admin routes', () => {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(read('services/web/src/components/common/Navbar.tsx'), /<VersionActions\s*\/>/);
  assert.match(read('services/web/src/pages/LoginPage.tsx'), /<VersionActions\s*\/>/);
  assert.match(read('services/web/src/components/layout/Sidebar.tsx'), /<VersionActions\s*\/>/);
  assert.match(read('services/web/src/components/layout/AppLayout.tsx'), /<Sidebar\s*\/>/);
  assert.match(read('services/web/src/AppRouter.tsx'), /<AppLayout>\s*<ManagementLayout>/);
  assert.match(read('services/web/src/AppRouter.tsx'), /path="\/admin\/prompts"[^\n]*<AppLayout>/);
});
