import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBrandsForCompany,
  getTeamsForBrand,
  getBrowserDownloadUrl,
  readPlainTextFile,
} from '../src/lib/knowledge-source-utils.js';

test('getBrandsForCompany filters by camelCase companyId', () => {
  const brands = [
    { id: 'b1', companyId: 'c1', name: 'Alpha' },
    { id: 'b2', companyId: 'c2', name: 'Beta' },
    { id: 'b3', companyId: 'c1', name: 'Gamma' },
  ];

  assert.deepEqual(
    getBrandsForCompany(brands, 'c1').map((brand) => brand.id),
    ['b1', 'b3'],
  );
});

test('getTeamsForBrand filters by brandId', () => {
  const teams = [
    { id: 't1', brandId: 'b1', name: 'Team 1' },
    { id: 't2', brandId: 'b2', name: 'Team 2' },
    { id: 't3', brandId: 'b1', name: 'Team 3' },
  ];

  assert.deepEqual(
    getTeamsForBrand(teams, 'b1').map((team) => team.id),
    ['t1', 't3'],
  );
});

test('getBrowserDownloadUrl prefers env override and otherwise uses latest release asset', () => {
  assert.equal(
    getBrowserDownloadUrl({ VITE_KELEDON_BROWSER_DOWNLOAD_URL: 'https://example.com/browser.exe' }),
    'https://example.com/browser.exe',
  );

  assert.equal(
    getBrowserDownloadUrl({}),
    'https://github.com/tuyoisaza/keledon/releases/latest/download/KELEDON.Browser.Setup.exe',
  );
});

test('readPlainTextFile returns the text of a plain text file', async () => {
  const file = {
    name: 'policy.txt',
    async text() {
      return 'hello knowledge base';
    },
  };

  await assert.doesNotReject(async () => {
    const content = await readPlainTextFile(file);
    assert.equal(content, 'hello knowledge base');
  });
});
