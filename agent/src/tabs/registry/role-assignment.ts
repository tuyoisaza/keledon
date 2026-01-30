/**
 * Role Assignment for Multi-tab Coordination
 * Assigns roles (audio+ui vs ui-only) to extension tabs
 */

export interface TabRole {
  id: string;
  type: 'audio-ui' | 'ui-only' | 'background';
  priority: number;
  lastActive: number;
  capabilities: {
    audio: boolean;
    ui: boolean;
    storage: boolean;
  };
}

export interface RoleAssignmentOptions {
  maxAudioTabs?: number;
  defaultRole?: 'audio-ui' | 'ui-only';
  priorityRules?: Record<string, number>;
}

export class RoleAssigner {
  private tabs: Map<string, TabRole> = new Map();
  private readonly options: Required<RoleAssignmentOptions>;
  private readonly rolePriority: Record<string, number> = {
    'audio-ui': 3,
    'ui-only': 2,
    'background': 1
  };

  constructor(options: RoleAssignmentOptions = {}) {
    this.options = {
      maxAudioTabs: options.maxAudioTabs ?? 1,
      defaultRole: options.defaultRole ?? 'ui-only',
      priorityRules: options.priorityRules ?? {}
    };
  }

  /**
   * Register a new tab
   */
  registerTab(tabId: string, url: string, capabilities: Partial<TabRole['capabilities']> = {}): TabRole {
    const existing = this.tabs.get(tabId);
    if (existing) {
      return existing;
    }

    const roleType = this.determineRole(url, capabilities);
    const role: TabRole = {
      id: tabId,
      type: roleType,
      priority: this.getRolePriority(roleType),
      lastActive: Date.now(),
      capabilities: {
        audio: capabilities.audio ?? false,
        ui: capabilities.ui ?? true,
        storage: capabilities.storage ?? true
      }
    };

    this.tabs.set(tabId, role);
    return role;
  }

  /**
   * Update tab activity
   */
  updateActivity(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.lastActive = Date.now();
    }
  }

  /**
   * Get primary audio tab
   */
  getPrimaryAudioTab(): TabRole | undefined {
    const audioTabs = Array.from(this.tabs.values())
      .filter(tab => tab.type === 'audio-ui')
      .sort((a, b) => b.priority - a.priority);
    
    return audioTabs.length > 0 ? audioTabs[0] : undefined;
  }

  /**
   * Get all UI tabs
   */
  getUITabs(): TabRole[] {
    return Array.from(this.tabs.values()).filter(tab => tab.capabilities.ui);
  }

  /**
   * Determine role based on URL and capabilities
   */
  private determineRole(url: string, capabilities: Partial<TabRole['capabilities']>): TabRole['type'] {
    // Check for audio capabilities first
    if (capabilities.audio && this.canAssignAudioRole()) {
      return 'audio-ui';
    }

    // Check URL patterns
    if (url.includes('genesys') || url.includes('salesforce')) {
      return 'audio-ui';
    }

    // Default to UI-only
    return this.options.defaultRole;
  }

  /**
   * Check if we can assign audio role (respecting maxAudioTabs)
   */
  private canAssignAudioRole(): boolean {
    const audioTabs = Array.from(this.tabs.values()).filter(tab => tab.type === 'audio-ui');
    return audioTabs.length < this.options.maxAudioTabs!;
  }

  /**
   * Get role priority value
   */
  private getRolePriority(roleType: TabRole['type']): number {
    return this.rolePriority[roleType] || 1;
  }

  /**
   * Get tab by ID
   */
  getTab(tabId: string): TabRole | undefined {
    return this.tabs.get(tabId);
  }

  /**
   * Remove tab
   */
  removeTab(tabId: string): void {
    this.tabs.delete(tabId);
  }

  /**
   * Get all tabs
   */
  getAllTabs(): TabRole[] {
    return Array.from(this.tabs.values());
  }

  /**
   * Get tabs by role type
   */
  getTabsByRole(roleType: TabRole['type']): TabRole[] {
    return Array.from(this.tabs.values()).filter(tab => tab.type === roleType);
  }

  /**
   * Get active tabs (last active within 5 minutes)
   */
  getActiveTabs(): TabRole[] {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return Array.from(this.tabs.values()).filter(tab => tab.lastActive > fiveMinutesAgo);
  }

  /**
   * Assign roles to multiple tabs
   */
  assignRoles(tabIds: string[], urls: string[], capabilitiesList: Partial<TabRole['capabilities']>[] = []): TabRole[] {
    return tabIds.map((tabId, index) => {
      const url = urls[index] || '';
      const capabilities = capabilitiesList[index] || {};
      return this.registerTab(tabId, url, capabilities);
    });
  }
}

// Export singleton instance
export const roleAssigner = new RoleAssigner();