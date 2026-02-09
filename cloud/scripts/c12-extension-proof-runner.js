#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer');

const DEV_ONLY_FLAG = '--dev-only-bootstrap';

function fail(message) {
  throw new Error(`[C12-RUNNER][FAIL] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    fail('NODE_ENV=production blocked. C12 runner is DEV-ONLY.');
  }

  if (!process.argv.includes(DEV_ONLY_FLAG)) {
    fail(`Missing ${DEV_ONLY_FLAG}. DEV-ONLY runner bootstrap must be explicit.`);
  }
}

function requireExtensionDist(extensionDistPath) {
  const manifestPath = path.join(extensionDistPath, 'manifest.json');
  const backgroundPath = path.join(extensionDistPath, 'background', 'main.js');
  const sidepanelPath = path.join(extensionDistPath, 'ui', 'sidepanel-pipeline.html');

  if (!fs.existsSync(extensionDistPath)) {
    fail(`Extension dist path not found: ${extensionDistPath}`);
  }

  if (!fs.existsSync(manifestPath)) {
    fail(`Extension manifest missing in dist: ${manifestPath}`);
  }

  if (!fs.existsSync(backgroundPath)) {
    fail(`Extension background runtime missing in dist: ${backgroundPath}`);
  }

  if (!fs.existsSync(sidepanelPath)) {
    fail(`Extension UI page missing in dist: ${sidepanelPath}`);
  }
}

async function waitForExtensionId(browser, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const targets = browser.targets();
    for (const target of targets) {
      const url = target.url();
      const match = /^chrome-extension:\/\/([a-z]{32})\//.exec(url);
      if (match) {
        return match[1];
      }
    }

    await sleep(200);
  }

  fail('Extension ID not discovered from Chromium targets within timeout.');
}

async function setBackendUrlAndTrigger(page, backendUrl) {
  return page.evaluate(async (url) => {
    const sendMessage = (message) =>
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            reject(new Error(runtimeError.message));
            return;
          }
          resolve(response);
        });
      });

    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ KELEDON_BACKEND_URL: url, 'keledon.cloud_url': url }, () => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve();
      });
    });

    const setUrlResponse = await sendMessage({ type: 'C10_SET_CLOUD_URL', url });
    if (!setUrlResponse || setUrlResponse.success !== true) {
      throw new Error(setUrlResponse?.error || 'Background rejected C10_SET_CLOUD_URL');
    }

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let runtimeStatus = null;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      runtimeStatus = await sendMessage({ type: 'C10_GET_RUNTIME_STATUS' });
      if (runtimeStatus?.connected && runtimeStatus?.session_id) {
        break;
      }
      await wait(500);
    }

    if (!runtimeStatus?.connected || !runtimeStatus?.session_id) {
      throw new Error('Background did not reach connected session state after backend URL configuration');
    }

    const startResponse = await sendMessage({ type: 'C10_START_LISTENING' });
    if (!startResponse || startResponse.success !== true) {
      throw new Error(startResponse?.error || 'Background rejected C10_START_LISTENING');
    }

    return {
      cloud_url: runtimeStatus?.cloud_url || null,
      session_id: startResponse?.sessionId || null,
    };
  }, backendUrl);
}

async function launchAndTriggerExtension(options) {
  const backendUrl = options.backendUrl;
  const extensionDistPath = options.extensionDistPath;
  const timeoutMs = options.timeoutMs || 30000;

  if (!backendUrl) {
    fail('Missing backendUrl input for extension runner.');
  }

  requireExtensionDist(extensionDistPath);

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keledon-c12-'));
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionDistPath}`,
        `--load-extension=${extensionDistPath}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
      defaultViewport: { width: 1200, height: 900 },
    });

    const extensionId = await waitForExtensionId(browser, timeoutMs);
    const page = await browser.newPage();
    const extensionPageUrl = `chrome-extension://${extensionId}/ui/sidepanel-pipeline.html`;
    await page.goto(extensionPageUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await sleep(1200);

    const triggerResult = await setBackendUrlAndTrigger(page, backendUrl);

    return {
      browser,
      extensionId,
      extensionPageUrl,
      backendUrl,
      sessionId: triggerResult.session_id || null,
      runtimeCloudUrl: triggerResult.cloud_url || null,
      close: async () => {
        if (browser && browser.connected) {
          await browser.close();
        }
      },
      cleanup: () => {
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (_error) {
          // noop
        }
      },
    };
  } catch (error) {
    if (browser && browser.connected) {
      await browser.close();
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (_error) {
      // noop
    }
    fail(error instanceof Error ? error.message : String(error));
  }
}

async function runCli() {
  assertDevOnly();

  const backendUrlArg = process.argv.find((arg) => arg.startsWith('--backend-url='));
  const extensionPathArg = process.argv.find((arg) => arg.startsWith('--extension-dist='));
  const timeoutArg = process.argv.find((arg) => arg.startsWith('--timeout-ms='));

  const backendUrl = backendUrlArg ? backendUrlArg.split('=')[1] : 'http://localhost:3001';
  const extensionDistPath = extensionPathArg
    ? extensionPathArg.split('=')[1]
    : path.resolve(__dirname, '..', '..', 'agent', 'dist');
  const timeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 30000;

  const runtime = await launchAndTriggerExtension({
    backendUrl,
    extensionDistPath,
    timeoutMs,
  });

  console.log(`[C12-RUNNER] extension_id=${runtime.extensionId}`);
  console.log(`[C12-RUNNER] extension_page=${runtime.extensionPageUrl}`);
  console.log(`[C12-RUNNER] backend_url=${runtime.backendUrl}`);
  console.log(`[C12-RUNNER] runtime_cloud_url=${runtime.runtimeCloudUrl}`);
  console.log(`[C12-RUNNER] session_id=${runtime.sessionId}`);

  await sleep(5000);
  await runtime.close();
  runtime.cleanup();
}

if (require.main === module) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

module.exports = {
  launchAndTriggerExtension,
};
