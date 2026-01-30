// agent/src/tabs/registry/tab-discovery.ts
/**
 * Tab Discovery Module
 * Handles discovering and tracking all extension tabs
 * Implements tab registry functionality for multi-tab coordination
 */

export class TabDiscovery {
  private static instance: TabDiscovery;
  private tabs: Map<string, chrome.tabs.Tab> = new Map();
  private activeTabId: string | null = null;

  private constructor() {}

  public static getInstance(): TabDiscovery {
    if (!TabDiscovery.instance) {
      TabDiscovery.instance = new TabDiscovery();
    }
    return TabDiscovery.instance;
  }

  /**
   * Discover all open tabs with the extension
   */
  public async discoverTabs(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ url: '*://*/*' });
      this.tabs.clear();
      
      for (const tab of tabs) {
        // Filter tabs that have our extension content scripts
        if (tab.url && tab.url.includes('chrome-extension')) {
          this.tabs.set(tab.id.toString(), tab);
        }
      }
      
      // Set active tab if available
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab[0]) {
        this.activeTabId = activeTab[0].id?.toString() || null;
      }
    } catch (error) {
      console.error('Tab discovery failed:', error);
    }
  }

  /**
   * Get tab by ID
   */
  public getTab(tabId: string): chrome.tabs.Tab | undefined {
    return this.tabs.get(tabId);
  }

  /**
   * Get active tab
   */
  public getActiveTab(): chrome.tabs.Tab | null {
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      return this.tabs.get(this.activeTabId) || null;
    }
    return null;
  }

  /**
   * Get all registered tabs
   */
  public getAllTabs(): chrome.tabs.Tab[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Update active tab
   */
  public updateActiveTab(tabId: string): void {
    this.activeTabId = tabId;
  }
}

// Initialize singleton
export const tabDiscovery = TabDiscovery.getInstance();

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    tabDiscovery.discoverTabs();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabDiscovery.discoverTabs();
});