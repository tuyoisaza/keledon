import { RPAEngine } from '../src/rpa/rpa-engine';
import { SalesforceAdapter } from '../src/rpa/adapters/salesforce.adapter';
import { GenesysAdapter } from '../src/rpa/adapters/genesys.adapter';
import { SelectorOptimizer } from '../src/rpa/selectors/selector-optimizer';

export const mockChrome = {
  tabs: { query: jest.fn(), sendMessage: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), onUpdated: { addListener: jest.fn(), removeListener: jest.fn() } },
  runtime: { sendMessage: jest.fn(), onMessage: { addListener: jest.fn(), removeListener: jest.fn() }, getManifest: jest.fn(() => ({ version: '1.0.0' })) },
  storage: { local: { get: jest.fn(), set: jest.fn(), remove: jest.fn() } },
};

export const mockElement = {
  click: jest.fn(), focus: jest.fn(), blur: jest.fn(), value: '',
  textContent: 'Test Content', innerHTML: 'Test HTML', style: { display: 'block' },
  getAttribute: jest.fn(), setAttribute: jest.fn(), removeAttribute: jest.fn(),
  classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() },
  addEventListener: jest.fn(), removeEventListener: jest.fn(),
};

export const mockDocument = {
  querySelector: jest.fn(), querySelectorAll: jest.fn(), getElementById: jest.fn(),
  getElementsByClassName: jest.fn(), getElementsByName: jest.fn(),
  getElementsByTagName: jest.fn(), createElement: jest.fn(),
  addEventListener: jest.fn(), readyState: 'complete', body: mockElement,
};

global.chrome = mockChrome as any;
global.document = mockDocument as any;
global.window = {
  location: { href: 'https://test.example.com' },
  MutationObserver: jest.fn().mockImplementation(() => ({
    observe: jest.fn(), disconnect: jest.fn(), takeRecords: jest.fn(() => []),
  })),
} as any;

export function createRpaEngineTestContext() {
  jest.clearAllMocks();
  const rpaEngine = new RPAEngine({ maxConcurrentSteps: 5, defaultTimeout: 10000, retryAttempts: 3, retryDelay: 1000 });
  mockDocument.querySelector.mockReturnValue(mockElement);
  mockDocument.querySelectorAll.mockReturnValue([mockElement]);
  return {
    rpaEngine,
    salesforceAdapter: new SalesforceAdapter(),
    genesysAdapter: new GenesysAdapter(),
    selectorOptimizer: new SelectorOptimizer(),
  };
}
