/**
 * RPA Executor - KELEDON Browser structured RPA flow executor
 *
 * Receives structured RPA step sequences from the Cloud API and executes them
 * using the existing autobrowse-bridge Electron API methods.
 */

import log from 'electron-log';
import { BrowserWindow, BrowserView } from 'electron';

export interface RpaStep {
  step_id?: string;
  action: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover' | 'wait_for' | 'submit' | 'assert';
  selector?: string;
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
  // Return the last visible view (most recent tab)
  return views[views.length - 1];
}

async function executeStep(view: BrowserView, step: RpaStep): Promise<RpaStepResult> {
  const startTime = Date.now();
  const stepId = step.step_id || `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const wc = view.webContents;

  try {
    switch (step.action) {
      case 'navigate': {
        if (!step.url) throw new Error('No URL provided for navigate');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Navigation timeout')), step.timeout || 30000);
          const done = () => { clearTimeout(timeout); cleanup(); resolve(); };
          const fail = (_e: any, errCode: number, errMsg: string) => { clearTimeout(timeout); cleanup(); reject(new Error(`${errMsg} (${errCode})`)); };
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

      case 'click': {
        if (!step.selector) throw new Error('No selector for click');
        const selectors = step.selector.split(',').map(s => s.trim());
        let clicked = false;
        for (const sel of selectors) {
          try {
            const result = await wc.executeJavaScript(`
              (function() {
                var sel = ${JSON.stringify(sel)};
                var el = document.querySelector(sel);
                if (!el) return { success: false, error: 'not found' };
                if (typeof el.click === 'function') { el.click(); return { success: true }; }
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
        if (!clicked) throw new Error(`Could not click: ${step.selector}`);
        return { step_id: stepId, action: 'click', success: true, duration_ms: Date.now() - startTime };
      }

      case 'fill': {
        if (!step.selector) throw new Error('No selector for fill');
        if (step.value === undefined) throw new Error('No value for fill');
        const selectors = step.selector.split(',').map(s => s.trim());
        let filled = false;
        for (const sel of selectors) {
          try {
            const result = await wc.executeJavaScript(`
              (function() {
                var sel = ${JSON.stringify(sel)};
                var val = ${JSON.stringify(step.value)};
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
        if (!filled) throw new Error(`Could not fill: ${step.selector}`);
        return { step_id: stepId, action: 'fill', success: true, duration_ms: Date.now() - startTime };
      }

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

      case 'select': {
        if (!step.selector) throw new Error('No selector for select');
        const result = await wc.executeJavaScript(`
          (function() {
            var sel = ${JSON.stringify(step.selector)};
            var val = ${JSON.stringify(step.value || '')};
            var el = document.querySelector(sel);
            if (!el) return { success: false, error: 'not found' };
            if (el.tagName !== 'SELECT') return { success: false, error: 'not a select' };
            el.value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          })()
        `);
        if (!result?.success) throw new Error(result?.error || 'Select failed');
        return { step_id: stepId, action: 'select', success: true, duration_ms: Date.now() - startTime };
      }

      case 'hover': {
        if (!step.selector) throw new Error('No selector for hover');
        await wc.executeJavaScript(`
          (function() {
            var sel = ${JSON.stringify(step.selector)};
            var el = document.querySelector(sel);
            if (!el) return;
            var rect = el.getBoundingClientRect();
            var evt = new MouseEvent('mouseover', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
            el.dispatchEvent(evt);
          })()
        `);
        return { step_id: stepId, action: 'hover', success: true, duration_ms: Date.now() - startTime };
      }

      case 'scroll': {
        const direction = step.direction || 'down';
        const amount = step.value || '500';
        await wc.executeJavaScript(`window.scrollBy(0, ${direction === 'up' ? '-' : ''}${amount});`);
        return { step_id: stepId, action: 'scroll', success: true, duration_ms: Date.now() - startTime };
      }

      case 'wait': {
        const ms = parseInt(step.value || '2000', 10);
        await new Promise(r => setTimeout(r, Math.min(ms, 30000)));
        return { step_id: stepId, action: 'wait', success: true, duration_ms: Date.now() - startTime };
      }

      case 'wait_for': {
        if (!step.selector) throw new Error('No selector for wait_for');
        const timeout = step.timeout || 15000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
          try {
            const exists = await wc.executeJavaScript(`!!document.querySelector(${JSON.stringify(step.selector)})`);
            if (exists) return { step_id: stepId, action: 'wait_for', success: true, duration_ms: Date.now() - startTime };
          } catch { /* ignore */ }
          await new Promise(r => setTimeout(r, 200));
        }
        return { step_id: stepId, action: 'wait_for', success: false, error: 'Timeout waiting for selector', duration_ms: Date.now() - startTime };
      }

      case 'screenshot': {
        const image = await wc.capturePage();
        const base64 = image.toDataURL();
        return { step_id: stepId, action: 'screenshot', success: true, duration_ms: Date.now() - startTime, extracted_value: base64 };
      }

      case 'extract': {
        let value = '';
        if (step.selector) {
          const result = await wc.executeJavaScript(`
            (function() {
              var sel = ${JSON.stringify(step.selector)};
              var el = document.querySelector(sel);
              return el ? (el.innerText || el.textContent || '') : '';
            })()
          `);
          value = result || '';
        }
        if (!value) {
          value = await wc.executeJavaScript(`(document.body ? document.body.innerText || document.body.textContent : '')?.substring(0, 5000) || ''`);
        }
        return { step_id: stepId, action: 'extract', success: true, duration_ms: Date.now() - startTime, extracted_value: value };
      }

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

      case 'assert': {
        if (!step.selector) throw new Error('No selector for assert');
        const exists = await wc.executeJavaScript(`!!document.querySelector(${JSON.stringify(step.selector)})`);
        if (!exists) throw new Error(`Assert failed: element not found: ${step.selector}`);
        return { step_id: stepId, action: 'assert', success: true, duration_ms: Date.now() - startTime };
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

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    log.info(`[RpaExecutor] Step ${i + 1}/${flow.steps.length}: ${step.action} (${step.description || step.selector || ''})`);

    const result = await executeStep(view, step);
    results.push(result);

    if (!result.success) {
      hasFailure = true;
      log.warn(`[RpaExecutor] Step failed: ${result.error}`);
      // Continue executing remaining steps — don't abort the entire flow
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
