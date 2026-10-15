const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

test('public landing document has truthful discovery metadata and route policy', () => {
  const html = read('index.html');
  const config = read('nginx.conf');
  const robots = read('public/robots.txt');
  const sitemap = read('public/sitemap.xml');

  assert.match(html, /<title>KELEDON \| Cloud-governed contact center runtime<\/title>/);
  assert.match(html, /name="description" content="KELEDON coordinates cloud-governed voice assistance/);
  assert.match(html, /name="robots" content="index, follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/keledon\.tuyoisaza\.com\/"/);
  assert.match(html, /<html lang="en" class="no-js">/);
  assert.match(html, /<main class="seo-fallback" aria-labelledby="landing-title">[\s\S]*?<h1 id="landing-title">The Cloud Decides\. The Agent Executes\.<\/h1>/);
  assert.match(html, /KELEDON coordinates voice, cloud decisions and browser execution through workflows configured for each client\./);
  assert.match(html, /The browser executes approved actions in the interfaces configured by each client\./);
  assert.match(html, /Call and CRM interfaces are configured per client\./);
  assert.match(html, /JavaScript is required for interactive application flows; this product overview remains available above\.<\/p><\/noscript>/);
  assert.match(read('src/main.tsx'), /document\.documentElement\.classList\.remove\('no-js'\)/);

  const home = config.match(/location = \/ \{([\s\S]*?)\n        \}/)?.[1];
  const spa = config.match(/location \/ \{([\s\S]*?)\n        \}/)?.[1];
  assert.ok(home, 'exact public-root location exists');
  assert.match(home, /X-Robots-Tag "index, follow" always;/);
  assert.ok(spa, 'SPA fallback location exists');
  assert.match(spa, /X-Robots-Tag "noindex, nofollow" always;/);
  assert.match(robots, /^User-agent: \*/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/keledon\.tuyoisaza\.com\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/keledon\.tuyoisaza\.com\/<\/loc>/);
});
