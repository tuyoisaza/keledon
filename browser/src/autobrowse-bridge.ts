/**
 * AutoBrowse Bridge - KELEDON Browser integration with AutoBrowse engine
 * v0.1.16 - Real Playwright+CDP integration
 *
 * Connects to Electron's Chromium via CDP and uses Playwright
 * to automate the active BrowserView tab.
 *
 * Flow: Renderer → IPC → executeGoal() → CDP → Playwright → BrowserView
 */

import log from 'electron-log';
import { BrowserWindow, BrowserView } from 'electron';
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
const CDP_PORT = parseInt(process.env.KELEDON_CDP_PORT || '9222', 10);

// ==================== Tab Management ====================

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

export function setTabs(tabList: typeof electronTabs, activeId: string) {
  electronTabs = tabList;
  activeTabId = activeId;
}

// ==================== CDP Connection ====================

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

    // Find the page matching the active BrowserView
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

    // Fallback: use last non-blank page
    for (let i = pages.length - 1; i >= 0; i--) {
      try {
        const pageUrl = pages[i].url();
        if (pageUrl && pageUrl !== 'about:blank' && pageUrl !== '') {
          log.info(`[AutoBrowse] Using fallback page: ${pageUrl}`);
          return { browser: cdpBrowser, page: pages[i] };
        }
      } catch { /* skip */ }
    }

    // Last resort: first page
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
      actions.push({ type: 'fill', selector: 'input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"], input[id*="email"], input[autocomplete="username"]', value: username, description: `Fill username: ${username}` });
      actions.push({ type: 'press_key', selector: 'input[type="email"], input[name*="user"], input[name*="email"]', value: 'Tab', description: 'Move to password field' });
    }
    if (password) {
      actions.push({ type: 'fill', selector: 'input[type="password"], input[name*="pass"], input[id*="pass"]', value: password, description: 'Fill password' });
    }
    actions.push({ type: 'click', selector: 'button[type="submit"], input[type="submit"], button:has-text("sign in"), button:has-text("log in"), button:has-text("login")', description: 'Click submit/login button' });
    actions.push({ type: 'wait', description: 'Wait for page to load after login' });
  }

  // Click goals
  if (goalLower.includes('click') || goalLower.includes('press button')) {
    const clickMatch = goal.match(/(?:click|press)\s+(?:on\s+)?["']?([^"']+)["']?/i);
    if (clickMatch) {
      actions.push({ type: 'click', selector: `text="${clickMatch[1]}"`, description: `Click "${clickMatch[1]}"` });
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
      actions.push({ type: 'wait', description: 'Wait for search results' });
    }
  }

  // Extract / scrape goals
  if (goalLower.includes('extract') || goalLower.includes('scrape') || goalLower.includes('get text')) {
    actions.push({ type: 'wait', description: 'Wait for page to be ready' });
    actions.push({ type: 'extract', description: 'Extract page content' });
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

// ==================== Action Execution ====================

async function executeAction(page: Page, action: GoalAction): Promise<StepResult> {
  const startTime = Date.now();
  const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    switch (action.type) {
      case 'navigate': {
        if (!action.url) throw new Error('No URL provided for navigate');
        const activeTab = electronTabs.find(t => t.id === activeTabId);
        if (activeTab?.view) {
          activeTab.view.webContents.loadURL(action.url);
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        } else {
          await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        }
        return { id, type: 'navigate', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'click': {
        if (!action.selector) throw new Error('No selector for click');
        const selectors = action.selector.split(',').map(s => s.trim());
        for (const sel of selectors) {
          try {
            const locator = page.locator(sel).first();
            await locator.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
            await locator.click({ timeout: 5000 });
            return { id, type: 'click', description: action.description, success: true, duration: Date.now() - startTime };
          } catch { continue; }
        }
        throw new Error(`Could not click any selector: ${action.selector}`);
      }

      case 'fill': {
        if (!action.selector) throw new Error('No selector for fill');
        const selectors = action.selector.split(',').map(s => s.trim());
        for (const sel of selectors) {
          try {
            const locator = page.locator(sel).first();
            await locator.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
            await locator.fill(action.value || '');
            return { id, type: 'fill', description: action.description, success: true, duration: Date.now() - startTime };
          } catch { continue; }
        }
        throw new Error(`Could not fill any selector: ${action.selector}`);
      }

      case 'press_key': {
        if (!action.selector) {
          await page.keyboard.press(action.value || 'Enter');
          return { id, type: 'press_key', description: action.description, success: true, duration: Date.now() - startTime };
        }
        const selectors = action.selector.split(',').map(s => s.trim());
        for (const sel of selectors) {
          try {
            await page.locator(sel).first().press(action.value || 'Enter', { timeout: 3000 });
            return { id, type: 'press_key', description: action.description, success: true, duration: Date.now() - startTime };
          } catch { continue; }
        }
        await page.keyboard.press(action.value || 'Enter');
        return { id, type: 'press_key', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'select': {
        if (!action.selector) throw new Error('No selector for select');
        await page.selectOption(action.selector, action.value || '');
        return { id, type: 'select', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'hover': {
        if (!action.selector) throw new Error('No selector for hover');
        await page.hover(action.selector);
        return { id, type: 'hover', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'wait': {
        await page.waitForTimeout(2000);
        return { id, type: 'wait', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'screenshot': {
        const screenshot = await page.screenshot({ type: 'png' });
        const screenshotBase64 = screenshot.toString('base64');
        return { id, type: 'screenshot', description: action.description, success: true, duration: Date.now() - startTime, extractedValue: `data:image/png;base64,${screenshotBase64}` };
      }

      case 'extract': {
        let value = '';
        if (action.selector) {
          const selectors = action.selector.split(',').map(s => s.trim());
          for (const sel of selectors) {
            try {
              value = await page.locator(sel).first().textContent({ timeout: 3000 }) || '';
              if (value) break;
            } catch { continue; }
          }
        }
        if (!value) {
          value = await page.evaluate(() => document.body?.innerText?.substring(0, 5000) || '');
        }
        return { id, type: 'extract', description: action.description, success: true, duration: Date.now() - startTime, extractedValue: value };
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

  log.info('[AutoBrowse] Initializing with CDP...');
  log.info(`[AutoBrowse] CDP port: ${CDP_PORT}`);

  try {
    const connection = await connectCDP();
    if (!connection) {
      log.warn('[AutoBrowse] CDP connection failed on init, will retry on first goal execution');
    }

    isInitialized = true;
    log.info('[AutoBrowse] Initialized successfully (CDP mode)');
  } catch (error) {
    log.error('[AutoBrowse] Initialization failed:', error);
    // Mark as initialized anyway - we retry CDP on each goal
    isInitialized = true;
    log.info('[AutoBrowse] Marked as initialized (CDP will retry on goal execution)');
  }
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

  try {
    // Connect or reconnect to CDP
    const connection = await connectCDP();
    if (!connection) {
      return {
        execution_id: executionId,
        status: 'failed',
        goal_status: 'failed',
        steps: [],
        duration: Date.now() - startTime,
        artifacts: { screenshots: [], logs: ['CDP connection failed'] },
        error: 'Could not connect to browser via CDP. Is the debug port enabled?'
      };
    }

    const { page } = connection;

    // Navigate the active BrowserView if a URL was specified
    const activeTab = electronTabs.find(t => t.id === activeTabId);
    if (activeTab?.view && input.inputs?.url) {
      const url = input.inputs.url as string;
      log.info(`[AutoBrowse] Navigating BrowserView to ${url}`);
      activeTab.view.webContents.loadURL(url);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Map goal to actions
    const actions = mapGoalToActions(input.goal, input.inputs);
    log.info(`[AutoBrowse] Mapped goal to ${actions.length} actions`);

    const maxSteps = input.constraints?.max_steps || 50;
    const timeout = input.constraints?.timeout_ms || 120000;

    // Execute each action
    for (let i = 0; i < Math.min(actions.length, maxSteps); i++) {
      if (Date.now() - startTime > timeout) {
        logs.push(`[Timeout] Exceeded ${timeout}ms timeout`);
        break;
      }

      const action = actions[i];
      logs.push(`[Step ${i + 1}] ${action.type}: ${action.description}`);

      const result = await executeAction(page, action);
      steps.push(result);

      if (result.extractedValue && result.type === 'screenshot') {
        screenshots.push(result.extractedValue);
      }

      if (!result.success) {
        logs.push(`[Step ${i + 1}] Failed: ${result.error}`);
      }

      // Brief pause between actions for page stability
      await new Promise(resolve => setTimeout(resolve, 300));
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

    return {
      execution_id: executionId,
      status: goalStatus === 'failed' ? 'failed' : 'completed',
      goal_status: goalStatus,
      steps,
      duration: Date.now() - startTime,
      artifacts: { screenshots, logs },
    };
  } catch (error) {
    log.error('[AutoBrowse] Goal execution failed:', error);
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
  try {
    const connection = await connectCDP();
    if (!connection) {
      // Fallback to Electron screenshot
      if (mainWindow) {
        const image = await mainWindow.webContents.capturePage();
        return image.toDataURL();
      }
      return '';
    }

    const screenshot = await connection.page.screenshot({ type: 'png' });
    return `data:image/png;base64,${screenshot.toString('base64')}`;
  } catch (error) {
    log.error('[AutoBrowse] Screenshot failed:', error);
    // Fallback to Electron screenshot
    if (mainWindow) {
      try {
        const image = await mainWindow.webContents.capturePage();
        return image.toDataURL();
      } catch { return ''; }
    }
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
      // For CDP-connected browsers, close() disconnects without shutting down the browser
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