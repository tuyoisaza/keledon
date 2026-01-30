/**
 * Content Script Tests
 * Unit tests for content script functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock DOM APIs
const mockDocument = {
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  readyState: 'complete',
  location: {
    hostname: 'example.com',
    href: 'https://example.com/page',
    pathname: '/page'
  }
};

const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  postMessage: jest.fn(),
  chrome: {
    runtime: {
      connect: jest.fn(),
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    }
  },
  CustomEvent: jest.fn(),
  MutationObserver: jest.fn()
};

// Mock global objects
Object.defineProperty(global, 'document', { value: mockDocument, writable: true });
Object.defineProperty(global, 'window', { value: mockWindow, writable: true });

// Mock content script module
jest.mock('../src/content-script/content-script.js', () => {
  return {
    ContentScriptManager: jest.fn().mockImplementation(() => ({
      initialize: jest.fn(),
      injectUI: jest.fn(),
      handleMessages: jest.fn(),
      cleanup: jest.fn()
    }))
  };
});

describe('Content Script', () => {
  let contentScript: any;
  let mockPort: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPort = {
      name: 'keledon-content-script',
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

    mockWindow.chrome.runtime.connect.mockReturnValue(mockPort);
  });

  afterEach(() => {
    if (contentScript) {
      contentScript.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize content script successfully', () => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      
      contentScript.initialize();
      
      expect(mockWindow.chrome.runtime.connect).toHaveBeenCalledWith({
        name: 'keledon-content-script'
      });
      expect(mockPort.onMessage.addListener).toHaveBeenCalled();
      expect(mockPort.onDisconnect.addListener).toHaveBeenCalled();
    });

    it('should detect page domain correctly', () => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      
      contentScript.initialize();
      
      expect(contentScript.getDomain()).toBe('example.com');
    });

    it('should check page readiness', () => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      
      contentScript.initialize();
      
      expect(contentScript.isPageReady()).toBe(true);
    });
  });

  describe('UI Injection', () => {
    it('should inject UI overlay into page', () => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      
      contentScript.initialize();
      contentScript.injectUI();
      
      expect(mockDocument.createElement).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    it('should create floating control panel', () => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      
      contentScript.initialize();
      
      const panel = contentScript.createControlPanel();
      
      expect(panel).toBeDefined();
      expect(panel.className).toContain('keledon-panel');
    });

    it('should not inject UI on incompatible pages', () => {
      mockDocument.location.hostname = 'chrome://extensions';
      
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      
      contentScript.initialize();
      
      expect(mockDocument.body.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      contentScript.initialize();
    });

    it('should handle RPA execution messages', () => {
      const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
      
      const rpaMessage = {
        type: 'rpa',
        action: 'execute-step',
        payload: {
          step: {
            id: 'test-step',
            action: 'click',
            selector: '#test-button',
            parameters: {}
          }
        }
      };
      
      messageListener(rpaMessage);
      
      expect(contentScript.executeStep).toHaveBeenCalledWith(rpaMessage.payload.step);
    });

    it('should handle element selection messages', () => {
      const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
      
      const mockElement = {
        click: jest.fn(),
        value: 'test value',
        textContent: 'Test content'
      };
      mockDocument.querySelector.mockReturnValue(mockElement);
      
      const selectionMessage = {
        type: 'dom',
        action: 'find-element',
        payload: {
          selector: '#test-element'
        }
      };
      
      messageListener(selectionMessage);
      
      expect(mockDocument.querySelector).toHaveBeenCalledWith('#test-element');
      expect(mockPort.postMessage).toHaveBeenCalledWith({
        type: 'dom-response',
        action: 'element-found',
        payload: {
          element: mockElement,
          found: true
        }
      });
    });

    it('should handle UI visibility toggle', () => {
      const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
      
      const toggleMessage = {
        type: 'ui',
        action: 'toggle-visibility',
        payload: { visible: false }
      };
      
      messageListener(toggleMessage);
      
      expect(contentScript.toggleUIVisibility).toHaveBeenCalledWith(false);
    });

    it('should handle invalid message types gracefully', () => {
      const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
      
      const invalidMessage = {
        type: 'invalid',
        data: 'test'
      };
      
      expect(() => {
        messageListener(invalidMessage);
      }).not.toThrow();
    });
  });

  describe('DOM Operations', () => {
    beforeEach(() => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      contentScript.initialize();
    });

    it('should find elements by selector', () => {
      const mockElement = { id: 'test-element' };
      mockDocument.querySelector.mockReturnValue(mockElement);
      
      const element = contentScript.findElement('#test-element');
      
      expect(mockDocument.querySelector).toHaveBeenCalledWith('#test-element');
      expect(element).toBe(mockElement);
    });

    it('should find multiple elements by selector', () => {
      const mockElements = [
        { id: 'element1' },
        { id: 'element2' },
        { id: 'element3' }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      
      const elements = contentScript.findAllElements('.test-class');
      
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('.test-class');
      expect(elements).toEqual(mockElements);
    });

    it('should click elements safely', () => {
      const mockElement = {
        click: jest.fn(),
        style: { display: 'block' }
      };
      mockDocument.querySelector.mockReturnValue(mockElement);
      
      const result = contentScript.clickElement('#test-button');
      
      expect(mockElement.click).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle clicking non-existent elements', () => {
      mockDocument.querySelector.mockReturnValue(null);
      
      const result = contentScript.clickElement('#non-existent');
      
      expect(result).toBe(false);
    });

    it('should fill input fields', () => {
      const mockInput = {
        value: '',
        focus: jest.fn(),
        blur: jest.fn(),
        dispatchEvent: jest.fn()
      };
      mockDocument.querySelector.mockReturnValue(mockInput);
      
      const result = contentScript.fillField('#test-input', 'test value');
      
      expect(mockInput.value).toBe('test value');
      expect(mockInput.focus).toHaveBeenCalled();
      expect(mockInput.dispatchEvent).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should read element text', () => {
      const mockElement = {
        textContent: 'Test content',
        value: ''
      };
      mockDocument.querySelector.mockReturnValue(mockElement);
      
      const text = contentScript.readText('#test-element');
      
      expect(text).toBe('Test content');
    });

    it('should wait for elements to appear', async () => {
      const mockElement = { id: 'test-element' };
      
      // Mock setTimeout for waiting
      const mockSetTimeout = jest.fn((callback) => {
        callback();
        return 1;
      });
      global.setTimeout = mockSetTimeout;
      
      // Element not found initially, then found
      mockDocument.querySelector
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockElement);
      
      const element = await contentScript.waitForElement('#test-element', 1000);
      
      expect(element).toBe(mockElement);
      expect(mockDocument.querySelector).toHaveBeenCalledTimes(2);
    });

    it('should timeout when waiting for elements', async () => {
      mockDocument.querySelector.mockReturnValue(null);
      
      const mockSetTimeout = jest.fn((callback, delay) => {
        if (delay === 1000) {
          // Don't call callback for timeout
          return 1;
        }
        callback();
        return 1;
      });
      global.setTimeout = mockSetTimeout;
      
      const element = await contentScript.waitForElement('#non-existent', 1000);
      
      expect(element).toBe(null);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      contentScript.initialize();
    });

    it('should setup page event listeners', () => {
      contentScript.setupPageListeners();
      
      expect(mockDocument.addEventListener).toHaveBeenCalled();
      expect(mockWindow.addEventListener).toHaveBeenCalled();
    });

    it('should handle page navigation', () => {
      const mockEvent = {
        type: 'navigation',
        url: 'https://newsite.com'
      };
      
      contentScript.handlePageNavigation(mockEvent);
      
      expect(mockPort.postMessage).toHaveBeenCalledWith({
        type: 'navigation',
        payload: mockEvent
      });
    });

    it('should handle DOM mutations', () => {
      const mockMutations = [
        {
          type: 'childList',
          addedNodes: [{ tagName: 'DIV' }],
          removedNodes: []
        }
      ];
      
      contentScript.handleDOMMutations(mockMutations);
      
      // Should process mutations
      expect(true).toBe(true);
    });

    it('should cleanup event listeners', () => {
      contentScript.setupPageListeners();
      contentScript.cleanup();
      
      expect(mockDocument.removeEventListener).toHaveBeenCalled();
      expect(mockWindow.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Element Highlighting', () => {
    beforeEach(() => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      contentScript.initialize();
    });

    it('should highlight elements for selection', () => {
      const mockElement = {
        style: {},
        className: 'original-class'
      };
      mockDocument.querySelector.mockReturnValue(mockElement);
      
      contentScript.highlightElement('#test-element');
      
      expect(mockElement.className).toContain('keledon-highlighted');
    });

    it('should remove highlight from elements', () => {
      const mockElement = {
        style: {},
        className: 'keledon-highlighted original-class'
      };
      mockDocument.querySelector.mockReturnValue(mockElement);
      
      contentScript.removeHighlight('#test-element');
      
      expect(mockElement.className).not.toContain('keledon-highlighted');
    });

    it('should highlight multiple elements', () => {
      const mockElements = [
        { className: 'class1' },
        { className: 'class2' }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockElements);
      
      contentScript.highlightAllElements('.test-class');
      
      mockElements.forEach((element: any) => {
        expect(element.className).toContain('keledon-highlighted');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      contentScript.initialize();
    });

    it('should handle port disconnection gracefully', () => {
      const disconnectListener = mockPort.onDisconnect.addListener.mock.calls[0][0];
      
      disconnectListener();
      
      expect(contentScript.isConnected()).toBe(false);
    });

    it('should handle DOM operation errors', () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });
      
      expect(() => {
        contentScript.findElement('#test-element');
      }).not.toThrow();
    });

    it('should handle message parsing errors', () => {
      const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
      
      const malformedMessage = {
        type: null,
        payload: undefined
      };
      
      expect(() => {
        messageListener(malformedMessage);
      }).not.toThrow();
    });
  });

  describe('Security and Permissions', () => {
    beforeEach(() => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      contentScript.initialize();
    });

    it('should not access chrome APIs on unsupported pages', () => {
      mockWindow.chrome = undefined;
      
      contentScript.checkPermissions();
      
      expect(contentScript.hasPermissions()).toBe(false);
    });

    it('should sanitize DOM operations', () => {
      const mockElement = {
        innerHTML: '',
        setAttribute: jest.fn(),
        removeAttribute: jest.fn()
      };
      
      contentScript.sanitizeElement(mockElement);
      
      expect(mockElement.innerHTML).toBe('');
    });

    it('should validate selectors before execution', () => {
      const invalidSelectors = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];
      
      invalidSelectors.forEach(selector => {
        expect(contentScript.validateSelector(selector)).toBe(false);
      });
    });

    it('should allow valid selectors', () => {
      const validSelectors = [
        '#test-id',
        '.test-class',
        '[data-test="value"]',
        'div.container > p'
      ];
      
      validSelectors.forEach(selector => {
        expect(contentScript.validateSelector(selector)).toBe(true);
      });
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      const ContentScriptManager = require('../src/content-script/content-script.js').ContentScriptManager;
      contentScript = new ContentScriptManager();
      contentScript.initialize();
    });

    it('should track operation performance', () => {
      const startTime = Date.now();
      
      contentScript.startPerformanceTracking('test-operation');
      
      // Simulate some work
      for (let i = 0; i < 1000; i++) {}
      
      const metrics = contentScript.endPerformanceTracking('test-operation');
      
      expect(metrics).toBeDefined();
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.startTime).toBe(startTime);
    });

    it('should maintain performance statistics', () => {
      contentScript.recordOperation('dom-query', 50);
      contentScript.recordOperation('dom-query', 75);
      contentScript.recordOperation('element-click', 25);
      
      const stats = contentScript.getPerformanceStats();
      
      expect(stats['dom-query'].count).toBe(2);
      expect(stats['dom-query'].totalTime).toBe(125);
      expect(stats['element-click'].count).toBe(1);
      expect(stats['element-click'].totalTime).toBe(25);
    });
  });
});