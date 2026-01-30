// KELDON ACTION BLOCKS V1
// Deterministic, Atomic, Fail-safe.

export const ActionBlocks = {
    /**
     * Waits for an element to appear in the DOM.
     * @param {string} selector - CSS Selector
     * @param {number} timeout - ms to wait (default 5000)
     */
    wait_for: async (tabId, { selector, timeout = 5000 }) => {
        return chrome.scripting.executeScript({
            target: { tabId },
            func: (sel, to) => {
                return new Promise((resolve, reject) => {
                    if (document.querySelector(sel)) {
                        return resolve({ status: 'SUCCESS' });
                    }
                    const observer = new MutationObserver(() => {
                        if (document.querySelector(sel)) {
                            observer.disconnect();
                            resolve({ status: 'SUCCESS' });
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                    setTimeout(() => {
                        observer.disconnect();
                        reject(new Error(`Timeout waiting for ${sel}`));
                    }, to);
                });
            },
            args: [selector, timeout]
        });
    },

    /**
     * Clicks an element. Fails if not found or not visible.
     * @param {string} selector 
     */
    click: async (tabId, { selector }) => {
        return chrome.scripting.executeScript({
            target: { tabId },
            func: (sel) => {
                const el = document.querySelector(sel);
                if (!el) throw new Error(`Element ${sel} not found`);
                // Simple visibility check
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) throw new Error(`Element ${sel} is not visible`);

                el.click();
                return { status: 'SUCCESS' };
            },
            args: [selector]
        });
    },

    /**
     * Fills an input. Clears it first.
     * @param {string} selector 
     * @param {string} value 
     */
    fill: async (tabId, { selector, value }) => {
        return chrome.scripting.executeScript({
            target: { tabId },
            func: (sel, val) => {
                const el = document.querySelector(sel);
                if (!el) throw new Error(`Element ${sel} not found`);
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return { status: 'SUCCESS' };
            },
            args: [selector, value]
        });
    },

    /**
     * Reads text or attribute from an element.
     * @param {string} selector 
     * @param {string} attribute - Optional (if null, reads innerText)
     */
    read: async (tabId, { selector, attribute }) => {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
            func: (sel, attr) => {
                const el = document.querySelector(sel);
                if (!el) throw new Error(`Element ${sel} not found`);
                const val = attr ? el.getAttribute(attr) : el.innerText;
                return { status: 'SUCCESS', data: val };
            },
            args: [selector, attribute]
        });
        return result[0].result;
    },

    /**
     * Navigates the tab to a URL.
     * @param {string} url
     */
    navigate: async (tabId, { url }) => {
        await chrome.tabs.update(tabId, { url });
        // Wait for complete? For now, we assume simple update.
        // A "wait_for_load" block is usually better.
        return { status: 'SUCCESS' };
    }
};
