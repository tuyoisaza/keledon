// Scoped PHDK UAT: production-built settings navigation with synthetic identity, no external requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('../../api/node_modules/playwright');

const dist = path.resolve(__dirname, '../dist');
const evidence = path.resolve(__dirname, '../../../docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/admin-settings-uat.json');

async function main() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const candidate = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    const file = candidate.startsWith(dist + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      ? candidate
      : path.join(dist, 'index.html');
    res.setHeader('Content-Type', { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let role = 'superadmin';
  let externalBlocked = 0;
  let saveFailure = false;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      sessionStorage.setItem('auth_token', 'isolated-admin-settings-uat');
      if (!localStorage.getItem('keledon-locale')) localStorage.setItem('keledon-locale', 'en');
    });
    const address = `http://127.0.0.1:${server.address().port}`;
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/api/auth/me') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: 'uat-admin-settings', name: 'Synthetic reviewer', email: 'uat@example.invalid', role, companyId: 'uat-company', teamId: 'uat-team' } }) });
      }
      if (url.pathname === '/api/crud/companies') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'uat-company', name: 'Synthetic tenant' }]) });
      }
      if (url.pathname === '/api/teams/uat-company/config' && request.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ teamId: 'uat-company', teamName: 'Synthetic tenant', sttProvider: 'vosk', ttsProvider: 'webspeech', voskServerUrl: 'wss://speech.example.invalid', voskModel: 'vosk-model-en-us' }) });
      }
      if (url.pathname === '/api/teams/uat-company/config' && request.method() === 'PUT') {
        return route.fulfill({ status: saveFailure ? 500 : 200, contentType: 'application/json', body: JSON.stringify({ success: !saveFailure }) });
      }
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (url.origin !== address) { externalBlocked++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(`${address}/admin/settings`);
    await page.getByRole('heading', { name: 'Settings' }).waitFor();
    for (const label of ['Companies and tenants', 'AI prompts and workflows', 'Visual templates', 'Audit history', 'System status']) {
      await page.getByRole('link', { name: new RegExp(label) }).waitFor();
    }
    await page.evaluate(() => localStorage.setItem('keledon-locale', 'es'));
    role = 'admin';
    await page.reload();
    await page.getByRole('heading', { name: 'Configuración' }).waitFor();
    await page.getByRole('link', { name: /Usuarios y roles/ }).waitFor();
    await page.getByRole('link', { name: /Configuración de voz de mi empresa/ }).waitFor();
    for (const label of ['Empresas y tenants', 'Prompts y flujos de IA', 'Templates visuales', 'Historial de auditoría', 'Estado del sistema']) {
      assert.equal(await page.getByRole('link', { name: new RegExp(label) }).count(), 0, `tenant admin must not see ${label}`);
    }
    await page.getByRole('link', { name: /Configuración de voz de mi empresa/ }).click();
    await page.getByRole('heading', { name: 'Configuración del equipo' }).waitFor();
    for (const label of ['Seleccionar empresa', 'Proveedor de voz a texto (STT)', 'Proveedor de texto a voz (TTS)', 'URL del servidor Vosk', 'Modelo Vosk']) {
      assert.equal(await page.getByLabel(label).count(), 1, `${label} must label its control in Spanish`);
    }
    await page.getByText('Vosk se ejecuta localmente sin costo. Deepgram funciona en la nube.').waitFor();
    await page.getByText('Selecciona el modelo Vosk para el reconocimiento de voz.').waitFor();
    await page.evaluate(() => localStorage.setItem('keledon-locale', 'en'));
    await page.reload();
    await page.getByRole('heading', { name: 'Team settings' }).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.matches(':focus-visible')), true, 'keyboard navigation must show a visible focus state');
    for (const label of ['Select company', 'Speech-to-text (STT) provider', 'Text-to-speech (TTS) provider', 'Vosk server URL', 'Vosk model']) {
      assert.equal(await page.getByLabel(label).count(), 1, `${label} must label its control`);
    }
    await page.getByText('Vosk runs locally for free. Deepgram is cloud-based.').waitFor();
    await page.getByText('Select the Vosk model for speech recognition.').waitFor();
    for (const id of ['team-settings-company', 'team-settings-stt-provider', 'team-settings-tts-provider', 'team-settings-vosk-server-url', 'team-settings-vosk-model']) {
      const height = await page.locator(`#${id}`).evaluate(element => element.getBoundingClientRect().height);
      assert.ok(height >= 44, `${id} must meet the 44px touch target height`);
    }
    const contrastChecks = await page.evaluate(() => {
      const rgb = value => {
        const channels = value.match(/[\d.]+/g)?.map(Number) || [];
        return channels.length >= 3 ? channels.slice(0, 3) : null;
      };
      const luminance = color => color.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const background = element => {
        const chain = [];
        for (let current = element; current; current = current.parentElement) chain.push(current);
        let result = [255, 255, 255];
        for (const current of chain.reverse()) {
          const color = getComputedStyle(current).backgroundColor;
          const parsed = rgb(color);
          const alpha = Number(color.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)/)?.[1] ?? 1);
          if (parsed) result = parsed.map((channel, index) => channel * alpha + result[index] * (1 - alpha));
        }
        return result;
      };
      return ['team-settings-company', 'team-settings-stt-provider', 'team-settings-tts-provider', 'team-settings-vosk-server-url', 'team-settings-vosk-model'].map(id => {
        const control = document.getElementById(id);
        const label = document.querySelector(`label[for="${id}"]`);
        const textColor = rgb(getComputedStyle(label).color);
        const labelBg = background(label);
        const controlColor = rgb(getComputedStyle(control).color);
        const controlBg = background(control);
        const ratio = (foreground, backdrop) => {
          const values = [luminance(foreground), luminance(backdrop)].sort((a, b) => b - a);
          return Number(((values[0] + 0.05) / (values[1] + 0.05)).toFixed(2));
        };
        return { id, label: ratio(textColor, labelBg), control: ratio(controlColor, controlBg) };
      });
    });
    for (const result of contrastChecks) {
      assert.ok(result.label >= 4.5, `${result.id} label contrast ${result.label}:1 is below 4.5:1`);
      assert.ok(result.control >= 4.5, `${result.id} control text contrast ${result.control}:1 is below 4.5:1`);
    }
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await page.getByRole('status').getByText('Settings saved successfully.').waitFor();
    saveFailure = true;
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await page.getByRole('alert').getByText('Failed to save settings.').waitFor();
    await page.evaluate(() => localStorage.setItem('keledon-locale', 'pt'));
    await page.reload();
    await page.getByRole('heading', { name: 'Configurações da equipe' }).waitFor();
    for (const label of ['Selecionar empresa', 'Provedor de voz para texto (STT)', 'Provedor de texto para voz (TTS)', 'URL do servidor Vosk', 'Modelo Vosk']) {
      assert.equal(await page.getByLabel(label).count(), 1, `${label} must label its control in Portuguese`);
    }
    await page.getByText('O Vosk é executado localmente sem custo. O Deepgram funciona na nuvem.').waitFor();
    await page.getByText('Selecione o modelo Vosk para reconhecimento de voz.').waitFor();
    role = 'user';
    await page.goto(`${address}/admin/settings`);
    await page.reload();
    await page.waitForURL('**/dashboard');
    assert.equal(externalBlocked, 0);
    fs.mkdirSync(path.dirname(evidence), { recursive: true });
    fs.writeFileSync(evidence, JSON.stringify({ date: new Date().toISOString(), candidate: require('../package.json').version, target: 'production-built Web SPA with synthetic identity API', result: 'PASS_SCOPED', assertions: 53, checks: ['superadmin sees platform configuration links in English', 'tenant admin sees tenant links and voice configuration in Spanish but no platform-only links', 'team settings fields expose associated accessible names and helper copy in Spanish, English and Portuguese', 'keyboard navigation receives a visible focus state', 'interactive controls meet 44px minimum touch-target height', 'labels and control text meet WCAG AA 4.5:1 contrast in the light theme', 'successful and failed save feedback are announced with status and alert semantics', 'ordinary user cannot enter management settings'], contrast: contrastChecks, limitations: ['synthetic identity/API only; route authorization and backend CRUD are verified separately', 'no customer data or external endpoints', 'screen-reader announcement was inferred from DOM semantics; no assistive-technology session was run', 'contrast check covers only the five fields on Team Settings in the default light theme'] }, null, 2) + '\n');
    fs.copyFileSync(evidence, path.resolve(path.dirname(evidence), `admin-settings-uat-${require('../package.json').version}.json`));
    console.log('PASS admin settings UAT: role boundaries, localized labels, keyboard focus, 44px controls, light-theme field contrast and save announcements; synthetic API only.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
