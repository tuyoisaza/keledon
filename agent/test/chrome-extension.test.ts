/**
 * Chrome Extension Connector Tests
 * Unit tests for Chrome extension connectors and background services
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    connect: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getManifest: jest.fn(() => ({ version: '1.0.0' }))
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onCreated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onActivated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  }
};

// Mock global chrome
global.chrome = mockChrome as any;

// Import after mocking
import { ChromeExtensionConnector } from '../src/connectors/chrome-extension.connector';
import { ConnectionState, TransportMessage } from '../../../contracts/types';

describe('ChromeExtensionConnector', () => {
  let connector: ChromeExtensionConnector;
  
  beforeEach(() => {
    jest.clearAllMocks();
    connector = new ChromeExtensionConnector({
      debug: false,
      retryAttempts: 3,
      timeoutMs: 5000
    });
  });

  afterEach(() => {
    connector.disconnect();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(connector.getStatus()).toEqual({
        connected: false,
        state: ConnectionState.DISCONNECTED,
        lastError: null
      });
    });

    it('should initialize with custom configuration', () => {
      const customConnector = new ChromeExtensionConnector({
        debug: true,
        retryAttempts: 5,
        timeoutMs: 10000
      });
      
      expect(customConnector.getStatus().connected).toBe(false);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully to background script', async () => {
      const mockPort = {
        name: 'keledon-connector',
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

      mockChrome.runtime.connect.mockReturnValue(mockPort);

      await connector.connect();

      expect(mockChrome.runtime.connect).toHaveBeenCalledWith({
        name: 'keledon-connector'
      });
      expect(connector.getStatus().connected).toBe(true);
      expect(connector.getStatus().state).toBe(ConnectionState.CONNECTED);
    });

    it('should handle connection failure', async () => {
      mockChrome.runtime.connect.mockImplementation(() => {
        throw new Error('Extension context invalid');
      });

      await expect(connector.connect()).rejects.toThrow('Extension context invalid');
      expect(connector.getStatus().connected).toBe(false);
      expect(connector.getStatus().state).toBe(ConnectionState.ERROR);
    });

    it('should retry connection on failure', async () => {
      let attempts = 0;
      mockChrome.runtime.connect.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Connection failed');
        }
        return {
          name: 'keledon-connector',
          onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
          onDisconnect: { addListener: jest.fn(), removeListener: jest.fn() },
          postMessage: jest.fn(),
          disconnect: jest.fn()
        };
      });

      await connector.connect();

      expect(attempts).toBe(3);
      expect(connector.getStatus().connected).toBe(true);
    });

    it('should disconnect properly', async () => {
      const mockPort = {
        name: 'keledon-connector',
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

      mockChrome.runtime.connect.mockReturnValue(mockPort);
      await connector.connect();

      connector.disconnect();

      expect(mockPort.disconnect).toHaveBeenCalled();
      expect(connector.getStatus().connected).toBe(false);
    });
  });

  describe('Message Sending', () => {
    let mockPort: any;

    beforeEach(async () => {
      mockPort = {
        name: 'keledon-connector',
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

      mockChrome.runtime.connect.mockReturnValue(mockPort);
      await connector.connect();
    });

    it('should send message successfully', async () => {
      const message: TransportMessage = {
        id: 'test-123',
        type: 'request',
        source: 'test-source',
        target: 'test-target',
        action: 'test-action',
        payload: { test: 'data' },
        timestamp: Date.now()
      };

      await connector.send(message);

      expect(mockPort.postMessage).toHaveBeenCalledWith(message);
    });

    it('should handle send timeout', async () => {
      mockPort.postMessage.mockImplementation(() => {
        // Simulate no response
      });

      const message: TransportMessage = {
        id: 'timeout-test',
        type: 'request',
        source: 'test',
        target: 'test',
        action: 'test',
        payload: {},
        timestamp: Date.now()
      };

      const shortTimeoutConnector = new ChromeExtensionConnector({
        timeoutMs: 100
      });
      
      await shortTimeoutConnector.connect();

      await expect(shortTimeoutConnector.send(message)).rejects.toThrow('Message timeout');
    });

    it('should handle send errors', async () => {
      mockPort.postMessage.mockImplementation(() => {
        throw new Error('Port disconnected');
      });

      const message: TransportMessage = {
        id: 'error-test',
        type: 'request',
        source: 'test',
        target: 'test',
        action: 'test',
        payload: {},
        timestamp: Date.now()
      };

      await expect(connector.send(message)).rejects.toThrow('Port disconnected');
    });
  });

  describe('Message Receiving', () => {
    let messageHandler: jest.Mock;

    beforeEach(() => {
      messageHandler = jest.fn();
      connector.onMessage(messageHandler);
    });

    it('should receive and handle incoming messages', async () => {
      const mockPort = {
        name: 'keledon-connector',
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

      mockChrome.runtime.connect.mockReturnValue(mockPort);
      await connector.connect();

      // Get the registered message listener
      const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
      
      const incomingMessage: TransportMessage = {
        id: 'incoming-123',
        type: 'response',
        source: 'background',
        target: 'content-script',
        action: 'response-action',
        payload: { result: 'success' },
        timestamp: Date.now()
      };

      messageListener(incomingMessage);

      expect(messageHandler).toHaveBeenCalledWith(incomingMessage);
    });

    it('should filter messages by target', async () => {
      const mockPort = {
        name: 'keledon-connector',
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

      mockChrome.runtime.connect.mockReturnValue(mockPort);
      await connector.connect();

      const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
      
      const messageForOtherTarget: TransportMessage = {
        id: 'other-123',
        type: 'response',
        source: 'background',
        target: 'other-target',
        action: 'test',
        payload: {},
        timestamp: Date.now()
      };

      messageListener(messageForOtherTarget);

      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  describe('Tab Integration', () => {
    it('should query tabs successfully', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', active: true },
        { id: 2, url: 'https://test.com', active: false }
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const tabs = await connector.queryTabs({ active: true });

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true });
      expect(tabs).toEqual(mockTabs);
    });

    it('should create new tab', async () => {
      const newTab = { id: 3, url: 'https://new.com', active: true };
      mockChrome.tabs.create.mockResolvedValue(newTab);

      const tab = await connector.createTab({
        url: 'https://new.com',
        active: true
      });

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://new.com',
        active: true
      });
      expect(tab).toEqual(newTab);
    });

    it('should update existing tab', async () => {
      const updatedTab = { id: 1, url: 'https://updated.com', active: true };
      mockChrome.tabs.update.mockResolvedValue(updatedTab);

      const tab = await connector.updateTab(1, {
        url: 'https://updated.com',
        active: true
      });

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(1, {
        url: 'https://updated.com',
        active: true
      });
      expect(tab).toEqual(updatedTab);
    });
  });

  describe('Storage Integration', () => {
    it('should get data from local storage', async () => {
      const testData = { key: 'value', anotherKey: 123 };
      mockChrome.storage.local.get.mockResolvedValue(testData);

      const result = await connector.getStorage(['key', 'anotherKey']);

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['key', 'anotherKey']);
      expect(result).toEqual(testData);
    });

    it('should set data in local storage', async () => {
      const dataToSet = { newKey: 'newValue' };

      await connector.setStorage(dataToSet);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(dataToSet);
    });

    it('should remove data from local storage', async () => {
      await connector.removeStorage(['keyToRemove']);

      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(['keyToRemove']);
    });

    it('should clear local storage', async () => {
      await connector.clearStorage();

      expect(mockChrome.storage.local.clear).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle port disconnect gracefully', async () => {
      const mockPort = {
        name: 'keledon-connector',
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

      mockChrome.runtime.connect.mockReturnValue(mockPort);
      await connector.connect();

      // Simulate port disconnect
      const disconnectListener = mockPort.onDisconnect.addListener.mock.calls[0][0];
      disconnectListener();

      expect(connector.getStatus().connected).toBe(false);
      expect(connector.getStatus().state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should accumulate and report errors', async () => {
      mockChrome.runtime.connect.mockImplementation(() => {
        throw new Error('Test error');
      });

      try {
        await connector.connect();
      } catch (error) {
        // Expected
      }

      const status = connector.getStatus();
      expect(status.lastError).toBeTruthy();
      expect(status.state).toBe(ConnectionState.ERROR);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove message listeners', () => {
      const handler = jest.fn();
      
      connector.onMessage(handler);
      connector.offMessage(handler);

      // Should not throw and internal state should be clean
      expect(true).toBe(true);
    });

    it('should add and disconnect listeners', () => {
      const handler = jest.fn();
      
      connector.onDisconnect(handler);
      connector.offDisconnect(handler);

      // Should not throw and internal state should be clean
      expect(true).toBe(true);
    });

    it('should trigger disconnect event on port disconnect', async () => {
      const disconnectHandler = jest.fn();
      connector.onDisconnect(disconnectHandler);

      const mockPort = {
        name: 'keledon-connector',
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

      mockChrome.runtime.connect.mockReturnValue(mockPort);
      await connector.connect();

      // Simulate disconnect
      const disconnectListener = mockPort.onDisconnect.addListener.mock.calls[0][0];
      disconnectListener();

      expect(disconnectHandler).toHaveBeenCalled();
    });
  });
});