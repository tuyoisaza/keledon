/**
 * RPA Engine — browser-side UI automation.
 * Executes steps sent by the Cloud Brain via WS voice:rpa:steps.
 */

export type RpaAction =
  | 'click'
  | 'fill'
  | 'extract'
  | 'wait'
  | 'navigate';

export interface RpaStep {
  action: RpaAction;
  selector?: string;
  value?: string;
  url?: string;
  attribute?: string;
  ms?: number;
}

export interface RpaStepResult {
  step_index: number;
  action: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Wait for an element matching `selector` to appear in the DOM.
 * Retries up to timeoutMs with 200ms intervals.
 */
function waitForElement(
  selector: string,
  timeoutMs = 5000,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const deadline = Date.now() + timeoutMs;
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      } else if (Date.now() > deadline) {
        observer.disconnect();
        reject(new Error(`Element "${selector}" not found within ${timeoutMs}ms`));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Safety timeout
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" timeout (${timeoutMs}ms)`));
    }, timeoutMs);
  });
}

/**
 * Execute a single RPA step and return the result.
 */
async function executeStep(
  step: RpaStep,
  index: number,
): Promise<RpaStepResult> {
  const base: RpaStepResult = { step_index: index, action: step.action, success: false };

  try {
    switch (step.action) {
      case 'click': {
        if (!step.selector) return { ...base, error: 'Missing selector for click' };
        const el = await waitForElement(step.selector);
        if (el instanceof HTMLElement) {
          el.focus();
          el.click();
        } else {
          (el as HTMLAnchorElement).click(); // SVG elements etc.
        }
        return { ...base, success: true, data: { clicked: step.selector } };
      }

      case 'fill': {
        if (!step.selector) return { ...base, error: 'Missing selector for fill' };
        if (step.value === undefined) return { ...base, error: 'Missing value for fill' };
        const el = await waitForElement(step.selector);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.focus();
          el.value = step.value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (el instanceof HTMLElement && el.isContentEditable) {
          el.focus();
          el.textContent = step.value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          return { ...base, error: `Element "${step.selector}" is not an input field` };
        }
        return { ...base, success: true, data: { filled: step.selector } };
      }

      case 'extract': {
        if (!step.selector) return { ...base, error: 'Missing selector for extract' };
        const el = await waitForElement(step.selector);
        const attr = step.attribute || 'textContent';
        let value: string;
        if (attr === 'textContent' || attr === 'innerText') {
          value = (el as HTMLElement)[attr]?.trim() || '';
        } else {
          value = el.getAttribute(attr) || '';
        }
        return { ...base, success: true, data: { [attr]: value } };
      }

      case 'wait': {
        const ms = step.ms ?? 1000;
        await new Promise((r) => setTimeout(r, ms));
        return { ...base, success: true, data: { waitedMs: ms } };
      }

      case 'navigate': {
        if (!step.url) return { ...base, error: 'Missing url for navigate' };
        window.location.href = step.url;
        // Wait for page load
        await new Promise<void>((resolve) => {
          if (document.readyState === 'complete') resolve();
          else window.addEventListener('load', () => resolve(), { once: true });
        });
        return { ...base, success: true, data: { navigated: step.url } };
      }

      default:
        return { ...base, error: `Unknown action: ${step.action}` };
    }
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Execute an array of RPA steps sequentially.
 * Continues on error unless the step is critical.
 */
export async function executeRpaSteps(
  steps: RpaStep[],
): Promise<{ success: boolean; results: RpaStepResult[] }> {
  const results: RpaStepResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const result = await executeStep(steps[i], i);
    results.push(result);

    // Stop on navigation — subsequent steps may be stale
    if (steps[i].action === 'navigate' && result.success) {
      break;
    }
  }

  const success = results.every((r) => r.success);
  return { success, results };
}
