/**
 * Tabs Messaging Types
 * Type definitions for inter-tab communication
 */

export interface TabCapabilities {
  audio: boolean;
  ui: boolean;
  storage: boolean;
  rpa: boolean;
  microphone: boolean;
}

export interface TabMessage {
  id: string;
  type: 'request' | 'response' | 'broadcast';
  source: string;
  target?: string;
  action: string;
  payload: any;
  timestamp: number;
  correlationId?: string;
}

export interface TabMessageResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface SelectorInfo {
  element: string;
  selector: string;
  attributes?: Record<string, string>;
  text?: string;
  index?: number;
}

export interface SelectorMessage {
  action: 'find' | 'click' | 'fill' | 'select' | 'read' | 'wait';
  selector: SelectorInfo;
  parameters?: Record<string, any>;
  timeout?: number;
}

export interface SelectorResult {
  found: boolean;
  element?: Element;
  text?: string;
  value?: string;
  error?: string;
}

export interface TabConnection {
  id: string;
  port: chrome.runtime.Port;
  type: 'content-script' | 'background' | 'popup';
  url?: string;
  lastActivity: number;
  isActive: boolean;
}

export interface MessageRouting {
  source: string;
  destination?: string;
  messageType: string;
  priority: 'high' | 'medium' | 'low';
  retries?: number;
  maxRetries?: number;
}