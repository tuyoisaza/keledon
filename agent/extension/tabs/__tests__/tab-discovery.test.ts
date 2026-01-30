// C:\KELEDON\agent\src\tabs\__tests__\tab-discovery.test.ts
import { TabDiscovery } from '../registry/tab-discovery';

// Mock chrome.tabs
(global as any).chrome = {
  tabs: {
    query: jest.fn().mockResolvedValue([
      { id: 1, url: 'https://genesys.com/app' },
      { id: 2, url: 'https://google.com' },
    ])
  }
};

describe('TabDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns audio+ui to Genesys tab', async () => {
    const discovery = TabDiscovery.getInstance();
    await discovery.discover();
    const tabs = Array.from(discovery.getTabs().entries());
    expect(tabs[0][1].role).toBe('audio+ui');
    expect(tabs[1][1].role).toBe('ui-only');
  });
});