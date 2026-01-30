/**
 * Selector Messenger
 * Handles cross-tab communication for selector operations and element interactions
 */

import { 
  TabMessage, 
  TabMessageResponse, 
  SelectorMessage, 
  SelectorResult, 
  TabConnection,
  MessageRouting 
} from './types';

export class SelectorMessenger {
  private connections: Map<string, TabConnection> = new Map();
  private messageHandlers: Map<string, Function[]> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: TabMessageResponse) => void;
    reject: (error: Error) => void;
    timeout: number;
  }> = new Map();
  private readonly MESSAGE_TIMEOUT = 10000; // 10 seconds

  constructor() {
    this.initializeMessageHandlers();
    this.startCleanupTimer();
  }

  /**
   * Initialize built-in message handlers
   */
  private initializeMessageHandlers(): void {
    this.addHandler('selector:find', this.handleSelectorFind.bind(this));
    this.addHandler('selector:click', this.handleSelectorClick.bind(this));
    this.addHandler('selector:fill', this.handleSelectorFill.bind(this));
    this.addHandler('selector:select', this.handleSelectorSelect.bind(this));
    this.addHandler('selector:read', this.handleSelectorRead.bind(this));
    this.addHandler('selector:wait', this.handleSelectorWait.bind(this));
  }

  /**
   * Register a new connection
   */
  registerConnection(port: chrome.runtime.Port, type: TabConnection['type'], url?: string): string {
    const connectionId = this.generateConnectionId();
    const connection: TabConnection = {
      id: connectionId,
      port,
      type,
      url,
      lastActivity: Date.now(),
      isActive: true
    };

    this.connections.set(connectionId, connection);

    // Setup port message listener
    port.onMessage.addListener((message: TabMessage) => {
      this.handleMessage(message, connectionId);
    });

    port.onDisconnect.addListener(() => {
      this.unregisterConnection(connectionId);
    });

    console.log(`Connection registered: ${connectionId} (${type})`);
    return connectionId;
  }

  /**
   * Unregister a connection
   */
  unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isActive = false;
      this.connections.delete(connectionId);
      console.log(`Connection unregistered: ${connectionId}`);
    }
  }

  /**
   * Send a message to a specific connection
   */
  async sendMessage(
    targetId: string, 
    action: string, 
    payload: any, 
    priority: MessageRouting['priority'] = 'medium'
  ): Promise<TabMessageResponse> {
    const message: TabMessage = {
      id: this.generateMessageId(),
      type: 'request',
      source: this.getCurrentConnectionId(),
      target: targetId,
      action,
      payload,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Message timeout: ${action}`));
      }, this.MESSAGE_TIMEOUT);

      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout
      });

      this.routeMessage(message, priority);
    });
  }

  /**
   * Send selector operation to target tab
   */
  async sendSelectorOperation(
    targetTabId: string,
    selectorMessage: SelectorMessage
  ): Promise<SelectorResult> {
    try {
      const response = await this.sendMessage(
        targetTabId,
        'selector:execute',
        selectorMessage,
        'high'
      );

      if (response.success && response.data) {
        return response.data as SelectorResult;
      } else {
        throw new Error(response.error?.message || 'Selector operation failed');
      }
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Find element in target tab
   */
  async findElement(targetTabId: string, selector: string, timeout = 5000): Promise<SelectorResult> {
    return this.sendSelectorOperation(targetTabId, {
      action: 'find',
      selector: { element: 'unknown', selector },
      timeout
    });
  }

  /**
   * Click element in target tab
   */
  async clickElement(targetTabId: string, selector: string): Promise<SelectorResult> {
    return this.sendSelectorOperation(targetTabId, {
      action: 'click',
      selector: { element: 'unknown', selector }
    });
  }

  /**
   * Fill field in target tab
   */
  async fillField(targetTabId: string, selector: string, value: string): Promise<SelectorResult> {
    return this.sendSelectorOperation(targetTabId, {
      action: 'fill',
      selector: { element: 'unknown', selector },
      parameters: { value }
    });
  }

  /**
   * Select option in target tab
   */
  async selectOption(targetTabId: string, selector: string, option: string): Promise<SelectorResult> {
    return this.sendSelectorOperation(targetTabId, {
      action: 'select',
      selector: { element: 'unknown', selector },
      parameters: { option }
    });
  }

  /**
   * Read text from target tab
   */
  async readText(targetTabId: string, selector: string): Promise<SelectorResult> {
    return this.sendSelectorOperation(targetTabId, {
      action: 'read',
      selector: { element: 'unknown', selector }
    });
  }

  /**
   * Wait for element in target tab
   */
  async waitForElement(targetTabId: string, selector: string, timeout = 10000): Promise<SelectorResult> {
    return this.sendSelectorOperation(targetTabId, {
      action: 'wait',
      selector: { element: 'unknown', selector },
      timeout
    });
  }

  /**
   * Add message handler
   */
  addHandler(action: string, handler: Function): void {
    if (!this.messageHandlers.has(action)) {
      this.messageHandlers.set(action, []);
    }
    this.messageHandlers.get(action)!.push(handler);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: TabMessage, sourceId: string): Promise<void> {
    const connection = this.connections.get(sourceId);
    if (connection) {
      connection.lastActivity = Date.now();
    }

    if (message.type === 'response') {
      this.handleResponse(message);
      return;
    }

    // Handle request
    const handlers = this.messageHandlers.get(message.action) || [];
    let response: TabMessageResponse;

    try {
      let result: any = null;
      
      for (const handler of handlers) {
        result = await handler(message.payload, sourceId);
        if (result) break;
      }

      response = {
        id: message.id,
        success: true,
        data: result,
        timestamp: Date.now()
      };
    } catch (error) {
      response = {
        id: message.id,
        success: false,
        error: {
          code: 'handler_error',
          message: error.message,
          details: error.stack
        },
        timestamp: Date.now()
      };
    }

    // Send response back to source
    this.sendResponse(message, response);
  }

  /**
   * Handle message response
   */
  private handleResponse(response: TabMessageResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);
      
      if (response.success) {
        pending.resolve(response);
      } else {
        pending.reject(new Error(response.error?.message || 'Request failed'));
      }
    }
  }

  /**
   * Route message to appropriate destination
   */
  private routeMessage(message: TabMessage, priority: MessageRouting['priority']): void {
    if (message.target) {
      // Send to specific target
      const targetConnection = this.connections.get(message.target);
      if (targetConnection && targetConnection.isActive) {
        targetConnection.port.postMessage(message);
      }
    } else {
      // Broadcast to all connections except source
      for (const [id, connection] of this.connections) {
        if (id !== message.source && connection.isActive) {
          connection.port.postMessage(message);
        }
      }
    }
  }

  /**
   * Send response message
   */
  private sendResponse(originalMessage: TabMessage, response: TabMessageResponse): void {
    const responseMessage: TabMessage = {
      id: this.generateMessageId(),
      type: 'response',
      source: this.getCurrentConnectionId(),
      target: originalMessage.source,
      action: originalMessage.action,
      payload: response,
      timestamp: Date.now(),
      correlationId: originalMessage.id
    };

    this.routeMessage(responseMessage, 'high');
  }

  // Selector operation handlers
  private async handleSelectorFind(payload: SelectorMessage, sourceId: string): Promise<SelectorResult> {
    return this.executeSelectorOperation(payload);
  }

  private async handleSelectorClick(payload: SelectorMessage, sourceId: string): Promise<SelectorResult> {
    return this.executeSelectorOperation(payload);
  }

  private async handleSelectorFill(payload: SelectorMessage, sourceId: string): Promise<SelectorResult> {
    return this.executeSelectorOperation(payload);
  }

  private async handleSelectorSelect(payload: SelectorMessage, sourceId: string): Promise<SelectorResult> {
    return this.executeSelectorOperation(payload);
  }

  private async handleSelectorRead(payload: SelectorMessage, sourceId: string): Promise<SelectorResult> {
    return this.executeSelectorOperation(payload);
  }

  private async handleSelectorWait(payload: SelectorMessage, sourceId: string): Promise<SelectorResult> {
    return this.executeSelectorOperation(payload);
  }

  /**
   * Execute selector operation in current context
   */
  private async executeSelectorOperation(payload: SelectorMessage): Promise<SelectorResult> {
    try {
      const element = document.querySelector(payload.selector.selector);
      
      if (!element) {
        return {
          found: false,
          error: `Element not found: ${payload.selector.selector}`
        };
      }

      switch (payload.action) {
        case 'find':
          return { found: true, element };
          
        case 'click':
          (element as HTMLElement).click();
          return { found: true, element };
          
        case 'fill':
          if (payload.parameters?.value) {
            (element as HTMLInputElement | HTMLTextAreaElement).value = payload.parameters.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return { found: true, element, value: payload.parameters?.value };
          
        case 'select':
          if (payload.parameters?.option && element.tagName === 'SELECT') {
            const select = element as HTMLSelectElement;
            for (let i = 0; i < select.options.length; i++) {
              if (select.options[i].text.toLowerCase().includes(payload.parameters.option.toLowerCase())) {
                select.selectedIndex = i;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                break;
              }
            }
          }
          return { found: true, element };
          
        case 'read':
          return {
            found: true,
            element,
            text: element.textContent || '',
            value: (element as HTMLInputElement).value
          };
          
        case 'wait':
          return { found: true, element };
          
        default:
          return {
            found: false,
            error: `Unknown selector action: ${payload.action}`
          };
      }
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current connection ID
   */
  private getCurrentConnectionId(): string {
    // In a real implementation, this would get the current context's connection ID
    return 'current_context';
  }

  /**
   * Start cleanup timer for inactive connections
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

      for (const [id, connection] of this.connections) {
        if (now - connection.lastActivity > INACTIVITY_TIMEOUT) {
          this.unregisterConnection(id);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Get connection status
   */
  getStatus(): {
    totalConnections: number;
    activeConnections: number;
    pendingRequests: number;
    connectionTypes: Record<string, number>;
  } {
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length;

    const connectionTypes: Record<string, number> = {};
    for (const connection of this.connections.values()) {
      connectionTypes[connection.type] = (connectionTypes[connection.type] || 0) + 1;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections,
      pendingRequests: this.pendingRequests.size,
      connectionTypes
    };
  }
}

// Export singleton instance
export const selectorMessenger = new SelectorMessenger();