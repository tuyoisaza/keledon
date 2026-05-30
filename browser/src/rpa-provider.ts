/**
 * RPA Provider Interface — KELEDON Browser
 *
 * A pluggable element-resolution system. Each provider implements the same
 * interface, configurable per-device from the cloud admin panel.
 *
 * Current providers:
 *   - native-dom:     Uses document.querySelectorAll (current RPA executor)
 *   - testing-library-dom: Uses @testing-library/dom semantic queries
 *   - ai-vision:     Future — uses screenshot + LLM
 */

import log from 'electron-log';

// ─── Types ───────────────────────────────────────────────────────────

export interface ElementInfo {
  tag: string;
  role: string | null;
  text: string;
  label: string;
  name: string | null;
  id: string | null;
  type: string | null;
  value: string | null;
  disabled: boolean;
  checked: boolean;
  selected: boolean;
  rect: { top: number; left: number; width: number; height: number } | null;
}

export interface FindResult {
  found: boolean;
  selector?: string;
  error?: string;
  method?: string; // which provider resolved it
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  options?: Record<string, any>;
}

export interface RpaProviderConfig {
  chain: string[];
  fallback: boolean;
  providers: Record<string, ProviderConfig>;
}

// Default config (matching cloud defaults)
export const DEFAULT_RPA_CONFIG: RpaProviderConfig = {
  chain: ['testing-library-dom', 'native-dom'],
  fallback: true,
  providers: {
    'native-dom': { enabled: true, priority: 2 },
    'testing-library-dom': { enabled: true, priority: 1, options: { timeout: 5000 } },
    'ai-vision': { enabled: false, priority: 99, options: { model: 'gpt-4o' } },
  },
};

// ─── Provider Interface ──────────────────────────────────────────────

export interface RpaProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Find an element on the page by a natural-language target string.
   * Targets look like: "button 'Sign In'", "text field labeled 'Email'",
   * "link with text 'Docs'", or raw CSS selectors as fallback.
   */
  findElement(webContents: Electron.WebContents, target: string): Promise<FindResult>;

  /**
   * Extract the accessibility tree — all interactive elements on the page.
   * Used by the cloud LLM to plan the action sequence.
   */
  getAccessibilityTree(webContents: Electron.WebContents): Promise<ElementInfo[]>;
}

// ─── Native DOM Provider ─────────────────────────────────────────────

export class NativeDomProvider implements RpaProvider {
  readonly id = 'native-dom';
  readonly name = 'Native DOM Automation';

  async findElement(webContents: Electron.WebContents, target: string): Promise<FindResult> {
    try {
      // Try as CSS selector first
      const exists = await webContents.executeJavaScript(
        `!!document.querySelector(${JSON.stringify(target)})`,
      );
      if (exists) {
        return { found: true, selector: target, method: 'native-dom' };
      }
    } catch { /* ignore */ }

    // Try by text content
    try {
      const found = await webContents.executeJavaScript(`
        (function() {
          var all = document.querySelectorAll('button, a, input, [role="button"], [role="link"]');
          var text = ${JSON.stringify(target)};
          for (var i = 0; i < all.length; i++) {
            if (all[i].textContent.trim().toLowerCase() === text.toLowerCase()) {
              all[i].scrollIntoView({ behavior: 'instant', block: 'center' });
              return true;
            }
            if (all[i].textContent.trim().toLowerCase().includes(text.toLowerCase())) {
              all[i].scrollIntoView({ behavior: 'instant', block: 'center' });
              return true;
            }
          }
          return false;
        })()
      `);
      if (found) return { found: true, method: 'native-dom' };
    } catch { /* ignore */ }

    return { found: false, error: `Native DOM: could not find "${target}"` };
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

// ─── Testing Library DOM Provider ────────────────────────────────────

export class TestingLibraryDomProvider implements RpaProvider {
  readonly id = 'testing-library-dom';
  readonly name = 'Testing Library DOM';

  async findElement(webContents: Electron.WebContents, target: string): Promise<FindResult> {
    try {
      // Parse the target: "role 'name'" or "text 'content'" or "labeled 'label'"
      const parsed = this.parseTarget(target);
      
      const result = await webContents.executeJavaScript(`
        (function() {
          try {
            var target = ${JSON.stringify(target)};
            var mode = ${JSON.stringify(parsed.mode)};
            var value = ${JSON.stringify(parsed.value)};
            var container = document.body;
            if (!container) return { found: false, error: 'no body' };

            // Find element via testing-library queries injected into page context
            // We re-implement the key patterns here since @testing-library/dom
            // runs in Node context, not page context.
            var allElements = container.querySelectorAll('*');

            // Strategy 1: role + name match
            if (mode === 'role') {
              var roleTarget = value.role || value;
              var nameTarget = value.name || '';
              for (var i = 0; i < allElements.length; i++) {
                var el = allElements[i];
                var elRole = el.getAttribute('role') || el.tagName.toLowerCase();
                if (elRole !== roleTarget.toLowerCase()) continue;
                var accessibleName = el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('title') || el.placeholder || '';
                if (accessibleName.toLowerCase().includes(nameTarget.toLowerCase())) {
                  el.scrollIntoView({ behavior: 'instant', block: 'center' });
                  return { found: true, method: 'testing-library-dom/role' };
                }
              }
              return { found: false, error: 'role not found' };
            }

            // Strategy 2: label match (for inputs)
            if (mode === 'label') {
              var labelText = value;
              // Check aria-label
              for (var i = 0; i < allElements.length; i++) {
                var el = allElements[i];
                var ariaLabel = el.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.toLowerCase().includes(labelText.toLowerCase())) {
                  el.scrollIntoView({ behavior: 'instant', block: 'center' });
                  return { found: true, method: 'testing-library-dom/label' };
                }
              }
              // Check for label elements
              var labels = container.querySelectorAll('label');
              for (var i = 0; i < labels.length; i++) {
                if (labels[i].textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
                  var forId = labels[i].getAttribute('for');
                  if (forId) {
                    var input = document.getElementById(forId);
                    if (input) {
                      input.scrollIntoView({ behavior: 'instant', block: 'center' });
                      return { found: true, method: 'testing-library-dom/label' };
                    }
                  }
                }
              }
              // Check placeholder
              for (var i = 0; i < allElements.length; i++) {
                var el = allElements[i];
                var placeholder = el.getAttribute('placeholder');
                if (placeholder && placeholder.toLowerCase().includes(labelText.toLowerCase())) {
                  el.scrollIntoView({ behavior: 'instant', block: 'center' });
                  return { found: true, method: 'testing-library-dom/placeholder' };
                }
              }
              return { found: false, error: 'label not found' };
            }

            // Strategy 3: text match
            if (mode === 'text') {
              var textValue = value;
              for (var i = 0; i < allElements.length; i++) {
                var el = allElements[i];
                var text = el.textContent.trim().toLowerCase();
                if (text === textValue.toLowerCase() || text.includes(textValue.toLowerCase())) {
                  el.scrollIntoView({ behavior: 'instant', block: 'center' });
                  return { found: true, method: 'testing-library-dom/text' };
                }
              }
              return { found: false, error: 'text not found' };
            }

            // Strategy 4: raw CSS selector fallback
            try {
              var cssEl = container.querySelector(value);
              if (cssEl) {
                cssEl.scrollIntoView({ behavior: 'instant', block: 'center' });
                return { found: true, method: 'testing-library-dom/css' };
              }
            } catch {}

            return { found: false, error: 'no strategy matched' };
          } catch (e) {
            return { found: false, error: String(e) };
          }
        })()
      `);

      if (result?.found) {
        return { found: true, method: result.method || 'testing-library-dom' };
      }
      return { found: false, error: result?.error || 'Testing Library: no match' };
    } catch (error) {
      return { found: false, error: `Testing Library error: ${String(error)}` };
    }
  }

  async getAccessibilityTree(webContents: Electron.WebContents): Promise<ElementInfo[]> {
    // Use the same tree as native-dom (both work on the same DOM)
    const provider = new NativeDomProvider();
    return provider.getAccessibilityTree(webContents);
  }

  private parseTarget(target: string): { mode: string; value: any } {
    // "button 'Sign In'" → { mode: 'role', value: { role: 'button', name: 'Sign In' } }
    // "text field labeled 'Email'" → { mode: 'label', value: 'Email' }
    // "link with text 'Docs'" → { mode: 'text', value: 'Docs' }
    // "#email-input" → { mode: 'css', value: '#email-input' }
    
    const roleMatch = target.match(/^(button|link|textbox|combobox|checkbox|radio|heading|img)\s+'(.+)'$/i);
    if (roleMatch) {
      return { mode: 'role', value: { role: roleMatch[1], name: roleMatch[2] } };
    }

    const textMatch = target.match(/^(?:.*?\b)text\s+'(.+)'$/i);
    if (textMatch) {
      return { mode: 'text', value: textMatch[1] };
    }

    const labelMatch = target.match(/label(?:ed)?\s+'(.+)'$/i);
    if (labelMatch) {
      return { mode: 'label', value: labelMatch[1] };
    }

    // Default: treat as CSS selector or generic label
    if (target.startsWith('#') || target.startsWith('.') || target.startsWith('[')) {
      return { mode: 'css', value: target };
    }

    return { mode: 'label', value: target };
  }
}

// ─── Provider Resolver ───────────────────────────────────────────────

let activeConfig: RpaProviderConfig = DEFAULT_RPA_CONFIG;

const providers = new Map<string, RpaProvider>([
  ['native-dom', new NativeDomProvider()],
  ['testing-library-dom', new TestingLibraryDomProvider()],
]);

export function setRpaProviderConfig(config: RpaProviderConfig): void {
  activeConfig = config;
  log.info(`[RpaProvider] Config loaded: chain=[${config.chain.join(', ')}] fallback=${config.fallback}`);
}

export function getRpaProviderConfig(): RpaProviderConfig {
  return activeConfig;
}

export function getRegisteredProvider(id: string): RpaProvider | undefined {
  return providers.get(id);
}

/**
 * Find an element using the configured provider chain.
 * Tries each provider in order until one succeeds.
 */
export async function findElement(
  webContents: Electron.WebContents,
  target: string,
): Promise<FindResult> {
  for (const providerId of activeConfig.chain) {
    const provider = providers.get(providerId);
    if (!provider) {
      log.warn(`[RpaProvider] Unknown provider: ${providerId}`);
      continue;
    }

    const providerCfg = activeConfig.providers[providerId];
    if (!providerCfg?.enabled) continue;

    const result = await provider.findElement(webContents, target);
    if (result.found) {
      log.info(`[RpaProvider] "${target}" → ${result.method} (priority ${providerCfg.priority})`);
      return result;
    }
  }

  // All providers failed
  return { found: false, error: `All providers failed for "${target}"` };
}

/**
 * Extract the accessibility tree using the first available provider.
 */
export async function getAccessibilityTree(
  webContents: Electron.WebContents,
): Promise<ElementInfo[]> {
  for (const providerId of activeConfig.chain) {
    const provider = providers.get(providerId);
    if (!provider) continue;
    const providerCfg = activeConfig.providers[providerId];
    if (!providerCfg?.enabled) continue;

    try {
      const tree = await provider.getAccessibilityTree(webContents);
      if (tree.length > 0) return tree;
    } catch { /* try next */ }
  }
  return [];
}
