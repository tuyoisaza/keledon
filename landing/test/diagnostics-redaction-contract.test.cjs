const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');

test('Landing and Web diagnostics withhold API and OAuth hostnames', () => {
  const landing = read('landing/src/lib/debug-report.ts');
  const web = read('services/web/src/lib/debug-report.ts');
  const withheldOAuth = 'OAuth redirect host: Withheld (hostnames are excluded from copied diagnostics)';
  const withheldApi = 'API hostname: Withheld (hostnames are excluded from copied diagnostics)';

  for (const [surface, source] of [['Landing', landing], ['Web', web]]) {
    assert.ok(source.includes(withheldOAuth), `${surface} withholds the OAuth redirect hostname`);
    assert.ok(source.includes(withheldApi), `${surface} withholds the API hostname`);
    assert.ok(!source.includes('function apiHostname()'), `${surface} does not derive a reportable API hostname`);
  }
});
