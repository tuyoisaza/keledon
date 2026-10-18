const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('nginx serves the public root in its indexable location and SPA routes as noindex', () => {
  const config = fs.readFileSync(path.resolve(__dirname, '../nginx.conf'), 'utf8');
  const home = config.match(/location = \/ \{([\s\S]*?)\n    \}/)?.[1];
  const spa = config.match(/location \/ \{([\s\S]*?)\n    \}/)?.[1];

  assert.ok(home, 'exact public-root location exists');
  assert.match(home, /try_files \/index\.html =404;/);
  assert.match(home, /X-Robots-Tag "index, follow" always;/);
  assert.doesNotMatch(home, /\/index\.html\s*;/, 'home fallback must not internally redirect to a different location');

  assert.ok(spa, 'SPA fallback location exists');
  assert.match(spa, /try_files \$uri \$uri\/ @spa;/);
  assert.match(spa, /X-Robots-Tag "noindex, nofollow" always;/);
});

test('nginx serves the superadmin interface catalog route through the protected SPA', () => {
  const config = fs.readFileSync(path.resolve(__dirname, '../nginx.conf'), 'utf8');
  const router = fs.readFileSync(path.resolve(__dirname, '../src/AppRouter.tsx'), 'utf8');

  assert.match(config, /~\^\/admin\/interfaces\/\?\$ 1;/);
  assert.match(router, /path="\/admin\/interfaces"\s+element=\{<ProtectedRoute minRole="superadmin">/);
});

test('nginx Docker build loads the service-scoped server configuration from the repository-root context', () => {
  const dockerfile = fs.readFileSync(path.resolve(__dirname, '../Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY services\/web\/nginx\.conf \/etc\/nginx\/conf\.d\/default\.conf/);
  assert.doesNotMatch(dockerfile, /COPY nginx\.conf \/etc\/nginx\/conf\.d\/default\.conf/);
});
