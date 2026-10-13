const tabEvents = () => ({ addListener: jest.fn(), removeListener: jest.fn() });

const mockChrome = {
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    onCreated: tabEvents(),
    onUpdated: tabEvents(),
    onRemoved: tabEvents(),
    onActivated: tabEvents(),
  },
};

(global as any).chrome = mockChrome;
const { TabDiscovery } = require('../registry/tab-discovery') as typeof import('../registry/tab-discovery');

describe('TabRegistry tenant-configured discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks ordinary web tabs without assuming a telephony or CRM vendor', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://callpicker.example/agent' },
      { id: 2, url: 'https://local-crm.example/customers' },
      { id: 3, url: 'https://unrelated.example/news' },
    ]);
    const registry = new TabDiscovery({
      trackedDomains: ['callpicker.example', 'local-crm.example'],
    });

    const tabs = await registry.discoverTabs();

    expect(mockChrome.tabs.query).toHaveBeenCalledWith({});
    expect(tabs.map((tab) => tab.type)).toEqual(['ui-only', 'ui-only']);
    expect(tabs.map((tab) => tab.id)).toEqual([1, 2]);
  });

  it('classifies only domains supplied by the tenant configuration as audio-capable', async () => {
    mockChrome.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://voice.customer.example/agent' },
      { id: 2, url: 'https://crm.customer.example/cases' },
    ]);
    const registry = new TabDiscovery({
      trackedDomains: ['crm.customer.example'],
      audioDomains: ['voice.customer.example'],
    });

    const tabs = await registry.discoverTabs();

    expect(tabs.map((tab) => tab.type)).toEqual(['audio+ui', 'ui-only']);
  });
});
