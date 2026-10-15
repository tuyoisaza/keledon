const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));
const { getCandidateFingerprint } = require('./uat-candidate-evidence.cjs');

const dist = path.resolve(__dirname, '../../../landing/dist');
const evidence = path.resolve(__dirname, '../../../docs/phdk/evidence');

test('Landing public navigation keeps preferences clear of hero and available on mobile', { timeout: 60000 }, async () => {
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    let file = path.resolve(dist, `.${pathname}`);
    if (!file.startsWith(`${dist}${path.sep}`) && file !== dist) {
      response.writeHead(403).end();
      return;
    }
    try {
      if (pathname === '/' || !path.extname(pathname)) file = path.join(dist, 'index.html');
      const body = await fs.readFile(file);
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.KELEDON_UAT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      args: ['--no-proxy-server'],
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-MX' });
    const page = await context.newPage();
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.addInitScript(() => localStorage.setItem('keledon-locale', 'es'));
    await page.goto(`${origin}/`);
    await page.locator('nav[aria-label]').waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      const disclaimer = document.querySelector('section[aria-labelledby="landing-title"] p');
      const visibleControls = [...nav.querySelectorAll('select')].filter(control => control.getBoundingClientRect().width > 0);
      const target = disclaimer.getBoundingClientRect();
      return {
        navLabel: nav.getAttribute('aria-label'),
        controlCount: visibleControls.length,
        disclaimer: { top: target.top, bottom: target.bottom },
        controls: visibleControls.map(control => {
          const rect = control.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        }),
      };
    });
    assert.ok(layout.navLabel, 'Landing primary navigation retains an accessible name');
    assert.equal(layout.controlCount, 2, `Landing desktop theme/language controls are visible: ${JSON.stringify(layout)}`);
    assert.ok(layout.controls.every(control => control.bottom <= layout.disclaimer.top || control.top >= layout.disclaimer.bottom), `Landing navigation overlaps hero copy: ${JSON.stringify(layout)}`);
    await fs.mkdir(evidence, { recursive: true });
    await page.screenshot({ path: path.join(evidence, 'uat-landing-home-desktop.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.locator('#public-mobile-menu');
    assert.equal(await menu.isVisible(), false);
    await page.locator('button[aria-controls="public-mobile-menu"]').click();
    assert.equal(await menu.isVisible(), true);
    assert.equal(await menu.getByLabel('Tema de color').count(), 1);
    assert.equal(await menu.getByLabel('Idioma').count(), 1);
    await page.screenshot({ path: path.join(evidence, 'uat-landing-home-mobile-menu.png') });
    const candidate = await getCandidateFingerprint();
    await fs.writeFile(path.join(evidence, 'uat-landing-navbar-5.1.61.json'), JSON.stringify({
      version: '5.1.61',
      candidateRevision: candidate.baseCommit,
      candidateSourceFingerprint: candidate.sourceFingerprint,
      dirtyUntrackedSourceFiles: candidate.dirtyUntrackedSourceFiles,
      sourceRoots: candidate.sourceRoots,
      targetEnvironment: 'local production-built Landing SPA with all external requests blocked',
      result: 'PASS',
      desktop: { viewport: '1280x900', navLabel: layout.navLabel, visiblePreferenceControls: layout.controlCount, noOverlap: true, controls: layout.controls, heroDisclaimer: layout.disclaimer },
      mobile: { viewport: '390x844', menuExpanded: true, themeControlVisible: await menu.getByLabel('Tema de color').isVisible(), languageControlVisible: await menu.getByLabel('Idioma').isVisible() },
      evidence: ['uat-landing-home-desktop.png', 'uat-landing-home-mobile-menu.png'],
    }, null, 2));
    await context.close();
    console.log('PASS Landing nav controls: no public hero overlap at 1280px; both theme and language remain reachable at 390px; external requests blocked');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
