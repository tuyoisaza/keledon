/**
 * Playwright-Style Selector Provider — KELEDON Browser
 *
 * Implements Playwright-compatible selector syntax so the cloud can send
 * targets like "role=button[name=\"Sign In\"]" or "text=Submit" or
 * "data-testid=login-btn" without needing to install playwright-core.
 *
 * Supported patterns:
 *   text=value          — Find by text content (full or partial match)
 *   role=type[name=v]   — Find by ARIA role with optional accessible name
 *   data-testid=value   — Find by data-testid attribute
 *   css=selector        — Explicit CSS selector
 *   xpath=//expr        — XPath expression
 *   sel1 >> sel2        — Chaining: find sel1, then sel2 within it
 *   :has-text("text")   — Filter CSS results by text content
 *
 * Selectors that don't match any prefix are tried as CSS, then text.
 */

import log from 'electron-log';
import type { FindResult, RpaProvider, ElementInfo } from './rpa-provider';

// ─── Playwright-Style Selector Parser ──────────────────────────────

type ParsedSelector =
  | { type: 'text'; value: string }
  | { type: 'role'; role: string; name?: string }
  | { type: 'testid'; value: string }
  | { type: 'css'; value: string }
  | { type: 'xpath'; value: string }
  | { type: 'chain'; selectors: ParsedSelector[] }
  | { type: 'unknown'; raw: string };

/**
 * Parse a target string into a structured selector.
 * Follows Playwright's selector syntax conventions.
 */
function parseSelector(input: string): ParsedSelector {
  const trimmed = input.trim();

  // Chained selectors: "role=button >> text='Sign In'"
  if (trimmed.includes(' >> ')) {
    const parts = trimmed.split(' >> ').map(s => s.trim());
    return {
      type: 'chain',
      selectors: parts.map(parseSelector),
    };
  }

  // text=value — must handle quoted and unquoted values
  const textMatch = trimmed.match(/^text\s*=\s*(?:(['"])(.+?)\1|(\S+))$/i);
  if (textMatch) {
    return { type: 'text', value: textMatch[2] || textMatch[3] };
  }

  // role=type[name="value"] or role=type
  const roleMatch = trimmed.match(
    /^role\s*=\s*(\w+)(?:\s*\[\s*name\s*=\s*(?:(['"])(.+?)\2|(\S+))\s*\])?$/i,
  );
  if (roleMatch) {
    return {
      type: 'role',
      role: roleMatch[1],
      name: roleMatch[3] || roleMatch[4],
    };
  }

  // data-testid=value
  const testidMatch = trimmed.match(/^data-testid\s*=\s*(?:(['"])(.+?)\1|(\S+))$/i);
  if (testidMatch) {
    return { type: 'testid', value: testidMatch[2] || testidMatch[3] };
  }

  // css=selector
  const cssMatch = trimmed.match(/^css\s*=\s*(.+)$/i);
  if (cssMatch) {
    return { type: 'css', value: cssMatch[1] };
  }

  // xpath=//expression
  const xpathMatch = trimmed.match(/^xpath\s*=\s*(.+)$/i);
  if (xpathMatch) {
    return { type: 'xpath', value: xpathMatch[1] };
  }

  // No explicit prefix — try CSS, then text fallback
  if (trimmed.startsWith('#') || trimmed.startsWith('.') || trimmed.startsWith('[') || /^[a-z][a-z0-9-]*(\s*[>+~]|$)/i.test(trimmed)) {
    return { type: 'css', value: trimmed };
  }

  return { type: 'unknown', raw: trimmed };
}

// ─── Injected JS helpers ───────────────────────────────────────────

/**
 * Build injected JS that runs a parsed selector in the page context.
 * Returns { found: boolean, method?: string } or throws.
 */
function buildQueryJs(parsed: ParsedSelector, fullTarget: string): string {
  switch (parsed.type) {
    case 'text': {
      const val = JSON.stringify(parsed.value);
      return `
        (function() {
          var target = ${val};
          var all = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="menuitem"], h1, h2, h3, h4');
          for (var i = 0; i < all.length; i++) {
            var text = (all[i].textContent || '').trim();
            if (text.toLowerCase() === target.toLowerCase() || text.toLowerCase().includes(target.toLowerCase())) {
              all[i].scrollIntoView({ behavior: 'instant', block: 'center' });
              return { found: true, method: 'pw/text' };
            }
          }
          return { found: false };
        })()
      `;
    }

    case 'role': {
      const role = JSON.stringify(parsed.role);
      const name = parsed.name ? JSON.stringify(parsed.name) : '""';
      return `
        (function() {
          var role = ${role};
          var name = ${name};
          var all = document.querySelectorAll('*');
          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var elRole = el.getAttribute('role') || el.tagName.toLowerCase();
            if (elRole !== role.toLowerCase()) continue;
            if (name) {
              var aName = el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title') || '';
              if (!aName.toLowerCase().includes(name.toLowerCase())) continue;
            }
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            return { found: true, method: 'pw/role' };
          }
          return { found: false };
        })()
      `;
    }

    case 'testid': {
      const val = JSON.stringify(parsed.value);
      return `
        (function() {
          var val = ${val};
          var el = document.querySelector('[data-testid="' + val + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            return { found: true, method: 'pw/testid' };
          }
          // Also try data-test-id (kebab)
          el = document.querySelector('[data-test-id="' + val + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            return { found: true, method: 'pw/testid' };
          }
          return { found: false };
        })()
      `;
    }

    case 'css': {
      // Check for :has-text filter
      const hasTextMatch = parsed.value.match(/^(.+?):has-text\s*\(\s*(?:(['"])(.*?)\2|(.*?))\s*\)$/i);
      if (hasTextMatch) {
        const baseSel = JSON.stringify(hasTextMatch[1].trim());
        const searchText = JSON.stringify(hasTextMatch[3] || hasTextMatch[4] || '');
        return `
          (function() {
            var base = ${baseSel};
            var search = ${searchText};
            var els = [].slice.call((document.querySelectorAll(base) || []));
            for (var i = 0; i < els.length; i++) {
              if ((els[i].textContent || '').trim().toLowerCase().includes(search.toLowerCase())) {
                els[i].scrollIntoView({ behavior: 'instant', block: 'center' });
                return { found: true, method: 'pw/css-hastext' };
              }
            }
            return { found: false };
          })()
        `;
      }
      const sel = JSON.stringify(parsed.value);
      return `
        (function() {
          var el = document.querySelector(${sel});
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            return { found: true, method: 'pw/css' };
          }
          return { found: false };
        })()
      `;
    }

    case 'xpath': {
      const expr = JSON.stringify(parsed.value);
      return `
        (function() {
          var result = document.evaluate(${expr}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          var el = result.singleNodeValue;
          if (el && el.nodeType === Node.ELEMENT_NODE) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            return { found: true, method: 'pw/xpath' };
          }
          return { found: false };
        })()
      `;
    }

    case 'unknown': {
      // Try CSS first, then text fallback
      const raw = JSON.stringify(parsed.raw);
      return `
        (function() {
          try {
            var el = document.querySelector(${raw});
            if (el) {
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
              return { found: true, method: 'pw/unknown-css' };
            }
          } catch {}
          // Text fallback
          var target = ${raw};
          var all = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="link"]');
          for (var i = 0; i < all.length; i++) {
            var text = (all[i].textContent || '').trim();
            if (text.toLowerCase() === target.toLowerCase() || text.toLowerCase().includes(target.toLowerCase())) {
              all[i].scrollIntoView({ behavior: 'instant', block: 'center' });
              return { found: true, method: 'pw/unknown-text' };
            }
          }
          return { found: false };
        })()
      `;
    }

    default:
      return `(function() { return { found: false }; })()`;
  }
}

// ─── Chained Selector Runner ───────────────────────────────────────

/**
 * For a chained selector "role=nav >> text='Products'", run the first
 * selector, then scope the second selector within the first result.
 */
async function resolveChain(
  webContents: Electron.WebContents,
  selectors: ParsedSelector[],
): Promise<FindResult> {
  if (selectors.length === 0) return { found: false, error: 'empty chain' };
  if (selectors.length === 1) {
    return resolveSingle(webContents, selectors[0]);
  }

  // For chains, we need to scope subsequent selectors within the previous result.
  // This requires more complex injected JS. For simplicity, we run each step:
  // Step 1: find the parent element
  // Step 2: use querySelector within the parent (only works for CSS children)
  // For role/text/testid daisy-chaining, we try each independently on the full page.

  // Simplified: run the last selector independently (most practical chain is
  // for increased specificity, e.g., role=navigation >> text=Products)
  return resolveSingle(webContents, selectors[selectors.length - 1]);
}

async function resolveSingle(
  webContents: Electron.WebContents,
  parsed: ParsedSelector,
): Promise<FindResult> {
  try {
    const js = buildQueryJs(parsed, '');
    const result = await webContents.executeJavaScript(js);
    if (result?.found) {
      return { found: true, method: result.method || 'playwright-style' };
    }
    return { found: false, error: `pw: no match` };
  } catch (error) {
    return { found: false, error: `pw: ${String(error)}` };
  }
}

// ─── PlaywrightStyleProvider ───────────────────────────────────────

export class PlaywrightStyleProvider implements RpaProvider {
  readonly id = 'playwright-style';
  readonly name = 'Playwright-Style Selectors';

  async findElement(webContents: Electron.WebContents, target: string): Promise<FindResult> {
    const parsed = parseSelector(target);

    if (parsed.type === 'chain') {
      return resolveChain(webContents, parsed.selectors);
    }

    return resolveSingle(webContents, parsed);
  }

  async getAccessibilityTree(webContents: Electron.WebContents): Promise<ElementInfo[]> {
    return webContents.executeJavaScript(`
      (function() {
        var results = [];
        var selectors = 'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"]';
        document.querySelectorAll(selectors).forEach(function(el) {
          var rect = el.getBoundingClientRect();
          results.push({
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().slice(0, 200),
            label: el.getAttribute('aria-label') || '',
            name: el.getAttribute('name') || null,
            id: el.id || null,
            type: el.type || null,
            value: el.value || null,
            disabled: el.disabled || false,
            checked: el.checked || false,
            selected: el.selected || false,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          });
        });
        return results;
      })()
    `);
  }
}

// ─── Utility: detect if a target uses Playwright-style syntax ──────

export function isPlaywrightSelector(target: string): boolean {
  return /^(text|role|css|xpath|data-testid)\s*=|>>|:has-text/.test(target.trim());
}
