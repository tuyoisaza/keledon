import log from 'electron-log';
import { chromium, Browser, BrowserContext } from 'playwright-core';
import type { Page } from 'playwright-core';

/**
 * CDP Connection — optional fallback for headless / Playwright-based browsing.
 * Uses Chrome DevTools Protocol to connect to an existing browser instance.
 */

let cdpBrowser: Browser | null = null;
let cdpContext: BrowserContext | null = null;

const CDP_PORT = parseInt(process.env.KELEDON_CDP_PORT || '9222', 10);

export function getCdpBrowser(): Browser | null { return cdpBrowser; }
export function getCdpContext(): BrowserContext | null { return cdpContext; }
export function getCdpPort(): number { return CDP_PORT; }

export async function connectCDP(electronTabs: { id: string; url: string; view: { webContents: { getURL(): string } } | null }[], activeTabId: string): Promise<{ browser: Browser; page: Page } | null> {
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

    for (let i = pages.length - 1; i >= 0; i--) {
      try {
        const pageUrl = pages[i].url();
        if (pageUrl && pageUrl !== 'about:blank' && pageUrl !== '') {
          log.info(`[AutoBrowse] Using fallback page: ${pageUrl}`);
          return { browser: cdpBrowser, page: pages[i] };
        }
      } catch { /* skip */ }
    }

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

export async function disconnectCDP(): Promise<void> {
  if (cdpBrowser) {
    try { await cdpBrowser.close(); } catch { /* ignore */ }
    cdpBrowser = null;
    cdpContext = null;
  }
}
