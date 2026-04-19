/**
 * AutoBrowse Bridge - KELEDON Browser integration with AutoBrowse engine
 * v0.1.18 - Electron API-first automation
 *
 * Controls the active BrowserView using Electron APIs directly.
 * Playwright CDP is kept as optional fallback only.
 *
 * Flow: Renderer → IPC → executeGoal() → BrowserView webContents → DOM
 */

import log from 'electron-log';
import { BrowserWindow, BrowserView, ipcRenderer } from 'electron';
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
  type: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover' | 'wait_for' | 'submit';
  selector?: string;
  value?: string;
  url?: string;
  description: string;
  timeout?: number;
  direction?: string;
}

let isInitialized = false;
let mainWindow: BrowserWindow | null = null;
let cdpBrowser: Browser | null = null;
let cdpContext: BrowserContext | null = null;
let electronTabs: { id: string; name: string; url: string; view: BrowserView | null }[] = [];
let activeTabId: string = 'home';
const CDP_PORT = parseInt(process.env.KELEDON_CDP_PORT || '9222', 10);

// ==================== Progress Reporting ====================

function emitProgress(step: number, total: number, action: string, status: 'running' | 'done' | 'failed', description: string) {
  try {
    ipcRenderer.send('executor:progress', { step, total, action, status, description });
  } catch { /* ignore */ }
}

// ==================== Tab Management ====================

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

export function setTabs(tabList: typeof electronTabs, activeId: string) {
  electronTabs = tabList;
  activeTabId = activeId;
}

// ==================== CDP Connection (OPTIONAL FALLBACK) ====================

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
            try {
              const activeHost = new URL(activeUrl).hostname;
              const pageHost = new URL(pageUrl).hostname;
              if (activeHost && pageHost && activeHost === pageHost) {
                log.info(`[AutoBrowse] Matched active tab page: ${pageUrl}`);
                return { browser: cdpBrowser, page };
              }
            } catch { /* URL parse error, skip */ }
          }
        } catch { /* page.url() failed, skip */ }
      }
    }

    for (let i = pages.length - 1; i >= 0; i--) {
      try {
        const pageUrl = pages[i].url();
        if (pageUrl && pageUrl !== 'about:blank' && pageUrl !== '') {
          log.info(`[AutoBrowse] Using fallback page: ${pageUrl}`);
          return { browser: cdpBrowser, page: pages[i] };
        }
      } catch { /* skip */ }
    }

    if (pages.length > 0) {
      log.info(`[AutoBrowse] Using first page: ${pages[0].url()}`);
      return { browser: cdpBrowser, page: pages[0] };
    }

    log.warn('[AutoBrowse] No pages available via CDP');
    return null;
  } catch (error) {
    log.error('[AutoBrowse] CDP connection failed:', error);
    cdpBrowser = null;
    cdpContext = null;
    return null;
  }
}

// ==================== Goal Mapper ====================

function mapGoalToActions(goal: string, inputs?: Record<string, unknown>): GoalAction[] {
  const actions: GoalAction[] = [];
  const goalLower = goal.toLowerCase();

  // If inputs contain a URL, navigate first
  const url = (inputs?.url as string) || (inputs?.targetUrl as string);
  if (url) {
    actions.push({ type: 'navigate', url, description: `Navigate to ${url}` });
  }

  // Navigate goals
  if (goalLower.includes('navigate to') || goalLower.includes('go to') || goalLower.includes('open')) {
    const urlMatch = goal.match(/(?:navigate to|go to|open)\s+(https?:\/\/[^\s]+|[^\s]+\.[^\s]+)/i);
    if (urlMatch && !url) {
      let targetUrl = urlMatch[1];
      if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
      actions.push({ type: 'navigate', url: targetUrl, description: `Navigate to ${targetUrl}` });
    }
  }

  // Login goals
  if (goalLower.includes('login') || goalLower.includes('sign in') || goalLower.includes('log in')) {
    const username = (inputs?.username as string) || (inputs?.email as string) || '';
    const password = (inputs?.password as string) || '';

    if (username) {
      actions.push({ type: 'fill', selector: 'input[type="email"], input[name="user"], input[name="email"], input[id="user"], input[id="email"], input[autocomplete="username"]', value: username, description: `Fill username: ${username}` });
      actions.push({ type: 'press_key', selector: 'input[type="email"], input[name="user"], input[name="email"]', value: 'Tab', description: 'Move to password field' });
    }
    if (password) {
      actions.push({ type: 'fill', selector: 'input[type="password"], input[name="pass"], input[id="pass"]', value: password, description: 'Fill password' });
    }
    actions.push({ type: 'click', selector: 'button[type="submit"], input[type="submit"]', description: 'Click submit/login button' });
    actions.push({ type: 'wait', value: '3000', description: 'Wait for page to load after login' });
  }

  // Click goals
  if (goalLower.includes('click') || goalLower.includes('press button')) {
    const clickMatch = goal.match(/(?:click|press)\s+(?:on\s+)?["']?([^"']+)["']?/i);
    if (clickMatch) {
      const text = clickMatch[1].trim();
      // Try text match first
      actions.push({ type: 'click', selector: `button:has-text("${text}"), a:has-text("${text}"), [has-text("${text}")]`, description: `Click "${text}"` });
    }
  }

  // Fill / type goals
  if (goalLower.includes('fill') || goalLower.includes('type') || goalLower.includes('enter')) {
    const fillMatch = goal.match(/(?:fill|type|enter)\s+["']?([^"']+)["']?\s+(?:in|into|on)\s+["']?([^"']+)["']?/i);
    if (fillMatch) {
      actions.push({ type: 'fill', selector: fillMatch[2], value: fillMatch[1], description: `Fill "${fillMatch[1]}" into ${fillMatch[2]}` });
    }
  }

  // Search goals
  if (goalLower.includes('search') || goalLower.includes('find')) {
    const searchMatch = goal.match(/(?:search|find)\s+(?:for\s+)?["']?([^"']+)["']?/i);
    if (searchMatch) {
      const query = searchMatch[1];
      if (!url && !goalLower.includes('navigate to')) {
        actions.push({ type: 'navigate', url: 'https://www.google.com', description: 'Navigate to Google' });
      }
      actions.push({ type: 'fill', selector: 'input[name="q"], input[type="search"], textarea[name="q"]', value: query, description: `Type search: "${query}"` });
      actions.push({ type: 'press_key', selector: 'input[name="q"], input[type="search"]', value: 'Enter', description: 'Press Enter to search' });
      actions.push({ type: 'wait', value: '2000', description: 'Wait for search results' });
    }
  }

  // Extract / scrape goals
  if (goalLower.includes('extract') || goalLower.includes('scrape') || goalLower.includes('get text')) {
    actions.push({ type: 'wait', value: '1000', description: 'Wait for page to be ready' });
    actions.push({ type: 'extract', description: 'Extract page content' });
  }

  // Scroll goals
  if (goalLower.includes('scroll down') || goalLower.includes('scroll up') || (goalLower.includes('scroll') && !goalLower.includes('scrollbar'))) {
    const direction = goalLower.includes('up') ? 'up' : 'down';
    const amountMatch = goal.match(/scroll\s+(?:by\s+)?(\d+)/i);
    const amount = amountMatch ? amountMatch[1] : '500';
    actions.push({ type: 'scroll', direction, value: amount, description: `Scroll ${direction}` });
  }

  // Hover goals
  if (goalLower.includes('hover') || goalLower.includes('mouse over')) {
    const hoverMatch = goal.match(/(?:hover|mouse over)\s+(?:on\s+)?["']?([^"']+)["']?/i);
    if (hoverMatch) {
      actions.push({ type: 'hover', selector: hoverMatch[1], description: `Hover over ${hoverMatch[1]}` });
    }
  }

  // Submit / press button goals
  if ((goalLower.includes('press') || goalLower.includes('click')) && (goalLower.includes('button') || goalLower.includes('submit'))) {
    const btnMatch = goal.match(/(?:press|click)\s+(?:the\s+)?["']?([^"']+)?["']?\s*(?:button|submit)?/i);
    if (btnMatch?.[1] && btnMatch[1].length > 0 && btnMatch[1].length < 50) {
      const text = btnMatch[1].trim();
      actions.push({ type: 'click', selector: `button:has-text("${text}"), input[type="submit"]:has-text("${text}")`, description: `Click button: ${text}` });
    } else {
      actions.push({ type: 'submit', description: 'Submit form' });
    }
  }

  // Wait goals
  if (goalLower.includes('wait')) {
    const waitMatch = goal.match(/wait\s+(?:for\s+)?(\d+)\s*(seconds?|ms|s|m)?/i);
    if (waitMatch) {
      let ms = parseInt(waitMatch[1], 10);
      if (waitMatch[2]?.match(/second|sec/i)) ms *= 1000;
      if (waitMatch[2] === 'm' && !waitMatch[2]?.match(/ms/i)) ms *= 60000;
      actions.push({ type: 'wait', value: String(Math.min(ms, 30000)), description: `Wait ${ms}ms` });
    } else if (goalLower === 'wait' || goalLower === 'wait a bit') {
      actions.push({ type: 'wait', value: '2000', description: 'Wait 2s' });
    }
  }

  // Refresh / reload goals
  if (goalLower.includes('reload') || goalLower === 'refresh page') {
    actions.push({ type: 'wait', value: '500', description: 'Reload page' });
  }

  // If no actions were mapped, try as a URL or search
  if (actions.length === 0) {
    if (goal.match(/^https?:\/\//i) || goal.match(/\.[a-z]{2,}$/i)) {
      const targetUrl = goal.startsWith('http') ? goal : 'https://' + goal;
      actions.push({ type: 'navigate', url: targetUrl, description: `Navigate to ${targetUrl}` });
    } else {
      actions.push({ type: 'navigate', url: `https://www.google.com/search?q=${encodeURIComponent(goal)}`, description: `Search for: "${goal}"` });
    }
  }

  // Always screenshot at end
  actions.push({ type: 'screenshot', description: 'Capture final state' });

  return actions;
}

// ==================== Action Execution (Electron APIs) ====================

async function executeAction(view: BrowserView, action: GoalAction): Promise<StepResult> {
  const startTime = Date.now();
  const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const wc = view.webContents;

  try {
    switch (action.type) {
      case 'navigate': {
        if (!action.url) throw new Error('No URL provided for navigate');
        await new Promise<void>((resolve, reject) => {
          const done = () => { cleanup(); resolve(); };
          const fail = (_e: any, errCode: number, errMsg: string) => { cleanup(); reject(new Error(`${errMsg} (${errCode})`)); };
          const cleanup = () => {
            wc.removeListener('did-finish-load', done);
            wc.removeListener('did-fail-load', fail);
          };
          wc.once('did-finish-load', done);
          wc.once('did-fail-load', fail);
          wc.loadURL(action.url!);
        });
        return { id, type: 'navigate', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'click': {
        if (!action.selector) throw new Error('No selector for click');
        const selectors = action.selector.split(',').map(s => s.trim());
        let clicked = false;
        for (const sel of selectors) {
          try {
            const result = await wc.executeJavaScript(`
              (function() {
                var sel = ${JSON.stringify(sel)};
                var el = document.querySelector(sel);
                if (!el) return { success: false, error: 'not found' };
                if (typeof el.click === 'function') { el.click(); return { success: true }; }
                // Try text content match
                var all = document.querySelectorAll('button, a, [role="button"]');
                for (var i = 0; i < all.length; i++) {
                  if (all[i].textContent.trim() === sel.replace(/^has-text\\(["'](.+)["']\\)$/, '$1')) {
                    all[i].click();
                    return { success: true };
                  }
                }
                return { success: false, error: 'not clickable' };
              })()
            `);
            if (result?.success) { clicked = true; break; }
          } catch { continue; }
        }
        if (!clicked) throw new Error(`Could not click: ${action.selector}`);
        return { id, type: 'click', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'fill': {
        if (!action.selector) throw new Error('No selector for fill');
        if (action.value === undefined) throw new Error('No value for fill');
        const selectors = action.selector.split(',').map(s => s.trim());
        let filled = false;
        for (const sel of selectors) {
          try {
            const result = await wc.executeJavaScript(`
              (function() {
                var sel = ${JSON.stringify(sel)};
                var val = ${JSON.stringify(action.value)};
                var el = document.querySelector(sel);
                if (!el) return { success: false, error: 'not found' };
                el.focus();
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true, value: el.value };
              })()
            `);
            if (result?.success) { filled = true; break; }
          } catch { continue; }
        }
        if (!filled) throw new Error(`Could not fill: ${action.selector}`);
        return { id, type: 'fill', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'press_key': {
        if (!action.selector) {
          await wc.executeJavaScript(`
            if (document.activeElement) {
              var evt = new KeyboardEvent('keydown', { key: ${JSON.stringify(action.value || 'Enter')}, bubbles: true });
              document.activeElement.dispatchEvent(evt);
              var evt2 = new KeyboardEvent('keyup', { key: ${JSON.stringify(action.value || 'Enter')}, bubbles: true });
              document.activeElement.dispatchEvent(evt2);
            }
          `).catch(() => {});
        } else {
          const selectors = action.selector.split(',').map(s => s.trim());
          for (const sel of selectors) {
            try {
              const result = await wc.executeJavaScript(`
                (function() {
                  var sel = ${JSON.stringify(sel)};
                  var el = document.querySelector(sel);
                  if (!el) return false;
                  if (typeof el.press === 'function') { el.press(${JSON.stringify(action.value || 'Enter')}); return true; }
                  var evt = new KeyboardEvent('keydown', { key: ${JSON.stringify(action.value || 'Enter')}, bubbles: true });
                  el.dispatchEvent(evt);
                  return true;
                })()
              `);
              if (result) break;
            } catch { continue; }
          }
        }
        return { id, type: 'press_key', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'select': {
        if (!action.selector) throw new Error('No selector for select');
        const result = await wc.executeJavaScript(`
          (function() {
            var sel = ${JSON.stringify(action.selector)};
            var val = ${JSON.stringify(action.value || '')};
            var el = document.querySelector(sel);
            if (!el) return { success: false, error: 'not found' };
            if (el.tagName !== 'SELECT') return { success: false, error: 'not a select' };
            el.value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          })()
        `);
        if (!result?.success) throw new Error(result?.error || 'Select failed');
        return { id, type: 'select', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'hover': {
        if (!action.selector) throw new Error('No selector for hover');
        await wc.executeJavaScript(`
          (function() {
            var sel = ${JSON.stringify(action.selector)};
            var el = document.querySelector(sel);
            if (!el) return;
            var rect = el.getBoundingClientRect();
            var evt = new MouseEvent('mouseover', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
            el.dispatchEvent(evt);
          })()
        `);
        return { id, type: 'hover', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'scroll': {
        const direction = action.direction || 'down';
        const amount = action.value || '500';
        await wc.executeJavaScript(`window.scrollBy(0, ${direction === 'up' ? '-' : ''}${amount});`);
        return { id, type: 'scroll', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'wait': {
        const ms = parseInt(action.value || '2000', 10);
        await new Promise(r => setTimeout(r, Math.min(ms, 30000)));
        return { id, type: 'wait', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'screenshot': {
        const image = await wc.capturePage();
        const base64 = image.toDataURL();
        return { id, type: 'screenshot', description: action.description, success: true, duration: Date.now() - startTime, extractedValue: base64 };
      }

      case 'extract': {
        let value = '';
        if (action.selector) {
          const result = await wc.executeJavaScript(`
            (function() {
              var sel = ${JSON.stringify(action.selector)};
              var el = document.querySelector(sel);
              return el ? (el.innerText || el.textContent || '') : '';
            })()
          `);
          value = result || '';
        }
        if (!value) {
          value = await wc.executeJavaScript(`(document.body ? document.body.innerText || document.body.textContent : '')?.substring(0, 5000) || ''`);
        }
        return { id, type: 'extract', description: action.description, success: true, duration: Date.now() - startTime, extractedValue: value };
      }

      case 'wait_for': {
        if (!action.selector) throw new Error('No selector for wait_for');
        const timeout = action.timeout || 15000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
          try {
            const exists = await wc.executeJavaScript(`!!document.querySelector(${JSON.stringify(action.selector)})`);
            if (exists) return { id, type: 'wait_for', description: action.description, success: true, duration: Date.now() - startTime };
          } catch { /* ignore */ }
          await new Promise(r => setTimeout(r, 200));
        }
        return { id, type: 'wait_for', description: action.description, success: false, error: 'Timeout waiting for selector', duration: Date.now() - startTime };
      }

      case 'submit': {
        await wc.executeJavaScript(`
          (function() {
            var form = document.querySelector('form');
            if (form) form.submit();
            else {
              var btn = document.querySelector('button[type="submit"], input[type="submit"]');
              if (btn) btn.click();
            }
          })()
        `);
        return { id, type: 'submit', description: action.description, success: true, duration: Date.now() - startTime };
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    return { id, type: action.type, description: action.description, success: false, duration: Date.now() - startTime, error: String(error) };
  }
}

// ==================== Public API ====================

export async function initializeAutoBrowse(electronSession: any): Promise<void> {
  if (isInitialized) {
    log.info('[AutoBrowse] Already initialized');
    return;
  }

  log.info('[AutoBrowse] Initializing...');
  log.info(`[AutoBrowse] CDP port: ${CDP_PORT}`);

  // Pre-connect CDP in background (optional - not required for Electron API mode)
  try {
    const connection = await connectCDP();
    if (!connection) {
      log.warn('[AutoBrowse] CDP connection failed on init (non-fatal - using Electron APIs)');
    } else {
      log.info('[AutoBrowse] CDP pre-connected (available as fallback)');
    }
  } catch (error) {
    log.warn('[AutoBrowse] CDP init error (non-fatal):', error);
  }

  isInitialized = true;
  log.info('[AutoBrowse] Initialized successfully (Electron API mode)');
}

export async function executeGoal(input: BridgeGoalInput): Promise<BridgeExecutionResult> {
  if (!isInitialized) {
    throw new Error('AutoBrowse not initialized');
  }

  const activeTab = electronTabs.find(t => t.id === activeTabId);
  if (!activeTab?.view) {
    return {
      execution_id: input.execution_id || `exec-${Date.now()}`,
      status: 'failed',
      goal_status: 'failed',
      steps: [],
      duration: 0,
      artifacts: { screenshots: [], logs: [] },
      error: 'No active BrowserView'
    };
  }

  const view = activeTab.view;
  const startTime = Date.now();
  const executionId = input.execution_id || `exec-${Date.now()}`;
  const steps: StepResult[] = [];
  const screenshots: string[] = [];
  const logs: string[] = [];

  logs.push(`[Goal] ${input.goal}`);
  if (input.inputs) logs.push(`[Inputs] ${JSON.stringify(Object.keys(input.inputs))}`);

  try {
    // Navigate first if URL in inputs (BEFORE mapped actions)
    const url = (input.inputs?.url as string) || (input.inputs?.targetUrl as string);
    if (url) {
      logs.push(`[Step 1] navigate: ${url}`);
      emitProgress(1, 999, 'navigate', 'running', `Navigate to ${url}`);
      const result = await executeAction(view, { type: 'navigate', url, description: `Navigate to ${url}` });
      steps.push(result);
      if (result.extractedValue) screenshots.push(result.extractedValue);
      emitProgress(1, 999, 'navigate', result.success ? 'done' : 'failed', result.description);
      await new Promise(r => setTimeout(r, 500));
    }

    // Map goal to actions
    const actions = mapGoalToActions(input.goal, input.inputs);
    logs.push(`[Actions] ${actions.length} steps mapped from goal`);

    const maxSteps = input.constraints?.max_steps || 50;
    const timeout = input.constraints?.timeout_ms || 120000;
    const start = Date.now();
    let stepNum = url ? 1 : 0;
    const totalSteps = actions.length + (url ? 1 : 0);

    for (let i = 0; i < Math.min(actions.length, maxSteps); i++) {
      if (Date.now() - start > timeout) {
        logs.push('[Timeout] Exceeded timeout');
        break;
      }

      const action = actions[i];
      stepNum++;
      logs.push(`[Step ${stepNum}] ${action.type}: ${action.description}`);
      emitProgress(stepNum, totalSteps, action.type, 'running', action.description);

      const result = await executeAction(view, action);
      steps.push(result);

      if (result.extractedValue && result.type === 'screenshot') {
        screenshots.push(result.extractedValue);
      }
      if (!result.success) {
        logs.push(`[Step ${stepNum}] Failed: ${result.error}`);
      }
      emitProgress(stepNum, totalSteps, result.type, result.success ? 'done' : 'failed', result.description);

      await new Promise(r => setTimeout(r, 300));
    }

    const successCount = steps.filter(s => s.success).length;
    const failCount = steps.filter(s => !s.success).length;
    const goalStatus: 'success' | 'failed' | 'uncertain' = failCount === 0 ? 'success' : successCount === 0 ? 'failed' : 'uncertain';
    logs.push(`[Result] ${goalStatus}: ${successCount} ok, ${failCount} failed`);

    return {
      execution_id: executionId,
      status: goalStatus === 'failed' ? 'failed' : 'completed',
      goal_status: goalStatus,
      steps,
      duration: Date.now() - startTime,
      artifacts: { screenshots, logs },
    };
  } catch (error) {
    logs.push(`[Error] ${error}`);
    return {
      execution_id: executionId,
      status: 'failed',
      goal_status: 'failed',
      steps,
      duration: Date.now() - startTime,
      artifacts: { screenshots, logs },
      error: String(error)
    };
  }
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
  const activeTab = electronTabs.find(t => t.id === activeTabId);
  if (activeTab?.view) {
    try {
      const image = await activeTab.view.webContents.capturePage();
      return image.toDataURL();
    } catch (error) {
      log.error('[AutoBrowse] Screenshot failed:', error);
    }
  }
  if (mainWindow) {
    try {
      const image = await mainWindow.webContents.capturePage();
      return image.toDataURL();
    } catch { /* ignore */ }
  }
  return '';
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
    log.error('[AutoBrowse] Error disposing CDP browser:', error);
  }

  cdpBrowser = null;
  cdpContext = null;
  isInitialized = false;
  mainWindow = null;
  log.info('[AutoBrowse] Disposed');
}
