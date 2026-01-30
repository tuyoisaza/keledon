/**
 * Tab Management Tests
 * Unit tests for tab discovery and role assignment
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onCreated: { addListener: jest.fn(), removeListener: jest.fn() },
    onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
    onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
    onActivated: { addListener: jest.fn(), removeListener: jest.fn() }
  },
  windows: {
    getCurrent: jest.fn(),
    getAll: jest.fn(),
    onFocusChanged: { addListener: jest.fn(), removeListener: jest.fn() }
  }
};

global.chrome = mockChrome as any;

// Import after mocking
import { TabRegistry, tabRegistry } from '../src/tabs/registry/tab-discovery';
import { RoleAssigner, roleAssigner } from '../src/tabs/registry/role-assignment';

describe('Tab Registry', () => {
  let registry: TabRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new TabRegistry();
  });

  afterEach(() => {
    registry.cleanupExpiredTabs();
  });

  describe('Tab Discovery', () => {
    it('should discover existing tabs on initialization', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', active: true },
        { id: 2, url: 'https://test.com', title: 'Test', active: false },
        { id: 3, url: 'https://salesforce.com', title: 'Salesforce', active: false }
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const discoveredTabs = await registry.discoverTabs();

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({});
      expect(discoveredTabs).toHaveLength(3);
      expect(registry.getAllTabs()).toHaveLength(3);
    });

    it('should handle tab creation events', () => {
      const newTab = {
        id: 4,
        url: 'https://newsite.com',
        title: 'New Site',
        active: true
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(newTab);

      const registeredTab = registry.getTab(4);
      expect(registeredTab).toBeDefined();
      expect(registeredTab?.url).toBe('https://newsite.com');
      expect(registeredTab?.type).toBeDefined();
    });

    it('should handle tab update events', () => {
      // First create a tab
      const initialTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        active: true
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(initialTab);

      // Then update it
      const changeInfo = {
        url: 'https://updated.com',
        title: 'Updated Example'
      };

      const updatedTab = {
        id: 1,
        url: 'https://updated.com',
        title: 'Updated Example',
        active: true
      };

      const tabUpdatedHandler = mockChrome.tabs.onUpdated.addListener.mock.calls[0][0];
      tabUpdatedHandler(1, changeInfo, updatedTab);

      const registeredTab = registry.getTab(1);
      expect(registeredTab?.url).toBe('https://updated.com');
      expect(registeredTab?.title).toBe('Updated Example');
    });

    it('should handle tab removal events', () => {
      // First create a tab
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        active: true
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(tab);

      expect(registry.getTab(1)).toBeDefined();

      // Then remove it
      const tabRemovedHandler = mockChrome.tabs.onRemoved.addListener.mock.calls[0][0];
      tabRemovedHandler(1);

      expect(registry.getTab(1)).toBeUndefined();
    });

    it('should handle tab activation events', () => {
      // Create multiple tabs
      const tab1 = { id: 1, url: 'https://example.com', title: 'Example', active: false };
      const tab2 = { id: 2, url: 'https://test.com', title: 'Test', active: false };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(tab1);
      tabCreatedHandler(tab2);

      // Activate tab 2
      const activeInfo = { tabId: 2, windowId: 1 };
      const tabActivatedHandler = mockChrome.tabs.onActivated.addListener.mock.calls[0][0];
      tabActivatedHandler(activeInfo);

      const activeTab = registry.getActiveTab();
      expect(activeTab?.id).toBe(2);
      expect(activeTab?.isFocused).toBe(true);
    });
  });

  describe('Tab Type Classification', () => {
    it('should classify audio+ui tabs correctly', () => {
      const audioTab = {
        id: 1,
        url: 'https://genesys.com/agent',
        title: 'Genesys Agent',
        active: true,
        permissions: ['microphone', 'audioCapture']
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(audioTab);

      const registeredTab = registry.getTab(1);
      expect(registeredTab?.type).toBe('audio+ui');
    });

    it('should classify ui-only tabs correctly', () => {
      const uiTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Site',
        active: true
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(uiTab);

      const registeredTab = registry.getTab(1);
      expect(registeredTab?.type).toBe('ui-only');
    });

    it('should classify Salesforce tabs as audio+ui', () => {
      const salesforceTab = {
        id: 1,
        url: 'https://my.salesforce.com',
        title: 'Salesforce',
        active: true
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(salesforceTab);

      const registeredTab = registry.getTab(1);
      expect(registeredTab?.type).toBe('audio+ui');
    });

    it('should classify local development tabs as audio+ui', () => {
      const localTab = {
        id: 1,
        url: 'http://localhost:3000',
        title: 'Local Dev',
        active: true
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(localTab);

      const registeredTab = registry.getTab(1);
      expect(registeredTab?.type).toBe('audio+ui');
    });
  });

  describe('Tab Queries', () => {
    beforeEach(async () => {
      // Setup test tabs
      const mockTabs = [
        { id: 1, url: 'https://genesys.com', title: 'Genesys', active: false },
        { id: 2, url: 'https://example.com', title: 'Example', active: true },
        { id: 3, url: 'https://salesforce.com', title: 'Salesforce', active: false }
      ];

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      mockTabs.forEach(tab => tabCreatedHandler(tab));
    });

    it('should get all tabs', () => {
      const allTabs = registry.getAllTabs();
      expect(allTabs).toHaveLength(3);
    });

    it('should get tab by ID', () => {
      const tab = registry.getTab(2);
      expect(tab).toBeDefined();
      expect(tab?.title).toBe('Example');
    });

    it('should get active tab', () => {
      const activeTab = registry.getActiveTab();
      expect(activeTab?.id).toBe(2);
      expect(activeTab?.isFocused).toBe(true);
    });

    it('should get audio+ui tabs', () => {
      const audioTabs = registry.getAudioTabs();
      expect(audioTabs).toHaveLength(2); // Genesys and Salesforce
    });

    it('should get ui-only tabs', () => {
      const uiTabs = registry.getUITabs();
      expect(uiTabs).toHaveLength(1); // Example
    });

    it('should get primary audio tab', () => {
      const primaryAudioTab = registry.getPrimaryAudioTab();
      expect(primaryAudioTab).toBeDefined();
      expect(['Genesys', 'Salesforce']).toContain(primaryAudioTab?.title);
    });
  });

  describe('Tab Management', () => {
    it('should refresh tab information', async () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        active: true
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(tab);

      // Mock updated tab info
      const updatedTab = {
        id: 1,
        url: 'https://updated.com',
        title: 'Updated Example',
        active: true
      };
      mockChrome.tabs.get.mockResolvedValue(updatedTab);

      await registry.refreshTab(1);

      const registeredTab = registry.getTab(1);
      expect(registeredTab?.url).toBe('https://updated.com');
      expect(registeredTab?.title).toBe('Updated Example');
    });

    it('should cleanup expired tabs', () => {
      const oldTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        active: true,
        lastActive: Date.now() - (31 * 60 * 1000) // 31 minutes ago
      };

      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      tabCreatedHandler(oldTab);

      expect(registry.getTab(1)).toBeDefined();

      registry.cleanupExpiredTabs();

      expect(registry.getTab(1)).toBeUndefined();
    });

    it('should get registry status', () => {
      const status = registry.getStatus();
      expect(status).toHaveProperty('totalTabs');
      expect(status).toHaveProperty('audioTabs');
      expect(status).toHaveProperty('uiTabs');
      expect(status).toHaveProperty('activeTab');
    });
  });
});

describe('Role Assigner', () => {
  let assigner: RoleAssigner;

  beforeEach(() => {
    jest.clearAllMocks();
    assigner = new RoleAssigner({
      maxAudioTabs: 2,
      defaultRole: 'ui-only'
    });
  });

  describe('Tab Registration', () => {
    it('should register new tab with ui-only role', () => {
      const tab = assigner.registerTab('tab-1', 'https://example.com');

      expect(tab.id).toBe('tab-1');
      expect(tab.type).toBe('ui-only');
      expect(tab.capabilities.ui).toBe(true);
      expect(tab.capabilities.audio).toBe(false);
    });

    it('should register tab with audio capabilities', () => {
      const tab = assigner.registerTab('tab-2', 'https://genesys.com', {
        audio: true,
        microphone: true
      });

      expect(tab.type).toBe('audio-ui');
      expect(tab.capabilities.audio).toBe(true);
      expect(tab.capabilities.microphone).toBe(true);
    });

    it('should handle duplicate registration', () => {
      const tab1 = assigner.registerTab('tab-1', 'https://example.com');
      const tab2 = assigner.registerTab('tab-1', 'https://updated.com');

      expect(tab1).toBe(tab2); // Should return existing tab
    });
  });

  describe('Role Assignment Logic', () => {
    it('should assign audio-ui role to Genesys URLs', () => {
      const tab = assigner.registerTab('tab-1', 'https://genesys.com/agent');

      expect(tab.type).toBe('audio-ui');
    });

    it('should assign audio-ui role to Salesforce URLs', () => {
      const tab = assigner.registerTab('tab-1', 'https://my.salesforce.com');

      expect(tab.type).toBe('audio-ui');
    });

    it('should respect maxAudioTabs limit', () => {
      assigner = new RoleAssigner({ maxAudioTabs: 1 });

      const tab1 = assigner.registerTab('tab-1', 'https://genesys.com');
      const tab2 = assigner.registerTab('tab-2', 'https://salesforce.com');
      const tab3 = assigner.registerTab('tab-3', 'https://localhost:3000');

      expect(tab1.type).toBe('audio-ui');
      expect(tab2.type).toBe('ui-only'); // Should fallback due to limit
      expect(tab3.type).toBe('ui-only'); // Should fallback due to limit
    });

    it('should use default role when no specific rules apply', () => {
      const assigner = new RoleAssigner({ defaultRole: 'ui-only' });
      const tab = assigner.registerTab('tab-1', 'https://random-site.com');

      expect(tab.type).toBe('ui-only');
    });
  });

  describe('Tab Queries and Management', () => {
    beforeEach(() => {
      // Register test tabs
      assigner.registerTab('tab-1', 'https://genesys.com', { audio: true });
      assigner.registerTab('tab-2', 'https://example.com');
      assigner.registerTab('tab-3', 'https://salesforce.com', { audio: true });
      assigner.registerTab('tab-4', 'https://test.com');
    });

    it('should get primary audio tab', () => {
      const primaryAudioTab = assigner.getPrimaryAudioTab();
      expect(primaryAudioTab).toBeDefined();
      expect(['tab-1', 'tab-3']).toContain(primaryAudioTab?.id);
    });

    it('should get all UI tabs', () => {
      const uiTabs = assigner.getUITabs();
      expect(uiTabs).toHaveLength(4); // All tabs have UI capability
    });

    it('should get tabs by role type', () => {
      const audioTabs = assigner.getTabsByRole('audio-ui');
      const uiOnlyTabs = assigner.getTabsByRole('ui-only');

      expect(audioTabs).toHaveLength(2);
      expect(uiOnlyTabs).toHaveLength(2);
    });

    it('should get active tabs', () => {
      // Update activity for some tabs
      assigner.updateActivity('tab-2');
      assigner.updateActivity('tab-4');

      const activeTabs = assigner.getActiveTabs();
      expect(activeTabs).toHaveLength(2);
    });
  });

  describe('Tab Lifecycle', () => {
    it('should update tab activity', () => {
      const tab = assigner.registerTab('tab-1', 'https://example.com');
      const originalTime = tab.lastActive;

      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        assigner.updateActivity('tab-1');
        const updatedTab = assigner.getTab('tab-1');
        expect(updatedTab?.lastActive).toBeGreaterThan(originalTime);
      }, 10);
    });

    it('should remove tabs', () => {
      assigner.registerTab('tab-1', 'https://example.com');
      expect(assigner.getTab('tab-1')).toBeDefined();

      assigner.removeTab('tab-1');
      expect(assigner.getTab('tab-1')).toBeUndefined();
    });

    it('should assign roles to multiple tabs', () => {
      const tabs = assigner.assignRoles(
        ['tab-1', 'tab-2', 'tab-3'],
        ['https://genesys.com', 'https://example.com', 'https://salesforce.com'],
        [
          { audio: true },
          { audio: false },
          { audio: true }
        ]
      );

      expect(tabs).toHaveLength(3);
      expect(tabs[0].type).toBe('audio-ui');
      expect(tabs[1].type).toBe('ui-only');
      expect(tabs[2].type).toBe('audio-ui');
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customAssigner = new RoleAssigner({
        maxAudioTabs: 3,
        defaultRole: 'audio-ui',
        priorityRules: {
          'localhost': 5,
          'genesys.com': 3
        }
      });

      expect(customAssigner).toBeDefined();
    });

    it('should get all tabs', () => {
      assigner.registerTab('tab-1', 'https://example.com');
      assigner.registerTab('tab-2', 'https://test.com');

      const allTabs = assigner.getAllTabs();
      expect(allTabs).toHaveLength(2);
    });

    it('should get tab by ID', () => {
      const registeredTab = assigner.registerTab('tab-1', 'https://example.com');
      const retrievedTab = assigner.getTab('tab-1');

      expect(retrievedTab).toBe(registeredTab);
    });
  });
});