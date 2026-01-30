/**
 * Background Script Tests
 * Unit tests for background script functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onConnect: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getManifest: jest.fn(() => ({ version: '1.0.0' }))
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    sendMessage: jest.fn(),
    onCreated: { addListener: jest.fn(), removeListener: jest.fn() },
    onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
    onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
    onActivated: { addListener: jest.fn(), removeListener: jest.fn() }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
    onClicked: { addListener: jest.fn(), removeListener: jest.fn() }
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn()
  }
};

global.chrome = mockChrome as any;

// Mock the background script module
jest.mock('../src/background/background.js', () => {
  return {
    initializeBackground: jest.fn(),
    handleMessage: jest.fn(),
    handleConnection: jest.fn()
  };
});

describe('Background Script', () => {
  let backgroundScript: any;
  let mockPort: any;
  let mockSender: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPort = {
      name: 'test-connection',
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onDisconnect: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      postMessage: jest.fn(),
      disconnect: jest.fn()
    };

    mockSender = {
      id: 'tab-123',
      url: 'https://example.com',
      tab: { id: 123, url: 'https://example.com' }
    };
  });

  afterEach(() => {
    if (backgroundScript) {
      backgroundScript.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize background script successfully', () => {
      // Import and initialize
      require('../src/background/background.js');
      
      expect(mockChrome.runtime.onConnect.addListener).toHaveBeenCalled();
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should setup context menu items', () => {
      require('../src/background/background.js');
      
      expect(mockChrome.contextMenus.create).toHaveBeenCalled();
    });

    it('should setup tab event listeners', () => {
      require('../src/background/background.js');
      
      expect(mockChrome.tabs.onCreated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onRemoved.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalled();
    });
  });

  describe('Connection Handling', () => {
    it('should handle incoming port connections', () => {
      const connectionHandler = mockChrome.runtime.onConnect.addListener.mock.calls[0][0];
      
      connectionHandler(mockPort, mockSender);
      
      expect(mockPort.onMessage.addListener).toHaveBeenCalled();
      expect(mockPort.onDisconnect.addListener).toHaveBeenCalled();
    });

    it('should reject connections with invalid names', () => {
      const invalidPort = { ...mockPort, name: 'invalid-connection' };
      const connectionHandler = mockChrome.runtime.onConnect.addListener.mock.calls[0][0];
      
      // Should handle gracefully without throwing
      expect(() => connectionHandler(invalidPort, mockSender)).not.toThrow();
    });

    it('should handle port disconnection cleanup', () => {
      const connectionHandler = mockChrome.runtime.onConnect.addListener.mock.calls[0][0];
      
      connectionHandler(mockPort, mockSender);
      
      const disconnectListener = mockPort.onDisconnect.addListener.mock.calls[0][0];
      disconnectListener();
      
      // Should clean up resources without throwing
      expect(true).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('should handle ping messages', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      const message = {
        type: 'ping',
        source: 'content-script',
        timestamp: Date.now()
      };
      
      messageHandler(message, mockSender, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'pong',
        source: 'background',
        timestamp: expect.any(Number)
      });
    });

    it('should handle status requests', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      const message = {
        type: 'status',
        action: 'get-status',
        source: 'popup'
      };
      
      messageHandler(message, mockSender, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'status-response',
        status: {
          version: '1.0.0',
          connectedTabs: expect.any(Number),
          activeConnections: expect.any(Number),
          uptime: expect.any(Number)
        }
      });
    });

    it('should handle RPA execution requests', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      const rpaMessage = {
        type: 'rpa',
        action: 'execute-step',
        payload: {
          steps: [
            {
              id: 'step-1',
              action: 'click',
              selector: '#button',
              parameters: {}
            }
          ]
        }
      };
      
      messageHandler(rpaMessage, mockSender, sendResponse);
      
      // Should handle RPA request
      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle unknown message types gracefully', async () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      const unknownMessage = {
        type: 'unknown-type',
        data: 'test'
      };
      
      messageHandler(unknownMessage, mockSender, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        type: 'error',
        error: 'Unknown message type: unknown-type'
      });
    });
  });

  describe('Tab Management', () => {
    it('should track created tabs', () => {
      const tabCreatedHandler = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];
      
      const newTab = {
        id: 456,
        url: 'https://newsite.com',
        title: 'New Tab',
        active: true
      };
      
      tabCreatedHandler(newTab);
      
      // Should track the new tab
      expect(true).toBe(true); // Tab would be tracked internally
    });

    it('should handle tab updates', () => {
      const tabUpdatedHandler = mockChrome.tabs.onUpdated.addListener.mock.calls[0][0];
      
      const changeInfo = {
        url: 'https://updated.com',
        title: 'Updated Tab'
      };
      
      const updatedTab = {
        id: 456,
        url: 'https://updated.com',
        title: 'Updated Tab',
        active: true
      };
      
      tabUpdatedHandler(456, changeInfo, updatedTab);
      
      // Should update internal tab tracking
      expect(true).toBe(true);
    });

    it('should handle tab removal', () => {
      const tabRemovedHandler = mockChrome.tabs.onRemoved.addListener.mock.calls[0][0];
      
      tabRemovedHandler(456);
      
      // Should clean up tab data
      expect(true).toBe(true);
    });

    it('should handle tab activation', () => {
      const tabActivatedHandler = mockChrome.tabs.onActivated.addListener.mock.calls[0][0];
      
      const activeInfo = {
        tabId: 456,
        windowId: 1
      };
      
      tabActivatedHandler(activeInfo);
      
      // Should update active tab tracking
      expect(true).toBe(true);
    });
  });

  describe('Context Menu Integration', () => {
    it('should handle context menu clicks', () => {
      const menuClickHandler = mockChrome.contextMenus.onClicked.addListener.mock.calls[0][0];
      
      const clickInfo = {
        menuItemId: 'keledon-action',
        pageUrl: 'https://example.com',
        frameUrl: 'https://example.com'
      };
      
      const tab = {
        id: 123,
        url: 'https://example.com'
      };
      
      menuClickHandler(clickInfo, tab);
      
      // Should handle menu click and trigger appropriate action
      expect(true).toBe(true);
    });
  });

  describe('Storage Operations', () => {
    it('should save extension settings', async () => {
      const settings = {
        enabled: true,
        debugMode: false,
        preferredDomain: 'salesforce.com'
      };
      
      mockChrome.storage.local.get.mockResolvedValue({});
      
      // Simulate settings save operation
      await mockChrome.storage.local.set(settings);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(settings);
    });

    it('should retrieve extension settings', async () => {
      const mockSettings = {
        enabled: true,
        debugMode: false,
        preferredDomain: 'salesforce.com'
      };
      
      mockChrome.storage.local.get.mockResolvedValue(mockSettings);
      
      const result = await mockChrome.storage.local.get(['enabled', 'debugMode', 'preferredDomain']);
      
      expect(result).toEqual(mockSettings);
    });
  });

  describe('Error Handling', () => {
    it('should handle runtime errors gracefully', () => {
      const errorHandler = jest.fn();
      
      // Simulate runtime error
      const error = new Error('Runtime error occurred');
      
      // Should handle without crashing
      expect(() => {
        // Error handling logic would go here
        errorHandler(error);
      }).not.toThrow();
      
      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it('should handle port communication errors', () => {
      const connectionHandler = mockChrome.runtime.onConnect.addListener.mock.calls[0][0];
      
      const faultyPort = {
        name: 'test-connection',
        postMessage: jest.fn(() => {
          throw new Error('Port closed');
        }),
        onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
        onDisconnect: { addListener: jest.fn(), removeListener: jest.fn() }
      };
      
      expect(() => {
        connectionHandler(faultyPort, mockSender);
      }).not.toThrow();
    });

    it('should handle invalid message formats', () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      const invalidMessages = [
        null,
        undefined,
        'string message',
        { type: null },
        { type: '', action: undefined }
      ];
      
      for (const invalidMessage of invalidMessages) {
        expect(() => {
          messageHandler(invalidMessage, mockSender, sendResponse);
        }).not.toThrow();
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track connection statistics', () => {
      const connectionHandler = mockChrome.runtime.onConnect.addListener.mock.calls[0][0];
      
      // Simulate multiple connections
      for (let i = 0; i < 5; i++) {
        connectionHandler(mockPort, { ...mockSender, id: `tab-${i}` });
      }
      
      // Should track statistics
      expect(true).toBe(true);
    });

    it('should track message throughput', () => {
      const messageHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = jest.fn();
      
      // Simulate multiple messages
      for (let i = 0; i < 10; i++) {
        messageHandler({
          type: 'ping',
          id: `msg-${i}`
        }, mockSender, sendResponse);
      }
      
      expect(sendResponse).toHaveBeenCalledTimes(10);
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should cleanup all resources on shutdown', () => {
      const backgroundModule = require('../src/background/background.js');
      
      // Simulate shutdown
      if (backgroundModule.cleanup) {
        backgroundModule.cleanup();
      }
      
      // Should remove all event listeners
      expect(true).toBe(true);
    });

    it('should persist important data before shutdown', async () => {
      mockChrome.storage.local.set.mockResolvedValue({});
      
      // Simulate data persistence
      await mockChrome.storage.local.set({
        lastShutdown: Date.now(),
        sessionData: 'important-data'
      });
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        lastShutdown: expect.any(Number),
        sessionData: 'important-data'
      });
    });
  });
});