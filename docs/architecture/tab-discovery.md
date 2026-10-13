# Tab Discovery System Architecture

## Overview
The Tab Discovery system enables multi-tab coordination for the KELEDON Chrome extension by discovering, tracking, and managing all extension tabs in real-time.

## Key Components

### TabRegistry and TabDiscovery Singleton
- **Pattern**: Singleton implementation for global access
- **State Management**:
  - `tabs`: Map of registered tabs by ID
  - `activeTabId`: Currently active tab reference
- **Core Methods**:
  - `discoverTabs()`: Queries browser tabs and retains only HTTP(S) hosts explicitly configured for the current tenant
  - `getTab(tabId)`: Retrieves specific tab by ID
  - `getActiveTab()`: Gets currently active tab
  - `getAllTabs()`: Returns all registered tabs
  - `updateActiveTab(tabId)`: Updates active tab reference

The registry receives `trackedDomains` and `audioDomains` as tenant configuration. It does not assume Genesys, Salesforce, CallPicker, or any other provider. A configured `audioDomains` host is also tracked; other configured hosts remain UI-only. Unconfigured browser tabs are discarded, and a tab that navigates outside the tenant's configured domains is removed.

### Event Integration
- **chrome.tabs.onUpdated**: Triggers tab discovery on tab load completion
- **chrome.tabs.onRemoved**: Triggers tab discovery on tab removal
- **Real-time synchronization**: Ensures registry stays current with browser state

## Integration Points
- **Session Manager**: Cross-tab session coordination
- **Role Assignment**: Audio+UI vs UI-only tab categorization
- **WebSocket Communication**: Real-time updates for multi-tab scenarios

## Error Handling
- Comprehensive try/catch blocks around Chrome API calls
- Console error logging with descriptive messages
- Graceful degradation when tab discovery fails

## Usage Example
```typescript
import { tabDiscovery } from './tab-discovery';

// Construct with the active tenant's non-secret domain configuration
const registry = new TabRegistry({
  trackedDomains: tenant.crmDomains,
  audioDomains: tenant.contactCenterDomains
});

// Discover only this tenant's configured business tabs
await registry.discoverTabs();

// Get active tab
const activeTab = registry.getActiveTab();

// Get all registered tabs
const allTabs = registry.getAllTabs();
```

## Dependencies
- Chrome Tabs API
- TypeScript for type safety
- Standard JavaScript promises for async operations
