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

export class TabManager {
  private tabs: Tab[] = [];
  private activeTabId: string = 'home';
  private homeUrl: string;
  private mainWindow: BrowserWindow | null = null;

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

    view.webContents.setWindowOpenHandler(({ url }) => {
      this.createTab('New Tab', url);
      return { action: 'deny' };
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

    this.mainWindow.addBrowserView(tab.view);
    const contentSize = this.mainWindow.getContentSize();
    tab.view.setBounds({
      x: 0, y: CHROME_HEIGHT,
      width: contentSize[0], height: contentSize[1] - CHROME_HEIGHT
    });
    tab.view.webContents.focus();

    this.activeTabId = tabId;
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

  resizeTabs() {
    if (!this.mainWindow) return;
    const contentSize = this.mainWindow.getContentSize();
    for (const tab of this.tabs) {
      if (tab.view) {
        tab.view.setBounds({
          x: 0, y: CHROME_HEIGHT,
          width: contentSize[0], height: contentSize[1] - CHROME_HEIGHT
        });
      }
    }
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
