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
  assert.match(spa, /try_files \$uri \$uri\/ \/index\.html;/);
  assert.match(spa, /X-Robots-Tag "noindex, nofollow" always;/);
});
