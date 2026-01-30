/**
 * Tabs Messaging Module
 * Exports messaging and communication functionality for inter-tab coordination
 */

export { SelectorMessenger, selectorMessenger } from './selector-messenger';

export type {
  TabCapabilities,
  TabMessage,
  TabMessageResponse,
  SelectorInfo,
  SelectorMessage,
  SelectorResult,
  TabConnection,
  MessageRouting
} from './types';