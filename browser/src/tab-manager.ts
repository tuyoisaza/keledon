import { BrowserWindow, BrowserView } from 'electron';
import * as path from 'path';
import log from 'electron-log';
import { eventLogger } from './media/event-logger.js';
import type { TabInfo } from './types.js';

export interface Tab {
  id: string;
  name: string;
  url: string;
  view: Electron.BrowserView | null;
}

const CHROME_HEIGHT = 80;
const MIN_VISIBLE_BROWSER_WIDTH = 320;

export interface ChromeOverlayState {
  rightInset?: number;
  hideContent?: boolean;
  reason?: string;
}

export class TabManager {
  private tabs: Tab[] = [];
  private activeTabId: string = 'home';
  private homeUrl: string;
  private mainWindow: BrowserWindow | null = null;
  private chromeOverlayState: Required<ChromeOverlayState> = {
    rightInset: 0,
    hideContent: false,
    reason: 'none',
  };

  constructor() {
    this.homeUrl = 'file://' + path.join(__dirname, '../renderer/index.html');
  }

  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  createTab(name: string, url: string): Tab {
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    eventLogger.info('tabs', 'tab_create', { id, name, url });

    if (!this.mainWindow) {
      return { id, name, url, view: null };
    }

    const view = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: false
      }
    });

    // Use a modern Chrome UA so Google Meet & other web apps don't reject us.
    // Our engine is Chromium v120 but the version string is just a server-side check.
    // Override via KELEDON_CHROME_VERSION env var in main.ts (same default).
    const spoofedChrome = process.env.KELEDON_CHROME_VERSION || '130.0.6723.92';
    view.webContents.setUserAgent(
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${spoofedChrome} Safari/537.36`
    );

    view.webContents.on('did-navigate', (_event: Electron.Event, navigatedUrl: string) => {
      const tab = this.tabs.find(t => t.id === id);
      if (tab) { tab.url = navigatedUrl; }
      this.mainWindow?.webContents.send('tabs:updated', this.getTabs());
      this.broadcastTabs();
      log.info(`[Tabs] did-navigate: ${id} -> ${navigatedUrl}`);
    });

    view.webContents.on('page-title-updated', (_event: Electron.Event, title: string) => {
      const tab = this.tabs.find(t => t.id === id);
      if (tab) { tab.name = title || name; }
      this.mainWindow?.webContents.send('tabs:updated', this.getTabs());
      log.info(`[Tabs] page-title-updated: ${id} -> ${title}`);
    });

    view.webContents.on('did-start-loading', () => {
      this.mainWindow?.webContents.send('tabs:updated', this.getTabs());
    });

    view.webContents.on('did-stop-loading', () => {
      this.mainWindow?.webContents.send('tabs:updated', this.getTabs());
    });

    view.webContents.on('did-fail-load', (_event: Electron.Event, errorCode: number, errorDesc: string, validatedURL: string) => {
      if (errorCode !== -3) {
        log.warn(`[Tabs] did-fail-load: ${id} error=${errorCode} desc=${errorDesc} url=${validatedURL}`);
      }
      this.mainWindow?.webContents.send('tabs:updated', this.getTabs());
    });

    // Intercept window.Notification() so Google Meet calls trigger native OS notifications.
    // The page's Notification API may be a no-op in Electron BrowserView. We override it
    // at did-finish-load so our preload bridge (__keledonBridge.notify) relays to the main
    // process, which creates an Electron Notification that pops natively on Windows.
    view.webContents.on('did-finish-load', () => {
      view.webContents.executeJavaScript(`
        try {
          if (window.__keledonNotifPatched) return;
          window.__keledonNotifPatched = true;
          const Orig = window.Notification;
          const Patched = function(title, opts) {
            if (window.__keledonBridge) {
              window.__keledonBridge.notify(title, opts || {});
            }
            return new Orig(title, opts);
          };
          Patched.prototype = Orig.prototype;
          Patched.requestPermission = Orig.requestPermission;
          Patched.permission = Orig.permission;
          Patched.maxActions = Orig.maxActions;
          window.Notification = Patched;
        } catch(e) {
          console.warn('[KELEDON] patch Notification:', e);
        }
      `).catch(() => {});
    });

    view.webContents.setWindowOpenHandler(({ url }) => {
      this.createTab('New Tab', url);
      return { action: 'deny' };
    });

    // Capture page JavaScript console logs and forward to the renderer
    view.webContents.on('console-message', (_event: Electron.Event, level: number, message: string, line: number, sourceId: string) => {
      const levelLabel = ['verbose', 'info', 'warning', 'error'][level] || 'unknown';
      this.mainWindow?.webContents.send('console:entry', {
        level: levelLabel,
        message,
        line,
        sourceId,
        tabId: id,
        timestamp: new Date().toISOString()
      });
    });

    view.webContents.loadURL(url);

    const tab: Tab = { id, name, url, view };
    this.tabs.push(tab);
    eventLogger.info('tabs', 'tab_created', { id, name, url });

    if (this.activeTabId === 'home' || !this.tabs.find(t => t.id === this.activeTabId)) {
      this.activeTabId = id;
      this.showTab(id);
    }

    log.info('[Tabs] Created tab:', name, id);
    this.broadcastTabs();

    return tab;
  }

  showTab(tabId: string) {
    if (!this.mainWindow) return;

    const currentView = this.mainWindow.getBrowserView();
    if (currentView) {
      try { this.mainWindow.removeBrowserView(currentView); } catch (e) {}
    }

    if (tabId === 'home') {
      this.activeTabId = 'home';
      this.broadcastTabs();
      return;
    }

    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab || !tab.view) {
      log.warn('[Tabs] showTab: tab not found or no view:', tabId);
      this.activeTabId = tabId;
      this.broadcastTabs();
      return;
    }

    this.activeTabId = tabId;
    if (this.chromeOverlayState.hideContent) {
      log.info('[Tabs] Active BrowserView kept detached for KELEDON overlay:', this.chromeOverlayState.reason);
    } else {
      this.mainWindow.addBrowserView(tab.view);
      this.applyActiveTabBounds();
      tab.view.webContents.focus();
    }
    log.info('[Tabs] Switched to:', tab.name);
    this.broadcastTabs();
  }

  closeTab(tabId: string) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.view && this.mainWindow) {
      try { this.mainWindow.removeBrowserView(tab.view); } catch (e) {}
    }

    this.tabs = this.tabs.filter(t => t.id !== tabId);

    if (this.activeTabId === tabId) {
      const nextTab = this.tabs[0] || { id: 'home', name: 'Home', url: this.homeUrl, view: null };
      this.activeTabId = nextTab.id;
      this.showTab(nextTab.id);
    }

    log.info('[Tabs] Closed tab:', tabId);
    this.broadcastTabs();
  }

  openDevTools() {
    const activeTab = this.getActiveTab();
    if (activeTab?.view) {
      if (activeTab.view.webContents.isDevToolsOpened()) {
        activeTab.view.webContents.closeDevTools();
      } else {
        activeTab.view.webContents.openDevTools({ mode: 'detach' });
      }
    }
  }

  getTabs(): TabInfo[] {
    return this.tabs.map(t => ({
      id: t.id,
      name: t.name,
      url: t.view ? t.view.webContents.getURL() : t.url,
      active: t.id === this.activeTabId,
      loading: t.view ? t.view.webContents.isLoading() : false,
      canGoBack: t.view ? t.view.webContents.canGoBack() : false,
      canGoForward: t.view ? t.view.webContents.canGoForward() : false
    }));
  }

  getInternalTabs(): Tab[] { return this.tabs; }
  getActiveTabId(): string { return this.activeTabId; }
  getHomeUrl(): string { return this.homeUrl; }

  setActiveTabId(id: string) { this.activeTabId = id; }

  setChromeOverlayState(state: ChromeOverlayState) {
    const nextRightInset = Math.max(0, Math.floor(Number(state.rightInset || 0)));
    this.chromeOverlayState = {
      rightInset: nextRightInset,
      hideContent: Boolean(state.hideContent),
      reason: state.reason || (state.hideContent ? 'overlay' : nextRightInset > 0 ? 'inset' : 'none'),
    };
    this.applyActiveTabBounds();
  }

  private getActiveTab(): Tab | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  private getBrowserBounds() {
    if (!this.mainWindow) {
      return { x: 0, y: CHROME_HEIGHT, width: MIN_VISIBLE_BROWSER_WIDTH, height: 1 };
    }
    const [contentWidth, contentHeight] = this.mainWindow.getContentSize();
    const safeRightInset = Math.min(
      Math.max(0, this.chromeOverlayState.rightInset),
      Math.max(0, contentWidth - MIN_VISIBLE_BROWSER_WIDTH),
    );
    return {
      x: 0,
      y: CHROME_HEIGHT,
      width: Math.max(MIN_VISIBLE_BROWSER_WIDTH, contentWidth - safeRightInset),
      height: Math.max(1, contentHeight - CHROME_HEIGHT),
    };
  }

  private applyActiveTabBounds() {
    if (!this.mainWindow) return;
    const activeTab = this.getActiveTab();
    if (!activeTab?.view) return;

    const currentView = this.mainWindow.getBrowserView();
    if (this.chromeOverlayState.hideContent) {
      if (currentView === activeTab.view) {
        try { this.mainWindow.removeBrowserView(activeTab.view); } catch (e) {}
      }
      return;
    }

    if (currentView !== activeTab.view) {
      if (currentView) {
        try { this.mainWindow.removeBrowserView(currentView); } catch (e) {}
      }
      this.mainWindow.addBrowserView(activeTab.view);
    }
    activeTab.view.setBounds(this.getBrowserBounds());
  }

  resizeTabs() {
    if (!this.mainWindow) return;
    this.applyActiveTabBounds();
  }

  broadcastTabs() {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('tabs:updated', this.getTabs());
    }
    (async () => {
      try {
        const bridge = await import('./autobrowse-bridge.js');
        bridge.setTabs(this.tabs, this.activeTabId);
      } catch { /* bridge not loaded yet */ }
    })();
  }
}
