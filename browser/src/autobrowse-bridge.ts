/**
 * AutoBrowse Bridge - KELEDON Browser integration
 * v0.1.18 - Electron-native automation (no CDP dependency)
 *
 * Uses Electron webContents APIs directly for BrowserView automation:
 *   - webContents.loadURL()          → navigation
 *   - webContents.executeJavaScript() → click / fill / extract / scroll
 *   - webContents.capturePage()       → screenshots
 *
 * CDP/Playwright kept as optional fallback for advanced multi-page scenarios.
 *
 * Flow: Renderer → IPC → executeGoal() → webContents → BrowserView DOM
 */

import log from 'electron-log';
import { BrowserWindow, BrowserView, WebContents, ipcMain } from 'electron';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';

interface BridgeGoalInput {
  execution_id?: string;
  goal: string;
  inputs?: Record<string, unknown>;
  constraints?: {
    max_steps?: number;
    timeout_ms?: number;
  };
  success_criteria?: string;
}

interface BridgeExecutionResult {
  execution_id: string;
  status: 'running' | 'completed' | 'failed';
  goal_status: 'success' | 'failed' | 'uncertain';
  steps: StepResult[];
  duration: number;
  artifacts: {
    screenshots: string[];
    logs: string[];
  };
  error?: string;
}

interface StepResult {
  id: string;
  type: string;
  description: string;
  success: boolean;
  duration: number;
  error?: string;
  extractedValue?: string;
}

interface BrowserState {
  url: string;
  title: string;
  tabs: { id: string; url: string; title: string }[];
}

interface GoalAction {
  type: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover';
  selector?: string;
  value?: string;
  url?: string;
  description: string;
}

let isInitialized = false;
let mainWindow: BrowserWindow | null = null;
let cdpBrowser: Browser | null = null;
let cdpContext: BrowserContext | null = null;
let electronTabs: { id: string; name: string; url: string; view: BrowserView | null }[] = [];
let activeTabId: string = 'home';
let progressEmitter: ((step: number, total: number, action: string, status: 'running' | 'done' | 'failed') => void) | null = null;
const CDP_PORT = parseInt(process.env.KELEDON_CDP_PORT || '9222', 10);

// ==================== Tab Management ====================

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

export function setTabs(tabList: typeof electronTabs, activeId: string) {
  electronTabs = tabList;
  activeTabId = activeId;
}

export function setProgressEmitter(emitter: typeof progressEmitter) {
  progressEmitter = emitter;
}

// ==================== Active Tab Helper ====================

function getActiveWebContents(): WebContents | null {
  const activeTab = electronTabs.find(t => t.id === activeTabId);
  if (activeTab?.view) {
    return activeTab.view.webContents;
  }
  // Fallback: mainWindow webContents (home/settings tabs)
  return mainWindow?.webContents || null;
}

// ==================== CDP Connection (optional fallback) ====================

async function connectCDP(): Promise<{ browser: Browser; page: Page } | null> {
  const cdpUrl = `http://localhost:${CDP_PORT}`;
  log.info(`[AutoBrowse] Connecting to CDP at ${cdpUrl}`);

  try {
    if (!cdpBrowser || !cdpBrowser.isConnected()) {
      cdpBrowser = await chromium.connectOverCDP(cdpUrl);
      const contexts = cdpBrowser.contexts();
      cdpContext = contexts[0] || await cdpBrowser.newContext();
      log.info('[AutoBrowse] CDP connected successfully');
    }

    const pages = cdpContext?.pages() || [];
    log.info(`[AutoBrowse] Found ${pages.length} CDP pages`);

    const activeTab = electronTabs.find(t => t.id === activeTabId);
    if (activeTab?.view) {
      const activeUrl = activeTab.view.webContents.getURL();
      for (const page of pages) {
        try {
          const pageUrl = page.url();
          if (pageUrl && pageUrl !== 'about:blank' && activeUrl) {
            const activeHost = new URL(activeUrl).hostname;
            const pageHost = new URL(pageUrl).hostname;
            if (activeHost && pageHost && activeHost === pageHost) {
              log.info(`[AutoBrowse] Matched active tab page via CDP: ${pageUrl}`);
              return { browser: cdpBrowser, page };
            }
          }
        } catch { /* skip */ }
      }
    }

    for (let i = pages.length - 1; i >= 0; i--) {
      try {
        const pageUrl = pages[i].url();
        if (pageUrl && pageUrl !== 'about:blank' && pageUrl !== '') {
          return { browser: cdpBrowser, page: pages[i] };
        }
      } catch { /* skip */ }
    }

    if (pages.length > 0) return { browser: cdpBrowser, page: pages[0] };
    return null;
  } catch (error) {
    log.warn('[AutoBrowse] CDP connection failed (non-fatal, using Electron APIs):', String(error).split('\n')[0]);
    cdpBrowser = null;
    cdpContext = null;
    return null;
  }
}

// ==================== Goal Mapper ====================

function mapGoalToActions(goal: string, inputs?: Record<string, unknown>): GoalAction[] {
  const actions: GoalAction[] = [];
  const goalLower = goal.toLowerCase().trim();

  // Input URL takes priority for navigation
  const inputUrl = (inputs?.url as string) || (inputs?.targetUrl as string);
  if (inputUrl) {
    actions.push({ type: 'navigate', url: inputUrl, description: `Navigate to ${inputUrl}` });
  }

  // ---- Navigate patterns ----
  if (!inputUrl && (
    goalLower.startsWith('go to ') ||
    goalLower.startsWith('navigate to ') ||
    goalLower.startsWith('open ') ||
    goalLower.startsWith('visit ')
  )) {
    const urlMatch = goal.match(/(?:go to|navigate to|open|visit)\s+(https?:\/\/[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}[^\s]*)/i);
    if (urlMatch) {
      let targetUrl = urlMatch[1];
      if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
      actions.push({ type: 'navigate', url: targetUrl, description: `Navigate to ${targetUrl}` });
    }
  }

  // ---- URL direct input ----
  if (actions.length === 0 && !inputUrl && (
    goalLower.match(/^https?:\/\//) ||
    goalLower.match(/^[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}/)
  )) {
    const targetUrl = goalLower.startsWith('http') ? goal : 'https://' + goal;
    actions.push({ type: 'navigate', url: targetUrl, description: `Navigate to ${targetUrl}` });
  }

  // ---- Login patterns ----
  if (goalLower.includes('login') || goalLower.includes('sign in') || goalLower.includes('log in')) {
    const username = (inputs?.username as string) || (inputs?.email as string) || '';
    const password = (inputs?.password as string) || '';

    if (username) {
      actions.push({
        type: 'fill',
        selector: 'input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"], input[id*="email"], input[autocomplete="username"], input[placeholder*="email" i], input[placeholder*="user" i]',
        value: username,
        description: `Fill username: ${username}`
      });
      actions.push({ type: 'press_key', value: 'Tab', description: 'Tab to password field' });
    }
    if (password) {
      actions.push({
        type: 'fill',
        selector: 'input[type="password"], input[name*="pass"], input[id*="pass"]',
        value: password,
        description: 'Fill password'
      });
    }
    actions.push({
      type: 'click',
      selector: 'button[type="submit"], input[type="submit"], button:has-text("sign in"), button:has-text("log in"), button:has-text("login"), [data-id*="login" i]',
      description: 'Click login button'
    });
    actions.push({ type: 'wait', description: 'Wait for post-login navigation' });
  }

  // ---- Click patterns ----
  if (goalLower.includes('click') || goalLower.includes('press ') || goalLower.includes('tap ')) {
    const clickMatch = goal.match(/(?:click|press|tap)\s+(?:on\s+|the\s+)?["']?([^"'\n]+?)["']?(?:\s+button)?$/i);
    if (clickMatch) {
      const target = clickMatch[1].trim();
      actions.push({
        type: 'click',
        selector: `text="${target}", [aria-label="${target}"], [title="${target}"], button:has-text("${target}")`,
        description: `Click "${target}"`
      });
    }
  }

  // ---- Fill / type patterns ----
  if ((goalLower.includes('fill') || goalLower.includes('type') || goalLower.includes('enter ')) && goalLower.includes(' in ')) {
    const fillMatch = goal.match(/(?:fill|type|enter)\s+["']?([^"'\n]+?)["']?\s+(?:in|into|on)\s+(?:the\s+)?["']?([^"'\n]+?)["']?$/i);
    if (fillMatch) {
      actions.push({
        type: 'fill',
        selector: fillMatch[2].trim(),
        value: fillMatch[1].trim(),
        description: `Fill "${fillMatch[1]}" into ${fillMatch[2]}`
      });
    }
  }

  // ---- Search patterns ----
  if ((goalLower.startsWith('search') || goalLower.startsWith('find ') || goalLower.startsWith('look for '))) {
    const searchMatch = goal.match(/(?:search(?:\s+for)?|find|look for)\s+["']?([^"'\n]+?)["']?$/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      if (actions.length === 0) {
        actions.push({ type: 'navigate', url: 'https://www.google.com', description: 'Navigate to Google' });
      }
      actions.push({
        type: 'fill',
        selector: 'input[name="q"], input[type="search"], textarea[name="q"]',
        value: query,
        description: `Type search: "${query}"`
      });
      actions.push({ type: 'press_key', value: 'Enter', description: 'Submit search' });
      actions.push({ type: 'wait', description: 'Wait for search results' });
    }
  }

  // ---- Scroll patterns ----
  if (goalLower.includes('scroll down') || goalLower.includes('scroll up')) {
    const direction = goalLower.includes('scroll up') ? 'up' : 'down';
    actions.push({ type: 'scroll', value: direction, description: `Scroll ${direction}` });
  }

  // ---- Screenshot ----
  if (goalLower.includes('screenshot') || goalLower.includes('take a picture') || goalLower.includes('capture')) {
    actions.push({ type: 'screenshot', description: 'Capture screenshot' });
  }

  // ---- Extract ----
  if (goalLower.includes('extract') || goalLower.includes('scrape') || goalLower.includes('get text') || goalLower.includes('read page')) {
    actions.push({ type: 'wait', description: 'Wait for page to be ready' });
    actions.push({ type: 'extract', description: 'Extract page content' });
  }

  // ---- Fallback: unrecognized → Google search ----
  if (actions.length === 0) {
    actions.push({
      type: 'navigate',
      url: `https://www.google.com/search?q=${encodeURIComponent(goal)}`,
      description: `Search Google for: "${goal}"`
    });
  }

  // Always end with screenshot
  if (!actions.some(a => a.type === 'screenshot')) {
    actions.push({ type: 'screenshot', description: 'Capture final state' });
  }

  return actions;
}

// ==================== Electron-native Action Execution ====================

async function executeActionElectron(wc: WebContents, action: GoalAction): Promise<StepResult> {
  const startTime = Date.now();
  const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    switch (action.type) {
      case 'navigate': {
        if (!action.url) throw new Error('No URL for navigate');
        const activeTab = electronTabs.find(t => t.id === activeTabId);
        if (activeTab?.view) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => resolve(), 15000);
            activeTab.view!.webContents.once('did-finish-load', () => { clearTimeout(timeout); resolve(); });
            activeTab.view!.webContents.once('did-fail-load', (_e, code, desc) => {
              if (code !== -3) { clearTimeout(timeout); reject(new Error(`Load failed: ${desc}`)); }
              else { clearTimeout(timeout); resolve(); } // -3 = aborted, usually a redirect, treat as ok
            });
            activeTab.view!.webContents.loadURL(action.url!).catch(reject);
          });
        } else {
          await wc.loadURL(action.url).catch(() => {});
        }
        return { id, type: 'navigate', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'click': {
        if (!action.selector) throw new Error('No selector for click');
        const selectors = action.selector.split(',').map(s => s.trim());
        let clicked = false;
        for (const sel of selectors) {
          try {
            // Try CSS selector click
            const result: boolean = await wc.executeJavaScript(`
              (function() {
                const el = document.querySelector(${JSON.stringify(sel)});
                if (el) { el.click(); return true; }
                return false;
              })()
            `);
            if (result) { clicked = true; break; }
          } catch { /* try next */ }
        }
        if (!clicked) throw new Error(`No element matched: ${action.selector}`);
        return { id, type: 'click', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'fill': {
        if (!action.selector) throw new Error('No selector for fill');
        const selectors = action.selector.split(',').map(s => s.trim());
        let filled = false;
        for (const sel of selectors) {
          try {
            const result: boolean = await wc.executeJavaScript(`
              (function() {
                const el = document.querySelector(${JSON.stringify(sel)});
                if (el) {
                  el.focus();
                  const nativeInputValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
                  if (nativeInputValue && nativeInputValue.set) {
                    nativeInputValue.set.call(el, ${JSON.stringify(action.value || '')});
                  } else {
                    el.value = ${JSON.stringify(action.value || '')};
                  }
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  return true;
                }
                return false;
              })()
            `);
            if (result) { filled = true; break; }
          } catch { /* try next */ }
        }
        if (!filled) throw new Error(`No element matched: ${action.selector}`);
        return { id, type: 'fill', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'press_key': {
        const key = action.value || 'Enter';
        await wc.executeJavaScript(`
          (function() {
            const el = document.activeElement || document.body;
            const keyMap = {
              'Enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
              'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
              'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
              'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
              'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
              'Space': { key: ' ', code: 'Space', keyCode: 32 }
            };
            const kInfo = keyMap[${JSON.stringify(key)}] || { key: ${JSON.stringify(key)}, code: ${JSON.stringify(key)}, keyCode: 0 };
            el.dispatchEvent(new KeyboardEvent('keydown', { ...kInfo, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { ...kInfo, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { ...kInfo, bubbles: true }));
            if (kInfo.key === 'Enter') {
              const form = el.closest('form');
              if (form) form.submit();
            }
            if (kInfo.key === 'Tab') {
              const focusable = Array.from(document.querySelectorAll('input,button,select,textarea,a,[tabindex]:not([tabindex="-1"])'));
              const idx = focusable.indexOf(el);
              if (idx >= 0 && idx < focusable.length - 1) focusable[idx + 1].focus();
            }
          })()
        `);
        return { id, type: 'press_key', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'select': {
        if (!action.selector) throw new Error('No selector for select');
        await wc.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(action.selector)});
            if (el) { el.value = ${JSON.stringify(action.value || '')}; el.dispatchEvent(new Event('change', { bubbles: true })); }
          })()
        `);
        return { id, type: 'select', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'hover': {
        if (!action.selector) throw new Error('No selector for hover');
        await wc.executeJavaScript(`
          (function() {
            const el = document.querySelector(${JSON.stringify(action.selector)});
            if (el) { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); }
          })()
        `);
        return { id, type: 'hover', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'scroll': {
        const direction = action.value === 'up' ? -500 : 500;
        await wc.executeJavaScript(`window.scrollBy(0, ${direction})`);
        return { id, type: 'scroll', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'wait': {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { id, type: 'wait', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'screenshot': {
        const activeTab = electronTabs.find(t => t.id === activeTabId);
        const wcForCapture = activeTab?.view?.webContents || mainWindow?.webContents || wc;
        const image = await wcForCapture.capturePage();
        const screenshotBase64 = `data:image/png;base64,${image.toPNG().toString('base64')}`;
        return { id, type: 'screenshot', description: action.description, success: true, duration: Date.now() - startTime, extractedValue: screenshotBase64 };
      }

      case 'extract': {
        let value = '';
        if (action.selector) {
          try {
            value = await wc.executeJavaScript(`
              (function() {
                const el = document.querySelector(${JSON.stringify(action.selector)});
                return el ? (el.textContent || el.innerText || '').trim() : '';
              })()
            `) || '';
          } catch { /* fall through to body text */ }
        }
        if (!value) {
          value = await wc.executeJavaScript(`
            (document.body?.innerText || document.body?.textContent || '').trim().substring(0, 5000)
          `) || '';
        }
        return { id, type: 'extract', description: action.description, success: true, duration: Date.now() - startTime, extractedValue: value };
      }

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  } catch (error) {
    return { id, type: action.type, description: action.description, success: false, duration: Date.now() - startTime, error: String(error) };
  }
}

// ==================== Public API ====================

export async function initializeAutoBrowse(_electronSession?: any): Promise<void> {
  if (isInitialized) {
    log.info('[AutoBrowse] Already initialized');
    return;
  }

  log.info('[AutoBrowse] Initializing (Electron-native mode)...');
  log.info(`[AutoBrowse] CDP port for fallback: ${CDP_PORT}`);

  // Electron-native mode doesn't need CDP to initialize
  isInitialized = true;
  log.info('[AutoBrowse] Initialized (Electron-native mode, CDP optional)');
}

export async function executeGoal(input: BridgeGoalInput): Promise<BridgeExecutionResult> {
  if (!isInitialized) {
    throw new Error('AutoBrowse not initialized');
  }

  log.info('[AutoBrowse] Executing goal:', input.goal);
  const startTime = Date.now();
  const executionId = input.execution_id || `exec-${Date.now()}`;
  const steps: StepResult[] = [];
  const screenshots: string[] = [];
  const logs: string[] = [];

  logs.push(`[Goal] ${input.goal}`);
  if (input.inputs) {
    logs.push(`[Inputs] ${JSON.stringify(Object.keys(input.inputs))}`);
  }

  // Get primary webContents (active BrowserView or mainWindow)
  const wc = getActiveWebContents();
  if (!wc) {
    return {
      execution_id: executionId,
      status: 'failed',
      goal_status: 'failed',
      steps: [],
      duration: Date.now() - startTime,
      artifacts: { screenshots: [], logs: ['No active window/tab to automate'] },
      error: 'No active BrowserView or window available'
    };
  }

  // Map goal to actions
  const actions = mapGoalToActions(input.goal, input.inputs);
  log.info(`[AutoBrowse] Mapped goal to ${actions.length} actions`);
  logs.push(`[Mapped] ${actions.length} actions`);

  const maxSteps = input.constraints?.max_steps || 50;
  const timeout = input.constraints?.timeout_ms || 120000;

  // Execute each action using Electron APIs
  for (let i = 0; i < Math.min(actions.length, maxSteps); i++) {
    if (Date.now() - startTime > timeout) {
      logs.push(`[Timeout] Exceeded ${timeout}ms`);
      break;
    }

    const action = actions[i];
    logs.push(`[Step ${i + 1}/${actions.length}] ${action.type}: ${action.description}`);

    // Emit progress to renderer
    if (progressEmitter) {
      progressEmitter(i + 1, actions.length, action.description, 'running');
    }

    const result = await executeActionElectron(wc, action);
    steps.push(result);

    if (result.type === 'screenshot' && result.extractedValue) {
      screenshots.push(result.extractedValue);
    }

    if (!result.success) {
      logs.push(`[Step ${i + 1}] Failed: ${result.error}`);
    }

    // Emit progress done/failed
    if (progressEmitter) {
      progressEmitter(i + 1, actions.length, action.description, result.success ? 'done' : 'failed');
    }

    // Brief pause between actions
    if (i < actions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  const successCount = steps.filter(s => s.success).length;
  const failCount = steps.filter(s => !s.success).length;

  let goalStatus: 'success' | 'failed' | 'uncertain';
  if (failCount === 0) {
    goalStatus = 'success';
  } else if (successCount === 0) {
    goalStatus = 'failed';
  } else {
    goalStatus = 'uncertain';
  }

  logs.push(`[Result] ${goalStatus}: ${successCount} succeeded, ${failCount} failed`);
  log.info(`[AutoBrowse] Goal result: ${goalStatus}`);

  return {
    execution_id: executionId,
    status: goalStatus === 'failed' ? 'failed' : 'completed',
    goal_status: goalStatus,
    steps,
    duration: Date.now() - startTime,
    artifacts: { screenshots, logs },
  };
}

export async function getBrowserState(): Promise<BrowserState> {
  if (!mainWindow) {
    return { url: '', title: '', tabs: [] };
  }

  const activeTab = electronTabs.find(t => t.id === activeTabId);
  const url = activeTab?.view?.webContents?.getURL() || mainWindow.webContents.getURL();
  const title = activeTab?.view?.webContents?.getTitle() || mainWindow.webContents.getTitle();

  return {
    url,
    title,
    tabs: electronTabs.map(t => ({
      id: t.id,
      url: t.view?.webContents?.getURL() || t.url,
      title: t.view?.webContents?.getTitle() || t.name,
    }))
  };
}

export async function captureScreenshot(): Promise<string> {
  try {
    const activeTab = electronTabs.find(t => t.id === activeTabId);
    const wc = activeTab?.view?.webContents || mainWindow?.webContents;
    if (wc) {
      const image = await wc.capturePage();
      return `data:image/png;base64,${image.toPNG().toString('base64')}`;
    }
    return '';
  } catch (error) {
    log.error('[AutoBrowse] Screenshot failed:', error);
    return '';
  }
}

export function getEngine(): any {
  return cdpBrowser;
}

export function isAutoBrowseInitialized(): boolean {
  return isInitialized;
}

export async function disposeAutoBrowse(): Promise<void> {
  try {
    if (cdpBrowser) {
      await cdpBrowser.close();
    }
  } catch (error) {
    log.error('[AutoBrowse] Error disposing:', error);
  }

  cdpBrowser = null;
  cdpContext = null;
  isInitialized = false;
  mainWindow = null;
  progressEmitter = null;
  log.info('[AutoBrowse] Disposed');
}
