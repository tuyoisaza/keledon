// Tabs Management - Registry and Messaging
// This module handles multi-tab coordination and content script communication

export { TabRegistry, tabRegistry, RoleAssigner, roleAssigner } from './registry/index.js';
export { SelectorMessenger, selectorMessenger } from './messaging/index.js';

export type {
  TabInfo,
  TabRole as TabInfoRole,
  TabCapabilities,
  TabMessage,
  TabMessageResponse,
  SelectorInfo,
  SelectorMessage,
  SelectorResult,
  TabConnection,
  MessageRouting
} from './registry/index.js';

export type {
  TabMessage,
  TabMessageResponse,
  SelectorInfo,
  SelectorMessage,
  SelectorResult,
  TabConnection,
  MessageRouting
} from './messaging/index.js';