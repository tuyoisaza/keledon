/**
 * Browser-tab registry for vendor-neutral CRM and contact-center workflows.
 */

import { RoleAssigner, RoleAssignmentOptions } from './role-assignment';

export type TabInfoRole = 'audio+ui' | 'ui-only';

export interface TabInfo extends chrome.tabs.Tab {
  id: number;
  url: string;
  type: TabInfoRole;
  isFocused: boolean;
  lastActive: number;
  capabilities: {
    audio: boolean;
    ui: boolean;
    storage: boolean;
    rpa: boolean;
    microphone: boolean;
  };
}

const EXPIRED_AFTER_MS = 30 * 60 * 1000;

function isHttpUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Tracks open business tabs and keeps active-tab/role state synchronized. */
export class TabRegistry {
  private static instance: TabRegistry | undefined;
  private readonly tabs = new Map<number, TabInfo>();
  private readonly roleAssigner: RoleAssigner;
  private activeTabId: number | null = null;

  private readonly handleCreated = (tab: chrome.tabs.Tab): void => {
    this.register(tab);
  };

  private readonly handleUpdated = (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab,
  ): void => {
    const previous = this.tabs.get(tabId);
    if (!previous && !tab.url) return;
    const updated = this.register({
      ...previous,
      ...tab,
      ...changeInfo,
      id: tabId,
    });
    if (!updated) this.removeTab(tabId);
  };

  private readonly handleRemoved = (tabId: number): void => {
    this.removeTab(tabId);
  };

  private readonly handleActivated = (
    activeInfo: chrome.tabs.TabActiveInfo,
  ): void => {
    this.setActiveTab(activeInfo.tabId, true);
  };

  constructor(options: RoleAssignmentOptions = {}) {
    this.roleAssigner = new RoleAssigner({ maxAudioTabs: 2, ...options });
    chrome.tabs.onCreated.addListener(this.handleCreated);
    chrome.tabs.onUpdated.addListener(this.handleUpdated);
    chrome.tabs.onRemoved.addListener(this.handleRemoved);
    chrome.tabs.onActivated.addListener(this.handleActivated);
  }

  static getInstance(): TabRegistry {
    if (!TabRegistry.instance) TabRegistry.instance = new TabRegistry();
    return TabRegistry.instance;
  }

  async discoverTabs(): Promise<TabInfo[]> {
    const browserTabs = await chrome.tabs.query({});
    this.tabs.clear();
    this.roleAssigner.clear();

    for (const tab of browserTabs) {
      if (
        typeof tab.id === 'number' &&
        tab.url &&
        isHttpUrl(tab.url) &&
        this.roleAssigner.isConfiguredTrackedUrl(tab.url)
      ) {
        this.register(tab);
      }
    }

    const activeTab = browserTabs.find(
      (tab) => tab.active && typeof tab.id === 'number' && this.tabs.has(tab.id),
    );
    this.setActiveTab(activeTab?.id ?? null);
    return this.getAllTabs();
  }

  getTab(tabId: number | string): TabInfo | undefined {
    const numericId = typeof tabId === 'number' ? tabId : Number(tabId);
    return Number.isFinite(numericId) ? this.tabs.get(numericId) : undefined;
  }

  getActiveTab(): TabInfo | null {
    return this.activeTabId === null
      ? null
      : (this.tabs.get(this.activeTabId) ?? null);
  }

  getAllTabs(): TabInfo[] {
    return Array.from(this.tabs.values());
  }

  getAudioTabs(): TabInfo[] {
    return this.getAllTabs().filter((tab) => tab.type === 'audio+ui');
  }

  getUITabs(): TabInfo[] {
    return this.getAllTabs().filter((tab) => tab.type === 'ui-only');
  }

  getPrimaryAudioTab(): TabInfo | undefined {
    return this.getAudioTabs().sort((left, right) => {
      if (left.isFocused !== right.isFocused) {
        return left.isFocused ? -1 : 1;
      }
      return right.lastActive - left.lastActive;
    })[0];
  }

  setActiveTab(tabId: number | null, markActivity = false): void {
    if (this.activeTabId !== null) {
      const previous = this.tabs.get(this.activeTabId);
      if (previous) previous.isFocused = false;
    }

    this.activeTabId = tabId !== null && this.tabs.has(tabId) ? tabId : null;
    if (this.activeTabId !== null) {
      const active = this.tabs.get(this.activeTabId);
      if (active) {
        active.isFocused = true;
        if (markActivity) active.lastActive = Date.now();
      }
    }
  }

  updateActiveTab(tabId: number | string): void {
    const numericId = typeof tabId === 'number' ? tabId : Number(tabId);
    if (Number.isFinite(numericId)) this.setActiveTab(numericId);
  }

  async refreshTab(tabId: number | string): Promise<TabInfo | undefined> {
    const numericId = typeof tabId === 'number' ? tabId : Number(tabId);
    if (!Number.isFinite(numericId)) return undefined;
    const tab = await chrome.tabs.get(numericId);
    const updated = this.register(tab);
    if (!updated) this.removeTab(numericId);
    return updated;
  }

  removeTab(tabId: number | string): void {
    const numericId = typeof tabId === 'number' ? tabId : Number(tabId);
    if (!Number.isFinite(numericId)) return;
    this.tabs.delete(numericId);
    this.roleAssigner.removeTab(String(numericId));
    if (this.activeTabId === numericId) this.activeTabId = null;
  }

  cleanupExpiredTabs(now = Date.now()): void {
    for (const tab of this.tabs.values()) {
      if (now - tab.lastActive > EXPIRED_AFTER_MS) this.removeTab(tab.id);
    }
  }

  getStatus(): {
    totalTabs: number;
    audioTabs: number;
    uiTabs: number;
    activeTab: number | null;
  } {
    return {
      totalTabs: this.tabs.size,
      audioTabs: this.getAudioTabs().length,
      uiTabs: this.getUITabs().length,
      activeTab: this.activeTabId,
    };
  }

  private register(tab: chrome.tabs.Tab): TabInfo | undefined {
    if (
      typeof tab.id !== 'number' ||
      !tab.url ||
      !isHttpUrl(tab.url) ||
      !this.roleAssigner.isConfiguredTrackedUrl(tab.url)
    ) {
      return undefined;
    }

    const role = this.roleAssigner.registerTab(
      String(tab.id),
      tab.url,
      { audio: this.roleAssigner.isConfiguredAudioUrl(tab.url) },
    );
    const capabilities = (tab as chrome.tabs.Tab & { permissions?: string[] })
      .permissions;
    const info: TabInfo = {
      ...tab,
      id: tab.id,
      url: tab.url,
      type: role.type === 'audio-ui' ? 'audio+ui' : 'ui-only',
      isFocused: tab.active ?? false,
      lastActive: Number((tab as chrome.tabs.Tab & { lastActive?: number }).lastActive) || 0,
      capabilities: {
        audio: role.capabilities.audio,
        ui: role.capabilities.ui,
        storage: role.capabilities.storage,
        rpa: this.roleAssigner.isConfiguredAudioUrl(tab.url),
        microphone:
          capabilities?.includes('microphone') ??
          this.roleAssigner.isConfiguredAudioUrl(tab.url),
      },
    };

    this.tabs.set(tab.id, info);
    if (tab.active) this.setActiveTab(tab.id);
    return info;
  }
}

export { TabRegistry as TabDiscovery };

export type TabRole = TabInfoRole;
export const tabRegistry = TabRegistry.getInstance();
export const tabDiscovery = tabRegistry;
