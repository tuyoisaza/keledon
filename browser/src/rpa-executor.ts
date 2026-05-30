/**
 * RPA Executor — KELEDON Browser structured RPA flow executor
 *
 * Uses the pluggable RPA provider system to resolve element targets.
 * Supports both CSS selectors and natural-language targets like
 * "button 'Sign In'" or "text field labeled 'Email'".
 */

import log from 'electron-log';
import { BrowserWindow, BrowserView } from 'electron';
import { findElement, getAccessibilityTree, setRpaProviderConfig } from './rpa-provider';

export interface RpaStep {
  step_id?: string;
  action: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover' | 'wait_for' | 'submit' | 'assert';
  selector?: string;      // CSS selector (legacy) or natural-language target
  target?: string;         // natural-language target (preferred, e.g. "button 'Sign In'")
  value?: string;
  url?: string;
  description?: string;
  timeout?: number;
  direction?: string;
}

export interface RpaFlow {
  flow_id?: string;
  name?: string;
  steps: RpaStep[];
  timeout_ms?: number;
}

export interface RpaStepResult {
  step_id: string;
  action: string;
  success: boolean;
  duration_ms: number;
  extracted_value?: string;
  error?: string;
  method?: string; // which provider resolved it
}

export interface RpaFlowResult {
  flow_id?: string;
  status: 'completed' | 'failed' | 'partial';
  steps: RpaStepResult[];
  total_duration_ms: number;
  error?: string;
}

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

function getActiveView(): BrowserView | null {
  if (!mainWindow) return null;
  const views = mainWindow.getBrowserViews();
  if (views.length === 0) return null;
  return views[views.length - 1];
}

/**
 * Resolve a step's target string (either explicit 'target' or legacy 'selector').
 */
function getTarget(step: RpaStep): string | null {
  return step.target || step.selector || null;
}

// ─── Scroll element into view before interaction ─────────────────────

async function scrollIntoView(wc: Electron.WebContents, target: string): Promise<boolean> {
  // Already done inside the provider's findElement — but ensure it's visible
  try {
    return await wc.executeJavaScript(`
      (function() {
        var sel = ${JSON.stringify(target)};
        var el = document.querySelector(sel);
        if (!el) return false;
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        return true;
      })()
    `);
  } catch {
    return false;
  }
}

// ─── Step Executor ──────────────────────────────────────────────────

async function executeStep(view: BrowserView, step: RpaStep): Promise<RpaStepResult> {
  const startTime = Date.now();
  const stepId = step.step_id || `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const wc = view.webContents;
  const target = getTarget(step);

  try {
    switch (step.action) {
      // ── NAVIGATE ──────────────────────────────────────────────
      case 'navigate': {
        if (!step.url) throw new Error('No URL provided for navigate');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Navigation timeout')),
            step.timeout || 30000,
          );
          const done = () => { clearTimeout(timeout); cleanup(); resolve(); };
          const fail = (_e: any, errCode: number, errMsg: string) => {
            clearTimeout(timeout);
            cleanup();
            reject(new Error(`${errMsg} (${errCode})`));
          };
          const cleanup = () => {
            wc.removeListener('did-finish-load', done);
            wc.removeListener('did-fail-load', fail);
          };
          wc.once('did-finish-load', done);
          wc.once('did-fail-load', fail);
          wc.loadURL(step.url);
        });
        return { step_id: stepId, action: 'navigate', success: true, duration_ms: Date.now() - startTime };
      }

      // ── CLICK ─────────────────────────────────────────────────
      case 'click': {
        if (!target) throw new Error('No selector/target for click');
        // Try each comma-separated selector as a provider query
        const targets = target.split(',').map(s => s.trim());
        let clicked = false;
        let method = '';
        for (const t of targets) {
          const result = await findElement(wc, t);
          if (result.found) {
            const didClick = await wc.executeJavaScript(`
              (function() {
                var sel = ${JSON.stringify(t)};
                // Try as CSS selector first (provider would have scrolled to it)
                var el = document.querySelector(sel);
                if (el) { el.click(); return true; }
                // Fallback: find by text
                var all = document.querySelectorAll('button, a, [role="button"], [role="link"], input[type="submit"]');
                var text = sel.replace(/^(?:button|link)\\s+'(.+)'$/i, '$1').replace(/^with text '(.+)'$/i, '$1');
                for (var i = 0; i < all.length; i++) {
                  if (all[i].textContent.trim().toLowerCase() === text.toLowerCase()) {
                    all[i].click(); return true;
                  }
                  if (all[i].textContent.trim().toLowerCase().includes(text.toLowerCase())) {
                    all[i].click(); return true;
                  }
                }
                return false;
              })()
            `);
            if (didClick) { clicked = true; method = result.method || ''; break; }
          }
        }
        if (!clicked) throw new Error(`Could not click: ${target}`);
        return { step_id: stepId, action: 'click', success: true, duration_ms: Date.now() - startTime, method };
      }

      // ── FILL ──────────────────────────────────────────────────
      case 'fill': {
        if (!target) throw new Error('No selector/target for fill');
        if (step.value === undefined) throw new Error('No value for fill');
        const targets = target.split(',').map(s => s.trim());
        let filled = false;
        let method = '';
        for (const t of targets) {
          // Use provider to find the element, then fill
          const findResult = await findElement(wc, t);
          if (findResult.found) {
            const result = await wc.executeJavaScript(`
              (function() {
                var sel = ${JSON.stringify(t)};
                var val = ${JSON.stringify(step.value)};
                // Try CSS selector
                var el = document.querySelector(sel);
                if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
                  el.focus();
                  el.value = val;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  return true;
                }
                // Search by label or placeholder
                var all = document.querySelectorAll('input, textarea, [contenteditable]');
                var labelText = sel.replace(/^.*label(?:ed)?\\s+'(.+)'$/i, '$1').replace(/^field '(.+)'$/i, '$1').replace(/^'(.+)'$/i, '$1');
                for (var i = 0; i < all.length; i++) {
                  var el = all[i];
                  var match = false;
                  if (el.placeholder && el.placeholder.toLowerCase().includes(labelText.toLowerCase())) match = true;
                  if (el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes(labelText.toLowerCase())) match = true;
                  if (el.name && el.name.toLowerCase().includes(labelText.toLowerCase())) match = true;
                  if (el.id && el.id.toLowerCase().includes(labelText.toLowerCase())) match = true;
                  if (match) {
                    el.focus();
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                  }
                }
                return false;
              })()
            `);
            if (result) { filled = true; method = findResult.method || ''; break; }
          }
        }
        if (!filled) throw new Error(`Could not fill: ${target}`);
        return { step_id: stepId, action: 'fill', success: true, duration_ms: Date.now() - startTime, method };
      }

      // ── PRESS KEY ──────────────────────────────────────────────
      case 'press_key': {
        const key = step.value || 'Enter';
        await wc.executeJavaScript(`
          if (document.activeElement) {
            var evt = new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true });
            document.activeElement.dispatchEvent(evt);
            var evt2 = new KeyboardEvent('keyup', { key: ${JSON.stringify(key)}, bubbles: true });
            document.activeElement.dispatchEvent(evt2);
          }
        `).catch(() => {});
        return { step_id: stepId, action: 'press_key', success: true, duration_ms: Date.now() - startTime };
      }

      // ── SELECT ────────────────────────────────────────────────
      case 'select': {
        if (!target) throw new Error('No selector/target for select');
        const findResult = await findElement(wc, target);
        if (!findResult.found) throw new Error(`Could not find select: ${target}`);
        const result = await wc.executeJavaScript(`
          (function() {
            var sel = ${JSON.stringify(target)};
            var val = ${JSON.stringify(step.value || '')};
            var el = document.querySelector(sel);
            if (!el || el.tagName !== 'SELECT') return { success: false, error: 'not a select element' };
            el.value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          })()
        `);
        if (!result?.success) throw new Error(result?.error || 'Select failed');
        return { step_id: stepId, action: 'select', success: true, duration_ms: Date.now() - startTime, method: findResult.method };
      }

      // ── HOVER ─────────────────────────────────────────────────
      case 'hover': {
        if (!target) throw new Error('No selector/target for hover');
        const findResult = await findElement(wc, target);
        if (!findResult.found) throw new Error(`Could not find: ${target}`);
        await wc.executeJavaScript(`
          (function() {
            var sel = ${JSON.stringify(target)};
            var el = document.querySelector(sel);
            if (!el) return;
            var rect = el.getBoundingClientRect();
            var evt = new MouseEvent('mouseover', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
            el.dispatchEvent(evt);
          })()
        `);
        return { step_id: stepId, action: 'hover', success: true, duration_ms: Date.now() - startTime, method: findResult.method };
      }

      // ── SCROLL ────────────────────────────────────────────────
      case 'scroll': {
        const direction = step.direction || 'down';
        const amount = step.value || '500';
        await wc.executeJavaScript(`window.scrollBy(0, ${direction === 'up' ? '-' : ''}${amount});`);
        return { step_id: stepId, action: 'scroll', success: true, duration_ms: Date.now() - startTime };
      }

      // ── WAIT ──────────────────────────────────────────────────
      case 'wait': {
        const ms = parseInt(step.value || '2000', 10);
        await new Promise(r => setTimeout(r, Math.min(ms, 30000)));
        return { step_id: stepId, action: 'wait', success: true, duration_ms: Date.now() - startTime };
      }

      // ── WAIT FOR ──────────────────────────────────────────────
      case 'wait_for': {
        if (!target) throw new Error('No selector/target for wait_for');
        const timeout = step.timeout || 15000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const result = await findElement(wc, target);
          if (result.found) {
            return { step_id: stepId, action: 'wait_for', success: true, duration_ms: Date.now() - startTime, method: result.method };
          }
          await new Promise(r => setTimeout(r, 200));
        }
        return { step_id: stepId, action: 'wait_for', success: false, error: 'Timeout waiting for element', duration_ms: Date.now() - startTime };
      }

      // ── SCREENSHOT ────────────────────────────────────────────
      case 'screenshot': {
        const image = await wc.capturePage();
        const base64 = image.toDataURL();
        return { step_id: stepId, action: 'screenshot', success: true, duration_ms: Date.now() - startTime, extracted_value: base64 };
      }

      // ── EXTRACT ───────────────────────────────────────────────
      case 'extract': {
        let value = '';
        if (target) {
          const findResult = await findElement(wc, target);
          if (findResult.found) {
            value = await wc.executeJavaScript(`
              (function() {
                var sel = ${JSON.stringify(target)};
                var el = document.querySelector(sel);
                return el ? (el.innerText || el.textContent || el.value || '') : '';
              })()`) || '';
          }
        }
        if (!value) {
          value = await wc.executeJavaScript(
            `(document.body ? document.body.innerText || document.body.textContent : '')?.substring(0, 5000) || ''`,
          );
        }
        return { step_id: stepId, action: 'extract', success: true, duration_ms: Date.now() - startTime, extracted_value: value };
      }

      // ── SUBMIT ────────────────────────────────────────────────
      case 'submit': {
        await wc.executeJavaScript(`
          (function() {
            var form = document.querySelector('form') || document.activeElement?.closest('form');
            if (form) { form.submit(); return true; }
            var btn = document.querySelector('button[type="submit"], input[type="submit"]');
            if (btn) { btn.click(); return true; }
            return false;
          })()
        `);
        await new Promise(r => setTimeout(r, 2000));
        return { step_id: stepId, action: 'submit', success: true, duration_ms: Date.now() - startTime };
      }

      // ── ASSERT ────────────────────────────────────────────────
      case 'assert': {
        if (!target) throw new Error('No selector/target for assert');
        const result = await findElement(wc, target);
        if (!result.found) throw new Error(`Assert failed: ${target} not found`);
        return { step_id: stepId, action: 'assert', success: true, duration_ms: Date.now() - startTime, method: result.method };
      }

      default:
        throw new Error(`Unknown RPA action: ${step.action}`);
    }
  } catch (error) {
    return {
      step_id: stepId,
      action: step.action,
      success: false,
      duration_ms: Date.now() - startTime,
      error: String(error),
    };
  }
}

// ─── Flow Executor ──────────────────────────────────────────────────

export async function executeRpaFlow(flow: RpaFlow): Promise<RpaFlowResult> {
  const startTime = Date.now();
  const flowId = flow.flow_id || `flow-${Date.now()}`;
  const results: RpaStepResult[] = [];
  let hasFailure = false;

  log.info(`[RpaExecutor] Executing flow: ${flowId} (${flow.steps.length} steps)`);

  const view = getActiveView();
  if (!view) {
    return {
      flow_id: flowId,
      status: 'failed',
      steps: [],
      total_duration_ms: Date.now() - startTime,
      error: 'No active BrowserView available',
    };
  }

  // Log which provider chain is active
  log.info(`[RpaExecutor] Provider chain active`);

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    log.info(
      `[RpaExecutor] Step ${i + 1}/${flow.steps.length}: ${step.action} (${step.description || step.target || step.selector || ''})`,
    );

    const result = await executeStep(view, step);
    results.push(result);

    if (!result.success) {
      hasFailure = true;
      log.warn(`[RpaExecutor] Step failed: ${result.error}`);
    }
  }

  const status = hasFailure ? (results.some(r => r.success) ? 'partial' : 'failed') : 'completed';
  const totalDuration = Date.now() - startTime;

  log.info(`[RpaExecutor] Flow ${flowId} completed: ${status} (${totalDuration}ms)`);

  return {
    flow_id: flowId,
    status,
    steps: results,
    total_duration_ms: totalDuration,
  };
}

export async function executeRpaSteps(steps: RpaStep[], flowId?: string): Promise<RpaFlowResult> {
  return executeRpaFlow({ flow_id: flowId, steps });
}
