/**
 * AutoBrowse Actions - Individual action execution against a BrowserView
 *
 * Each action type (navigate, click, fill, etc.) is executed by injecting
 * JavaScript into the target BrowserView's webContents via executeJavaScript().
 *
 * v0.3.80 - Extracted from autobrowse-bridge.ts for modularity
 */

import type { BrowserView } from 'electron';
import log from 'electron-log';
import type { GoalPlannerAction as GoalAction } from './goal-planner';

// ==================== Types ====================

export interface StepResult {
  id: string;
  type: string;
  description: string;
  success: boolean;
  duration: number;
  error?: string;
  extractedValue?: string;
}

// ==================== Action Execution ====================

/**
 * Execute a single browser action against a BrowserView.
 * Injects JavaScript into the page to perform the action natively.
 * Falls back through multiple selectors/strategies for each action type.
 *
 * @param view - The Electron BrowserView to execute the action on
 * @param action - The action definition (type, selector, value, etc.)
 * @returns A StepResult with success/failure, duration, and optional extracted data
 */
export async function executeAction(
  view: BrowserView,
  action: GoalAction,
): Promise<StepResult> {
  const id = `${action.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const startTime = Date.now();
  const wc = view.webContents;

  try {
    switch (action.type) {
      case 'navigate': {
        if (!action.url) throw new Error('No URL for navigate');
        await wc.loadURL(action.url);
        return { id, type: 'navigate', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'click': {
        let clicked = false;
        if (action.selector) {
          const selectors = action.selector.split(',').map((s) => s.trim()).filter(Boolean);
          for (const sel of selectors) {
            try {
              const result = await wc.executeJavaScript(`
                (function() {
                  var sel = ${JSON.stringify(sel)};
                  var val = ${JSON.stringify(action.value)};
                  var el;
                  if (val && sel.includes(':')) {
                    el = document.querySelector(sel.replace(':has-text', ''));
                  }
                  el = document.querySelector(sel);
                  if (!el) {
                    el = document.querySelector('[data-testid*="${sel.replace(/^[^a-zA-Z0-9]+/, '').slice(0, 30)}" i]');
                  }
                  if (!el) return { found: false };
                  if (typeof el.click === 'function') { el.click(); return { found: true }; }
                  var evt = new MouseEvent('click', { bubbles: true, cancelable: true });
                  el.dispatchEvent(evt);
                  return { found: true };
                })()
              `).catch(() => ({ found: false }));
              if (result?.found) {
                clicked = true;
                break;
              }
            } catch {
              continue;
            }
          }
        } else if (action.target) {
          // v0.3.39: fallback by target label text if no selector provided
          const targetLabel = action.target.replace(/^button\\s+'|'$/g, '').trim();
          const result = await wc.executeJavaScript(`
            (function() {
              var label = ${JSON.stringify(targetLabel)};
              var textNodes = [];
              var walker = document.createTreeWalker(document.body, 4, null, false);
              while (walker.nextNode()) {
                var text = walker.currentNode.textContent.trim().toLowerCase();
                if (text === label.toLowerCase() || text.startsWith(label.toLowerCase())) {
                  textNodes.push(walker.currentNode);
                }
              }
              for (var i = 0; i < textNodes.length; i++) {
                var el = textNodes[i];
                while (el && el.tagName !== 'BUTTON' && el.tagName !== 'A' && el.tagName !== 'INPUT' && el.getAttribute('role') !== 'button') {
                  el = el.parentElement;
                }
                if (el) { if (typeof el.click === 'function') el.click(); return true; }
              }
              return false;
            })()
          `).catch(() => false);
          if (result) clicked = true;
        }
        if (!clicked) throw new Error(`Could not click: ${action.selector || action.target}`);
        return { id, type: 'click', description: action.description, success: true, duration: Date.now() - startTime };
      }

      case 'fill': {
        let filled = false;
        if (action.target) {
          // v0.3.45: try target label text first for broader matching
          const targetLabel = action.target.replace(/^textbox\\s+'|'$/g, '').trim();
          const targetFill = await wc.executeJavaScript(`
            (function() {
              var label = ${JSON.stringify(targetLabel)};
              var val = ${JSON.stringify(action.value || '')};
              if (!label) return { success: false };
              var labels = Array.from(document.querySelectorAll('label'));
              var found = false;
              for (var i = 0; i < labels.length; i++) {
                if (labels[i].textContent.trim().toLowerCase().includes(label.toLowerCase())) {
                  var target = labels[i].getAttribute('for');
                  if (target) {
                    var el = document.getElementById(target);
                    if (el) {
                      el.focus();
                      el.value = val;
                      el.dispatchEvent(new Event('input', { bubbles: true }));
                      el.dispatchEvent(new Event('change', { bubbles: true }));
                      found = true;
                      return { success: true };
                    }
                  }
                  var input = labels[i].querySelector('input, textarea, select');
                  if (input) {
                    input.focus();
                    input.value = val;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    found = true;
                    return { success: true };
                  }
                }
              }
              return { success: false };
            })()
          `).catch((error) => ({ success: false, error: String(error) }));
          if (targetFill?.success) filled = true;
        }
        const selectors = (action.selector || '').split(',').map(s => s.trim()).filter(Boolean);
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

      case 'assert': {
        if (action.selector) {
          const result = await wc.executeJavaScript(`
            (function() {
              var el = document.querySelector(${JSON.stringify(action.selector)});
              if (!el) return { found: false, text: '' };
              return { found: true, text: el.innerText || el.textContent || el.value || '' };
            })()
          `);
          if (!result?.found) throw new Error(`Assert: element not found: ${action.selector}`);
          if (action.value && !result.text.includes(action.value)) {
            throw new Error(`Assert: "${result.text.substring(0, 100)}" does not contain "${action.value}"`);
          }
        } else if (action.value) {
          const text: string = await wc.executeJavaScript(
            `document.body ? (document.body.innerText || document.body.textContent || '') : ''`
          );
          if (!text.includes(action.value)) {
            throw new Error(`Assert: page does not contain "${action.value}"`);
          }
        }
        return { id, type: 'assert', description: action.description, success: true, duration: Date.now() - startTime };
      }

      default:
        throw new Error(`Unknown action type: ${(action as GoalAction).type}`);
    }
  } catch (error) {
    return { id, type: action.type, description: action.description, success: false, duration: Date.now() - startTime, error: String(error) };
  }
}
