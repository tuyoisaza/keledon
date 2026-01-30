/**
 * Tabs Registry Module
 * Exports tab discovery and role assignment functionality
 */

export { TabRegistry, tabRegistry } from './tab-discovery';
export { RoleAssigner, roleAssigner } from './role-assignment';

export type {
  TabInfo,
  TabRole as TabInfoRole
} from './tab-discovery';

export type {
  TabRole,
  RoleAssignmentOptions
} from './role-assignment';

// Re-export commonly used interfaces
export type {
  TabCapabilities
} from '../messaging/types';