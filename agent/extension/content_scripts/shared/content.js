/**
 * content.js — RPA Executor Injector (Manifest V3)
 * Runs in every tab. Listens for commands from background.
 * Contract: rpa/step.schema.json
 */

// Ensure global namespace
if (!window.KeledonRPA) {
  window.KeledonRPA = {
    executor: null,
    pendingSteps: new Map()
  };
}

// Lazy-load executor
const getExecutor = () => {
  if (!window.KeledonRPA.executor) {
    // In production: import('./rpa/executor/simple.executor.ts')
    // For now: inline minimal executor
    class SimpleExecutor {
      async execute(step) {
        const { step_id, action, selector, value } = step;
        try {
          const el = document.querySelector(selector);
          if (!el) {
            return { step_id, status: 'failure', evidence: `Element not found: ${selector}` };
          }

          switch (action) {
            case 'click': el.click(); break;
            case 'fill_field':
              if ('value' in el) (el).value = value ?? ''; break;
            case 'navigate':
              if (typeof value === 'string' && value.startsWith('http')) {
                window.location.href = value;
              }
              break;
            default:
              return { step_id, status: 'failure', evidence: `Unknown action: ${action}` };
          }
          return { step_id, status: 'success', evidence: `Executed ${action}` };
        } catch (e) {
          return { step_id, status: 'failure', evidence: e.message };
        }
      }
    }
    window.KeledonRPA.executor = new SimpleExecutor();
  }
  return window.KeledonRPA.executor;
};

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXECUTE_RPA_STEP') {
    const executor = getExecutor();
    executor.execute(request.step).then(result => {
      sendResponse(result);
    });
    return true; // async response
  }

  if (request.type === 'PING') {
    sendResponse({ alive: true, tabId: sender.tab?.id });
  }
});

// Optional: expose to page for debugging
window.keledon = {
  executeStep: (step) => {
    return getExecutor().execute(step);
  }
};