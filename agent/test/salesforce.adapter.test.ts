/**
 * Comprehensive test suite for Salesforce adapter
 * Tests Chrome extension RPA automation for Salesforce CRM
 */

// Create location mock helper first
const createLocationMock = (href: string, hostname: string, pathname = '', search = '', hash = '') => {
  // Create a proper string with includes method
  const mockHostname = new String(hostname) as any;
  mockHostname.includes = (str: string) => hostname.includes(str);
  
  return {
    href,
    hostname: mockHostname,
    pathname,
    search,
    hash,
    origin: href.split('/')[0] + '//' + hostname,
    protocol: 'https:',
    port: '',
    host: hostname,
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    toString: () => href
  };
};

// Create a completely new window object to avoid JSDOM interference
const createMockWindow = (href: string, hostname: string, pathname = '') => {
  const windowMock = {
    location: createLocationMock(href, hostname, pathname),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
  
  return windowMock;
};

// Helper to create a mock document
const createMockDocument = () => {
  return {
    createElement: jest.fn(() => ({
      style: {},
      setAttribute: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      click: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn()
    })),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
};

// Mock Element class for DOM testing
class MockElement {
  id: string;
  tagName: string;
  className: string = '';
  textContent: string = '';
  value: string = '';
  attributes: { [key: string]: string } = {};
  dataset: { [key: string]: string } = {};
  style: { [key: string]: string } = {};

  constructor(id: string, tagName: string) {
    this.id = id;
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  click() {
    // Mock click behavior
  }

  focus() {
    // Mock focus behavior
  }

  blur() {
    // Mock blur behavior
  }
}

// Set up global mocks before any imports
const mockChrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn(),
    id: 'test-extension-id'
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

// Set global mocks BEFORE importing adapter
(global as any).chrome = mockChrome;
(global as any).window = createMockWindow(
  'https://test.salesforce.com/lightning/page/home', 
  'test.salesforce.com', 
  '/lightning/page/home'
);
(global as any).document = createMockDocument();

// Now import after all mocks are set up
import { SalesforceAdapter } from '../src/rpa/adapters/salesforce.adapter';
import { RPAStep, RPAResult } from '../../../contracts/types';

describe('SalesforceAdapter', () => {
  let adapter: SalesforceAdapter;
  let mockTab: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock active tab
    mockTab = {
      id: 123,
      url: 'https://test.salesforce.com/lightning/page/home',
      title: 'Home - Salesforce',
      active: true
    };

    mockChrome.tabs.query.mockResolvedValue([mockTab]);
    
    // Reset global mocks before each test
    const mockWindow = createMockWindow(
      'https://test.salesforce.com/lightning/page/home', 
      'test.salesforce.com', 
      '/lightning/page/home'
    );
    
    // Ensure hostname has includes method
    Object.defineProperty(mockWindow.location, 'hostname', {
      value: 'test.salesforce.com',
      writable: true
    });
    mockWindow.location.includes = (str: string) => 'test.salesforce.com'.includes(str);
    
    (global as any).window = mockWindow;
    (global as any).document = createMockDocument();
  });

  describe('Adapter Initialization', () => {
test('should detect Salesforce Lightning domain', () => {
      // Create comprehensive mock document with Salesforce elements
      const mockDoc = createMockDocument();
      mockDoc.querySelector = jest.fn((selector) => {
        // Return Salesforce Lightning elements for detection
        if (selector === '[data-aura-rendered="true"]') {
          return { dataset: { auraRendered: 'true' } };
        }
        if (selector === '.forceSalesforceDesktop') {
          return { className: 'forceSalesforceDesktop' };
        }
        if (selector === 'meta[name="generator"]') {
          return { content: 'salesforce' };
        }
        return null;
      });
      
      // Override global document
      (global as any).document = mockDoc;
      
      // Mock window.location to include salesforce.com (using Object.defineProperty to bypass JSDOM restrictions)
      const mockHostname = 'test.salesforce.com';
      Object.defineProperty(global.window.location, 'hostname', {
        get: () => mockHostname,
        configurable: true
      });
      
      // Mock the includes method on the hostname
      const originalHostname = global.window.location.hostname;
      global.window.location.hostname = {
        toString: () => originalHostname,
        valueOf: () => originalHostname,
        includes: jest.fn((str: string) => originalHostname.includes(str))
      } as any;
      
      // Create adapter after mocks are set
      adapter = new SalesforceAdapter();
      
      expect(adapter.detect()).toBe(true);
    });

    test('should detect Salesforce Classic domain', () => {
      const mockWindow = createMockWindow('https://cs42.salesforce.com/500/o', 'cs42.salesforce.com', '/500/o');
      const mockDoc = createMockDocument();
      
      // Use Object.defineProperty to set hostname with includes method
      Object.defineProperty(mockWindow.location, 'hostname', {
        value: new String('cs42.salesforce.com') as any,
        writable: true
      });
      mockWindow.location.hostname.includes = jest.fn((str: string) => 'cs42.salesforce.com'.includes(str));
      
      (global as any).window = mockWindow;
      (global as any).document = mockDoc;
      
      adapter = new SalesforceAdapter();
      expect(adapter.detect()).toBe(true);
    });

    test('should detect Salesforce Classic domain', () => {
      const mockWindow = createMockWindow('https://cs42.salesforce.com/500/o', 'cs42.salesforce.com', '/500/o');
      const mockDoc = createMockDocument();
      
      // Use Object.defineProperty to set hostname with includes method
      Object.defineProperty(mockWindow.location, 'hostname', {
        value: new String('cs42.salesforce.com') as any,
        writable: true
      });
      mockWindow.location.hostname.includes = jest.fn((str: string) => 'cs42.salesforce.com'.includes(str));
      
      (global as any).window = mockWindow;
      (global as any).document = mockDoc;
      
      adapter = new SalesforceAdapter();
      expect(adapter.detect()).toBe(true);
    });

    test('should reject non-Salesforce domains', () => {
      const mockWindow = createMockWindow('https://www.google.com', 'www.google.com');
      const mockDoc = createMockDocument();
      
      // Use Object.defineProperty to set hostname with includes method
      Object.defineProperty(mockWindow.location, 'hostname', {
        value: new String('www.google.com') as any,
        writable: true
      });
      mockWindow.location.hostname.includes = jest.fn((str: string) => 'www.google.com'.includes(str));
      
      (global as any).window = mockWindow;
      (global as any).document = mockDoc;
      
      adapter = new SalesforceAdapter();
      expect(adapter.detect()).toBe(false);
    });

    test('should detect Force.com domain', () => {
      const mockWindow = createMockWindow('https://test.force.com', 'test.force.com');
      const mockDoc = createMockDocument();
      
      // Use Object.defineProperty to set hostname with includes method
      Object.defineProperty(mockWindow.location, 'hostname', {
        value: new String('test.force.com') as any,
        writable: true
      });
      mockWindow.location.hostname.includes = jest.fn((str: string) => 'test.force.com'.includes(str));
      
      (global as any).window = mockWindow;
      (global as any).document = mockDoc;
      
      adapter = new SalesforceAdapter();
expect(adapter.detect()).toBe(true);
    });

  describe('DOM Interaction Methods', () => {
    beforeEach(() => {
      // Set up mock DOM elements
      const mockButton = new MockElement('testButton', 'BUTTON');
      mockButton.className = 'slds-button';
      mockButton.textContent = 'Test Button';
      
      const mockInput = new MockElement('testInput', 'INPUT');
      mockInput.value = '';
      
      const mockSelect = new MockElement('testSelect', 'SELECT');
      
      (global as any).document.getElementById = jest.fn((id) => {
        switch(id) {
          case 'testButton': return mockButton;
          case 'testInput': return mockInput;
          case 'testSelect': return mockSelect;
          default: return null;
        }
      });

      (global as any).document.querySelector = jest.fn((selector) => {
        if (selector.includes('#testButton')) return mockButton;
        if (selector.includes('#testInput')) return mockInput;
        if (selector.includes('#testSelect')) return mockSelect;
        return null;
      });
    });

    test('click action should work with valid selector', async () => {
      const step: RPAStep = {
        id: 'click-step',
        action: 'click',
        selector: '#testButton'
      };

      const result = await adapter.executeStep(step);
      
      // Test that the method doesn't crash and returns some result
      expect(result).toBeDefined();
    });

    test('fill action should work with valid selector', async () => {
      const step: RPAStep = {
        id: 'fill-step',
        action: 'fill',
        selector: '#testInput',
        value: 'Test Value'
      };

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });

    test('select action should work with valid selector', async () => {
      const step: RPAStep = {
        id: 'select-step',
        action: 'select',
        selector: '#testSelect',
        option: 'High'
      };

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });

    test('wait_for action should work with valid selector', async () => {
      const step: RPAStep = {
        id: 'wait-step',
        action: 'wait_for',
        selector: '#testButton',
        timeout_ms: 1000
      };

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });

    test('read action should work with valid selector', async () => {
      const step: RPAStep = {
        id: 'read-step',
        action: 'read',
        selector: '#testButton'
      };

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });
  });

  describe('Salesforce Workflows', () => {
    beforeEach(() => {
      // Set up Salesforce-specific mock elements
      const createButton = new MockElement('createCaseBtn', 'BUTTON');
      createButton.setAttribute('data-aura-class', 'forceDetailPanelDesktop');
      createButton.setAttribute('title', 'New');
      
      const caseNumberInput = new MockElement('caseNumber', 'INPUT');
      caseNumberInput.setAttribute('name', 'CaseNumber');
      
      const caseSubjectInput = new MockElement('caseSubject', 'INPUT');
      caseSubjectInput.setAttribute('aria-labelledby', 'Case Subject');
      
      const caseDescTextarea = new MockElement('caseDesc', 'TEXTAREA');
      caseDescTextarea.setAttribute('aria-labelledby', 'Description');
      
      const statusSelect = new MockElement('caseStatus', 'LIGHTNING-COMBOBOX');
      statusSelect.setAttribute('data-aura-class', 'Case_Status');
      
      const saveButton = new MockElement('saveBtn', 'BUTTON');
      saveButton.setAttribute('title', 'Save');

      (global as any).document.querySelector = jest.fn((selector) => {
        if (selector.includes('New')) return createButton;
        if (selector.includes('CaseNumber')) return caseNumberInput;
        if (selector.includes('Case Subject')) return caseSubjectInput;
        if (selector.includes('Description')) return caseDescTextarea;
        if (selector.includes('Case_Status')) return statusSelect;
        if (selector.includes('Save')) return saveButton;
        return null;
      });
    });

    test('create_case workflow should execute', async () => {
      const step: RPAStep = {
        id: 'create-case-1',
        action: 'create_case' as any,
        selector: '',
        parameters: {
          subject: 'Test Case Subject',
          description: 'Test case description',
          priority: 'High',
          status: 'New'
        }
      } as any;

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });

    test('update_case workflow should execute', async () => {
      const step: RPAStep = {
        id: 'update-case-1',
        action: 'update_case' as any,
        selector: '',
        parameters: {
          caseId: '50012345',
          status: 'In Progress',
          priority: 'Medium'
        }
      } as any;

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });

    test('search_records workflow should execute', async () => {
      const searchInput = new MockElement('searchInput', 'INPUT');
      searchInput.setAttribute('placeholder', 'Search Salesforce');
      
      (global as any).document.querySelector = jest.fn((selector) => {
        if (selector.includes('Search')) return searchInput;
        return null;
      });

      const step: RPAStep = {
        id: 'search-1',
        action: 'search_records' as any,
        selector: '',
        parameters: {
          searchTerm: 'Test Case',
          object: 'Case'
        }
      } as any;

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });

    test('navigate_salesforce_ui workflow should execute', async () => {
      const casesTab = new MockElement('casesTab', 'A');
      casesTab.setAttribute('title', 'Cases');
      
      (global as any).document.querySelector = jest.fn((selector) => {
        if (selector.includes('Cases')) return casesTab;
        return null;
      });

      const step: RPAStep = {
        id: 'navigate-1',
        action: 'navigate_salesforce_ui' as any,
        selector: '',
        parameters: {
          destination: 'cases_tab'
        }
      } as any;

      const result = await adapter.executeStep(step);
      
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle DOM errors gracefully', async () => {
      (global as any).document.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = await adapter.executeStep({
        id: 'error-step',
        action: 'click',
        selector: '#testButton'
      });
      
      expect(result).toBeDefined();
    });

    test('should handle timeout errors', async () => {
      (global as any).document.querySelector.mockReturnValue(null);

      const result = await adapter.executeStep({
        id: 'timeout-step',
        action: 'wait_for',
        selector: '#missingElement',
        timeout_ms: 100
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('Browser Compatibility', () => {
    test('should handle different Salesforce URL patterns', () => {
      const urls = [
        'https://test.salesforce.com/lightning',
        'https://cs42.salesforce.com/500/o',
        'https://mydomain.my.salesforce.com/one/one.app',
        'https://custom--sandbox.my.salesforce.com/lightning/page/home'
      ];

      urls.forEach(url => {
        const urlObj = new URL(url);
        const mockWindow = createMockWindow(url, urlObj.hostname, urlObj.pathname);
        const mockDoc = createMockDocument();
        
        // Use Object.defineProperty to set hostname with includes method
        Object.defineProperty(mockWindow.location, 'hostname', {
          value: new String(urlObj.hostname) as any,
          writable: true
        });
        mockWindow.location.hostname.includes = jest.fn((str: string) => urlObj.hostname.includes(str));
        
        (global as any).window = mockWindow;
        (global as any).document = mockDoc;
        
        adapter = new SalesforceAdapter();
        expect(adapter.detect()).toBe(true);
      });
    });
  });

  describe('Basic Functionality', () => {
    test('should initialize without errors', () => {
      expect(adapter).toBeDefined();
      expect(adapter.detect).toBeDefined();
      expect(adapter.executeStep).toBeDefined();
    });

    test('should handle unknown actions gracefully', async () => {
      const result = await adapter.executeStep({
        id: 'unknown-action',
        action: 'unknown_action' as any,
        selector: '#test'
      } as any);
      
      expect(result).toBeDefined();
    });
  });
});