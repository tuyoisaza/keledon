const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(path.resolve(__dirname, '../../api/node_modules/playwright'));
const { getCandidateFingerprint } = require('./uat-candidate-evidence.cjs');
const appVersion = require('../package.json').version;

const dist = path.resolve(__dirname, '../../../landing/dist');
const evidence = process.env.KELEDON_UAT_EVIDENCE_DIR
  ? path.resolve(process.env.KELEDON_UAT_EVIDENCE_DIR)
  : path.resolve(__dirname, '../../../docs/phdk/evidence');
const evidencePrefix = `uat-landing-${appVersion}`;

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
    const geometry = await page.evaluate(() => {
      const brand = document.querySelector('nav[aria-label] a[aria-label="KELEDON"]');
      const row = document.querySelector('nav[aria-label] [data-testid="version-actions"]');
      const brandRect = brand.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const buttons = [...row.querySelectorAll('button')].map(button => {
        const rect = button.getBoundingClientRect();
        const visual = getComputedStyle(button, '::before');
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, visualWidth: parseFloat(visual.width), visualHeight: parseFloat(visual.height), label: button.getAttribute('aria-label') };
      });
      return { brand: { left: brandRect.left, top: brandRect.top, bottom: brandRect.bottom }, widget: { left: rowRect.left, top: rowRect.top, bottom: rowRect.bottom }, buttons };
    });
    assert.ok(geometry.widget.top >= geometry.brand.bottom, `diagnostics row must sit directly below the product brand: ${JSON.stringify(geometry)}`);
    assert.ok(Math.abs(geometry.widget.left - geometry.brand.left) <= 2, `diagnostics row must align to the top-left product brand: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.widget.bottom <= layout.disclaimer.top || geometry.widget.top >= layout.disclaimer.bottom, `diagnostics row overlaps public hero copy: ${JSON.stringify({ geometry, disclaimer: layout.disclaimer })}`);
    assert.equal(await page.locator('nav[aria-label] [data-testid="version-actions"] button').count(), 2);
    assert.ok(geometry.buttons.every(button => button.width === 44 && button.height === 44), `diagnostics actions must provide 44x44 hit targets: ${JSON.stringify(geometry.buttons)}`);
    assert.ok(geometry.buttons.every(button => button.visualWidth === 28 && button.visualHeight === 28), `visible action tiles must remain compact at 28x28: ${JSON.stringify(geometry.buttons)}`);
    assert.ok(geometry.buttons[1].left >= geometry.buttons[0].right, `diagnostics hit targets must not overlap: ${JSON.stringify(geometry.buttons)}`);
    assert.ok(geometry.buttons.every(button => button.label), 'both icon-only hit targets retain accessible names');
    await fs.mkdir(evidence, { recursive: true });
    await page.screenshot({ path: path.join(evidence, `${evidencePrefix}-home-desktop.png`) });

    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.locator('#public-mobile-menu');
    assert.equal(await menu.isVisible(), false);
    await page.locator('button[aria-controls="public-mobile-menu"]').click();
    assert.equal(await menu.isVisible(), true);
    assert.equal(await menu.getByLabel('Tema de color').count(), 1);
    assert.equal(await menu.getByLabel('Idioma').count(), 1);
    assert.equal(await page.locator('nav[aria-label] [data-testid="version-actions"]').isVisible(), true);
    const mobileHitTargets = await page.locator('nav[aria-label] [data-testid="version-actions"] button').evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    assert.ok(mobileHitTargets.every(target => target.width === 44 && target.height === 44), `mobile diagnostics actions must retain 44x44 hit targets: ${JSON.stringify(mobileHitTargets)}`);
    await page.screenshot({ path: path.join(evidence, `${evidencePrefix}-home-mobile-menu.png`) });
    const candidate = await getCandidateFingerprint();
    await fs.writeFile(path.join(evidence, `${evidencePrefix}-navbar.json`), JSON.stringify({
      version: appVersion,
      candidateRevision: candidate.baseCommit,
      candidateSourceFingerprint: candidate.sourceFingerprint,
      dirtyUntrackedSourceFiles: candidate.dirtyUntrackedSourceFiles,
      sourceRoots: candidate.sourceRoots,
      targetEnvironment: 'local production-built Landing SPA with all external requests blocked',
      result: 'PASS',
      desktop: { viewport: '1280x900', navLabel: layout.navLabel, visiblePreferenceControls: layout.controlCount, widgetBelowBrand: true, widgetTopLeftAligned: true, widgetNoHeroOverlap: true, geometry, hitTargets44x44: true, visibleActionTiles28x28: true, hitTargetsDoNotOverlap: true, actionsNamed: true, noOverlap: true, controls: layout.controls, heroDisclaimer: layout.disclaimer },
      mobile: { viewport: '390x844', menuExpanded: true, themeControlVisible: await menu.getByLabel('Tema de color').isVisible(), languageControlVisible: await menu.getByLabel('Idioma').isVisible(), diagnosticsHitTargets: mobileHitTargets },
      evidence: [`${evidencePrefix}-home-desktop.png`, `${evidencePrefix}-home-mobile-menu.png`],
    }, null, 2));
    await context.close();
    console.log('PASS Landing brand/widget geometry, no hero overlap at 1280px, and mobile preferences at 390px; external requests blocked');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
