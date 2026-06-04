/**
 * AutoBrowse Bridge - KELEDON Browser integration with AutoBrowse engine
 * v0.3.80 - executeAction split into autobrowse-actions.ts
 */

import log from 'electron-log';
import { BrowserWindow, BrowserView, ipcRenderer } from 'electron';
import { planGoalActions, planGoalActionsWithAI } from './goal-planner';
import type { GoalPlannerAction as GoalAction } from './goal-planner';
import type { RpaStep } from './rpa-executor';
import { runtimeStatus } from './runtime-state';
import { executeAction } from './autobrowse-actions';
import type { StepResult } from './autobrowse-actions';
import { connectCDP, disconnectCDP, getCdpBrowser, getCdpContext, getCdpPort } from './autobrowse-cdp';
import { mapGoalToActions, callPlannerAPI } from './autobrowse-planner';
import type { BridgeGoalInput, BridgeExecutionResult, BrowserState } from './autobrowse-types';

let isInitialized = false;
let mainWindow: BrowserWindow | null = null;
let electronTabs: { id: string; name: string; url: string; view: BrowserView | null }[] = [];
let activeTabId: string = 'home';

// ==================== Abort Mechanism ====================

let _goalAborted = false;

/**
 * Abort the currently executing goal or step sequence.
 * The running loop checks _goalAborted between iterations and exits cleanly.
 */
export function abortCurrentExecution(): void {
  _goalAborted = true;
}

function resetAbortFlag(): void {
  _goalAborted = false;
}

function isAborted(): boolean {
  return _goalAborted;
}

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

// ==================== Goal Mapper ====================
// ==================== Action Execution (Electron APIs) ====================
// executeAction MOVED to autobrowse-actions.ts (v0.3.80)
// Implementation is import { executeAction } from './autobrowse-actions';
// Legacy code preserved below lines can be found in /browser/src/autobrowse-actions.ts
// ========================================================================

// ==================== Public API ====================

export async function initializeAutoBrowse(electronSession: any): Promise<void> {
  if (isInitialized) {
    log.info('[AutoBrowse] Already initialized');
    return;
  }

  log.info('[AutoBrowse] Initializing...');
  log.info(`[AutoBrowse] CDP port: ${getCdpPort()}`);

  // Pre-connect CDP in background (optional - not required for Electron API mode)
  try {
    const connection = await connectCDP(electronTabs, activeTabId);
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

/**
 * Extract visible page state from a BrowserView for AI planning context
 */
async function extractPageState(view: BrowserView): Promise<{ url: string; title: string; content: string }> {
  const url = view.webContents.getURL() || '';
  const title = view.webContents.getTitle() || '';
  try {
    const content = await view.webContents.executeJavaScript(`
      (() => {
        const MAX_LEN = 3000;
        let text = document.body?.innerText || '';
        if (!text) text = document.body?.textContent || '';
        text = text.replace(/\\s+/g, ' ').trim().slice(0, MAX_LEN);
        const inputs = document.querySelectorAll('input, button, select, textarea, a');
        const elements = Array.from(inputs).slice(0, 20).map(el => {
          const tag = el.tagName.toLowerCase();
          const type = el.getAttribute('type') || '';
          const name = el.getAttribute('name') || '';
          const id = el.getAttribute('id') || '';
          const placeholder = el.getAttribute('placeholder') || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const text = (el as HTMLElement).innerText?.slice(0, 40) || '';
          const href = el.getAttribute('href') || '';
          return [tag, type, name, id, placeholder, ariaLabel, text, href].filter(Boolean).join('|');
        }).join('\\n');
        return JSON.stringify({ text, elements });
      })()
    `).catch(() => '{}');
    const parsed = JSON.parse(content || '{}');
    const combined = [
      parsed.text ? `Content: ${parsed.text}` : '',
      parsed.elements ? `Interactive: ${parsed.elements}` : '',
    ].filter(Boolean).join('\\n').slice(0, 3000);
    return { url, title, content: combined || url };
  } catch {
    return { url, title, content: url };
  }
}

export async function executeGoal(input: BridgeGoalInput): Promise<BridgeExecutionResult> {
  resetAbortFlag();
  if (!isInitialized) {
    throw new Error('AutoBrowse not initialized');
  }
  if (!input?.goal || !String(input.goal).trim()) {
    return {
      execution_id: input?.execution_id || `exec-${Date.now()}`,
      status: 'failed',
      goal_status: 'failed',
      steps: [],
      duration: 0,
      artifacts: { screenshots: [], logs: [] },
      error: 'Goal is required'
    };
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
  let credentialSubmitted = false;

  logs.push(`[Goal] ${input.goal}`);
  if (input.inputs) logs.push(`[Inputs] ${JSON.stringify(Object.keys(input.inputs))}`);

  // v0.3.51: extract URL before planning so we can check if planner will handle navigation.
  const url = (input.inputs?.url as string) || (input.inputs?.targetUrl as string);
  const plannerInputs = url ? { ...(input.inputs || {}), url: undefined, targetUrl: undefined } : input.inputs;

  try {
    // Map goal to actions FIRST so we can check if the planner will handle navigation.
    // v0.3.51: avoids duplicate navigation when vendor URL matches planner's first step.
    const plannerResult = await planGoalActionsWithAI(
      input.goal,
      '',
      JSON.stringify({ url: '', title: '', content: '' }),
      runtimeStatus.cloudUrl,
      runtimeStatus.authToken || '',
    );
    const actions = plannerResult.steps;
    logs.push(`[Actions] ${actions.length} steps planned from goal (${plannerResult.source})`);

    // Only pre-navigate if the planner doesn't already produce a navigation as step 1.
    // Prevents wasted navigation (e.g., vendor URL = meet.google.com but planner navigates
    // to accounts.google.com for a "login to google" goal).
    const plannerFirstNav = actions.length > 0 && actions[0].type === 'navigate' && actions[0].url;
    const shouldPreNavigate = Boolean(url && !plannerFirstNav);
    if (url && !shouldPreNavigate && plannerFirstNav) {
      logs.push(`[Nav] Skipping pre-navigation — planner step 1 already navigates to ${plannerFirstNav}`);
    }

    if (shouldPreNavigate) {
      logs.push(`[Step 1] navigate: ${url}`);
      emitProgress(1, 999, 'navigate', 'running', `Navigate to ${url}`);
      const result = await executeAction(view, { type: 'navigate', url, description: `Navigate to ${url}` });
      steps.push(result);
      if (result.extractedValue) screenshots.push(result.extractedValue);
      emitProgress(1, 999, 'navigate', result.success ? 'done' : 'failed', result.description);
      await new Promise(r => setTimeout(r, 500));
    }

    const maxSteps = input.constraints?.max_steps || 50;
    const timeout = input.constraints?.timeout_ms || 120000;
    const start = Date.now();
    let stepNum = shouldPreNavigate ? 1 : 0;
    const totalSteps = actions.length + (shouldPreNavigate ? 1 : 0);

    for (let i = 0; i < Math.min(actions.length, maxSteps); i++) {
      if (isAborted()) {
        logs.push('[Abort] Goal execution cancelled by user');
        return {
          execution_id: executionId,
          status: 'aborted',
          goal_status: 'aborted',
          steps,
          duration: Date.now() - startTime,
          artifacts: { screenshots, logs },
        };
      }
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

      // v0.3.49+: after a password/submit action succeeds, treat subsequent failures as non-fatal.
      // The page likely navigated away from the login flow (login completed), so remaining
      // steps are cleanup that can't execute — not real failures.
      if (!result.success) {
        if (credentialSubmitted) {
          result.success = true;
          logs.push(`[Step ${stepNum}] Skipped (post-login): ${result.error || 'page already navigated'}`);
        } else {
          logs.push(`[Step ${stepNum}] Failed: ${result.error}`);
        }
      }

      // Track credential submission for post-login grace handling
      if (result.success && (
        action.type === 'submit' ||
        (action.description || '').toLowerCase().includes('password')
      )) {
        credentialSubmitted = true;
      }

      // v0.3.54+: post-login navigation recovery.
      // After the FINAL login submit succeeds, the OAuth/SSO redirect may leave
      // the browser on a different domain (myaccount.google.com, etc.) instead
      // of the target vendor URL. Navigate to the vendor URL so remaining
      // planner steps execute on the correct page.
      //
      // Triggers on:
      //   - Form submit actions (action.type === 'submit')
      //   - Post-password click actions (Google-style multi-screen login:
      //     password filled → credentialSubmitted=true, then next click = submit)
      //
      // Must fire AFTER the submit, not during password fill, so the login
      // session cookies are set before we navigate away. Vendor-agnostic.
      const isLoginSubmit = result.success && (
        action.type === 'submit' ||
        (credentialSubmitted && action.type === 'click')
      );
      if (isLoginSubmit && url) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const currentUrl = view.webContents.getURL() || '';
          let targetHost = '';
          let currentHost = '';
          try { targetHost = new URL(url).hostname; } catch {}
          try { currentHost = new URL(currentUrl).hostname; } catch {}
          if (targetHost && currentHost && currentHost !== targetHost) {
            logs.push(`[Nav] Post-login: ${currentHost} ≠ target ${targetHost}, navigating to ${url}`);
            await view.webContents.loadURL(url);
            await new Promise(r => setTimeout(r, 2000));
            steps.push({
              id: `postlogin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'navigate',
              description: 'Navigate back to vendor after login',
              success: true,
              duration: Date.now() - startTime,
            });
          } else if (targetHost && currentHost && currentHost === targetHost) {
            logs.push(`[Nav] Post-login: already on vendor domain ${currentHost}`);
          } else {
            logs.push(`[Nav] Post-login: no target URL configured, skipping recovery`);
          }
        } catch (navErr: any) {
          logs.push(`[Nav] Post-login navigation error: ${navErr.message || navErr}`);
        }
      }

      emitProgress(stepNum, totalSteps, result.type, result.success ? 'done' : 'failed', result.description);

      await new Promise(r => setTimeout(r, 300));
    }

    // ======================== AI Iterative Re-planning ========================
    // After heuristic steps complete, check if the goal needs more steps
    // by asking the cloud AI planner. Loop up to 3 times.
    const MAX_ITERATIONS = 3;
    let iteration = 0;
    let goalSatisfied = false;

    while (!goalSatisfied && iteration < MAX_ITERATIONS) {
      if (isAborted()) {
        logs.push('[Abort] Goal execution cancelled during AI re-planning');
        break;
      }
      if (Date.now() - start > timeout) {
        logs.push('[Timeout] Exceeded timeout during AI re-planning');
        break;
      }

      iteration++;
      logs.push(`[AI Iteration ${iteration}/${MAX_ITERATIONS}] Checking if more steps needed...`);

      // Extract current page state
      const state = await extractPageState(view);
      const previousDescription = steps
        .filter(s => s.success)
        .slice(-10)
        .map(s => s.description);

      // Call the AI planner to determine next steps
      const plan = await callPlannerAPI(
        input.goal,
        state.url,
        state.content,
        state.title,
        previousDescription
      );

      if (!plan.steps || plan.steps.length === 0) {
        // AI says no more steps needed — goal is complete
        logs.push(`[AI Iteration ${iteration}] AI: No more steps needed. ${plan.explanation || 'Goal complete.'}`);
        goalSatisfied = true;
        break;
      }

      logs.push(`[AI Iteration ${iteration}] AI suggested ${plan.steps.length} steps: ${plan.reasoning || plan.explanation || ''}`);

      // Execute the AI-generated steps
      for (const aiAction of plan.steps) {
        if (isAborted()) {
          logs.push('[Abort] AI step cancelled');
          break;
        }
        if (Date.now() - start > timeout) {
          logs.push('[Timeout] Exceeded timeout during AI step');
          break;
        }

        stepNum++;
        logs.push(`[Step ${stepNum}] AI ${aiAction.type}: ${aiAction.description}`);
        emitProgress(stepNum, 999, aiAction.type, 'running', aiAction.description);

        const result = await executeAction(view, aiAction);
        steps.push(result);

        if (result.extractedValue && result.type === 'screenshot') {
          screenshots.push(result.extractedValue);
        }

        if (!result.success) {
          logs.push(`[Step ${stepNum}] AI step failed: ${result.error}`);
        }

        emitProgress(stepNum, 999, result.type, result.success ? 'done' : 'failed', result.description);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Capture final screenshot
    try {
      const image = await view.webContents.capturePage();
      screenshots.push(image.toDataURL());
    } catch { /* ignore */ }

    const successCount = steps.filter(s => s.success).length;
    const failCount = steps.filter(s => !s.success).length;
    const goalStatus: 'success' | 'failed' | 'uncertain' = failCount === 0 ? 'success' : successCount === 0 ? 'failed' : 'uncertain';
    logs.push(`[Result] ${goalStatus}: ${successCount} ok, ${failCount} failed` + (iteration > 0 ? ` (AI iterations: ${iteration})` : ''));

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

// Maps cloud action names to internal GoalAction types
const ACTION_TYPE_MAP: Record<string, GoalAction['type']> = {
  fill_field: 'fill',
  type: 'fill',
  navigate: 'navigate',
  click: 'click',
  fill: 'fill',
  scroll: 'scroll',
  hover: 'hover',
  extract: 'extract',
  screenshot: 'screenshot',
  wait: 'wait',
  press_key: 'press_key',
  select: 'select',
  wait_for: 'wait_for',
  submit: 'submit',
  assert: 'assert',
};

export async function executeSteps(steps: RpaStep[]): Promise<BridgeExecutionResult> {
  resetAbortFlag();
  const activeTab = electronTabs.find(t => t.id === activeTabId);
  if (!activeTab?.view) {
    return {
      execution_id: `steps-${Date.now()}`,
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
  const executionId = `steps-${Date.now()}`;
  const stepResults: StepResult[] = [];
  const screenshots: string[] = [];
  const logs: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    if (isAborted()) {
      logs.push('[Abort] Step execution cancelled by user');
      return {
        execution_id: executionId,
        status: 'aborted',
        goal_status: 'aborted',
        steps: stepResults,
        duration: Date.now() - startTime,
        artifacts: { screenshots, logs },
      };
    }
    const step = steps[i];
    const mappedType = ACTION_TYPE_MAP[step.action] ?? (step.action as GoalAction['type']);
    const action: GoalAction = {
      type: mappedType,
      selector: step.selector,
      target: step.target,
      value: step.value,
      url: step.url,
      description: step.description || `${step.action}${step.selector ? ` on ${step.selector}` : ''}`,
      timeout: step.timeout,
      direction: step.direction,
    };

    emitProgress(i + 1, steps.length, action.type, 'running', action.description);
    logs.push(`[Step ${i + 1}/${steps.length}] ${action.type}: ${action.description}`);

    const result = await executeAction(view, action);
    stepResults.push(result);

    if (result.extractedValue && result.type === 'screenshot') screenshots.push(result.extractedValue);
    if (!result.success) logs.push(`[Step ${i + 1}] Failed: ${result.error}`);
    emitProgress(i + 1, steps.length, action.type, result.success ? 'done' : 'failed', action.description);
    await new Promise(r => setTimeout(r, 200));
  }

  try {
    const image = await view.webContents.capturePage();
    screenshots.push(image.toDataURL());
  } catch { /* ignore */ }

  const successCount = stepResults.filter(s => s.success).length;
  const failCount = stepResults.filter(s => !s.success).length;
  const goalStatus: 'success' | 'failed' | 'uncertain' =
    failCount === 0 ? 'success' : successCount === 0 ? 'failed' : 'uncertain';

  logs.push(`[Result] ${goalStatus}: ${successCount} ok, ${failCount} failed`);
  return {
    execution_id: executionId,
    status: goalStatus === 'failed' ? 'failed' : 'completed',
    goal_status: goalStatus,
    steps: stepResults,
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
  return getCdpBrowser();
}

export function isAutoBrowseInitialized(): boolean {
  return isInitialized;
}

export async function disposeAutoBrowse(): Promise<void> {
  await disconnectCDP();
  isInitialized = false;
  mainWindow = null;
  log.info('[AutoBrowse] Disposed');
}
