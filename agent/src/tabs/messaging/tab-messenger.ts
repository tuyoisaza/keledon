// agent/src/tabs/messaging/tab-messenger.ts
// Tab messaging system for runtime ↔ content script communication

import { Message } from '../../core/types';
import { SessionManager } from '../../core/session-manager';
import { Logger } from '../../logging/logger';

export class TabMessenger {
  private static instance: TabMessenger;
  private logger: Logger;
  private sessionManager: SessionManager;
  private messageQueue: Map<string, Array<(message: Message) => void>> = new Map();

  private constructor() {
    this.logger = new Logger('TabMessenger');
    this.sessionManager = SessionManager.getInstance();
  }

  public static getInstance(): TabMessenger {
    if (!TabMessenger.instance) {
      TabMessenger.instance = new TabMessenger();
    }
    return TabMessenger.instance;
  }

  /**
   * Send message from runtime to content script in specific tab
   */
  public async sendMessageToTab(tabId: number, message: Message): Promise<boolean> {
    try {
      // Validate message against contracts
      const isValid = this.validateMessage(message);
      if (!isValid) {
        this.logger.error(`Invalid message format for tab ${tabId}:`, message);
        return false;
      }

      // Send message via Chrome API
      const result = await chrome.tabs.sendMessage(tabId, message);
      
      this.logger.debug(`Message sent to tab ${tabId}:`, message.type);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to tab ${tabId}:`, error);
      return false;
    }
  }

  /**
   * Listen for messages from content scripts
   */
  public listenForMessages(): void {
    chrome.runtime.onMessage.addListener(
      (request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        this.handleIncomingMessage(request, sender, sendResponse);
        return true; // Keep message channel open for async responses
      }
    );
  }

  /**
   * Handle incoming messages from content scripts
   */
  private handleIncomingMessage(
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): void {
    try {
      // Validate incoming message
      if (!this.validateMessage(message)) {
        this.logger.error('Received invalid message:', message);
        sendResponse({ success: false, error: 'Invalid message format' });
        return;
      }

      // Route message based on type
      switch (message.type) {
        case 'tab_registered':
          this.handleTabRegistration(message, sender);
          break;
        case 'tab_unregistered':
          this.handleTabUnregistration(message, sender);
          break;
        case 'ui_event':
          this.handleUIEvent(message, sender);
          break;
        case 'audio_status':
          this.handleAudioStatus(message, sender);
          break;
        default:
          this.logger.warn(`Unhandled message type: ${message.type}`);
          break;
      }

      sendResponse({ success: true });
    } catch (error) {
      this.logger.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle tab registration event
   */
  private handleTabRegistration(message: Message, sender: chrome.runtime.MessageSender): void {
    if (sender.tab?.id) {
      this.sessionManager.registerTab(sender.tab.id, message.payload.role || 'ui');
      this.logger.info(`Tab registered: ${sender.tab.id} with role: ${message.payload.role}`);
    }
  }

  /**
   * Handle tab unregistration event
   */
  private handleTabUnregistration(message: Message, sender: chrome.runtime.MessageSender): void {
    if (sender.tab?.id) {
      this.sessionManager.unregisterTab(sender.tab.id);
      this.logger.info(`Tab unregistered: ${sender.tab.id}`);
    }
  }

  /**
   * Handle UI events from content scripts
   */
  private handleUIEvent(message: Message, sender: chrome.runtime.MessageSender): void {
    if (sender.tab?.id) {
      // Forward to session manager or appropriate handler
      this.sessionManager.handleUIEvent(sender.tab.id, message.payload);
      this.logger.debug(`UI event received from tab ${sender.tab.id}: ${message.payload.eventType}`);
    }
  }

  /**
   * Handle audio status updates
   */
  private handleAudioStatus(message: Message, sender: chrome.runtime.MessageSender): void {
    if (sender.tab?.id) {
      this.sessionManager.updateAudioStatus(sender.tab.id, message.payload.status);
      this.logger.debug(`Audio status update from tab ${sender.tab.id}: ${message.payload.status}`);
    }
  }

  /**
   * Validate message against contract schema
   */
  private validateMessage(message: Message): boolean {
    // Basic validation - should be replaced with contract validation
    return message && 
           typeof message.type === 'string' && 
           message.type.length > 0 &&
           message.payload !== undefined;
  }

  /**
   * Get tabs by role
   */
  public getTabsByRole(role: string): number[] {
    return this.sessionManager.getTabsByRole(role);
  }

  /**
   * Broadcast message to all tabs of a specific role
   */
  public async broadcastToRole(role: string, message: Message): Promise<void> {
    const tabs = this.getTabsByRole(role);
    for (const tabId of tabs) {
      await this.sendMessageToTab(tabId, message);
    }
  }
}

// Initialize the messenger
TabMessenger.getInstance().listenForMessages();