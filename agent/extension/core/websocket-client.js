/**
 * WebSocket Client - Core Agent Runtime Component
 * Handles communication with cloud backend using Socket.IO
 */

import { io } from '../ui/socket.io.min.js';

export class WebSocketClient {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.socket = null;
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.messageQueue = [];
    this.eventHandlers = new Map();
  }

  /**
   * Connect to cloud backend
   * @param {string} url - WebSocket server URL
   * @param {Object} options - Connection options
   */
  async connect(url, options = {}) {
    if (this.socket && this.socket.connected) {
      console.log('Already connected');
      return;
    }

    try {
      this.connectionState = 'connecting';
      
      // Connect to agent namespace
      this.socket = io(`${url}/agent`, {
        cors: {
          origin: ['chrome-extension://*', 'moz-extension://*'],
          methods: ['GET', 'POST'],
          credentials: true
        },
        ...options
      });
      
      this.socket.on('connect', () => this.handleOpen());
      this.socket.on('event', (data) => this.handleCommand(data));
      this.socket.on('command', (data) => this.handleCommand(data));
      this.socket.on('connected', (data) => this.handleConnected(data));
      this.socket.on('error', (error) => this.handleError(error));
      this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.socket.disconnect();
          this.emit('connection:timeout');
        }
      }, 10000);

      this.emit('connection:attempting', { url, options });

    } catch (error) {
      this.emit('connection:error', error);
      throw error;
    }
  }

  /**
   * Disconnect from cloud backend
   */
  disconnect() {
    this.reconnectAttempts = 0;
    
    if (this.socket) {
      this.connectionState = 'disconnecting';
      this.socket.disconnect();
    }
  }

  /**
   * Send message to cloud
   * @param {Object} message - Message to send
   */
  send(message) {
    if (!this.socket || !this.socket.connected) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.socket.emit('event', message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Send brain event to cloud (per canonical contract)
   * @param {string} type - Event type (text_input, ui_result, system)
   * @param {Object} payload - Event payload
   */
  sendBrainEvent(type, payload) {
    const session = this.sessionManager.getCurrentSession();
    if (!session) {
      console.warn('No active session to send event from');
      return false;
    }

    const brainEvent = {
      event_id: crypto.randomUUID(),
      session_id: session.id,
      timestamp: new Date().toISOString(),
      type: type,
      payload: payload
    };

    return this.send(brainEvent);
  }

  /**
   * Handle Socket.IO connection open
   */
  handleOpen() {
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    this.emit('connection:established');
    
    // Send queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Handle connection acknowledgment from cloud
   */
  handleConnected(data) {
    this.emit('connected:acknowledged', data);
  }

  /**
   * Handle command from cloud (per canonical contract)
   */
  handleCommand(command) {
    this.emit('command:received', command);
    
    switch (command.type) {
      case 'say':
        this.emit('tts:speak', command.payload);
        break;
      case 'ui_steps':
        this.emit('rpa:execute', command.payload);
        break;
      case 'mode':
        this.emit('mode:change', command.payload);
        break;
      case 'stop':
        this.emit('session:stop', command.payload);
        break;
    }
  }

  /**
   * Handle heartbeat message
   */
  handleHeartbeat(payload) {
    this.emit('heartbeat:received', payload);
    
    // Respond with heartbeat
    this.send({
      message_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      direction: 'agent_to_cloud',
      message_type: 'heartbeat',
      payload: {
        status: 'alive',
        uptime_ms: Date.now() - performance.now()
      }
    });
  }

  /**
   * Handle Socket.IO disconnect
   */
  handleDisconnect(reason) {
    this.connectionState = 'disconnected';
    this.emit('connection:closed', { reason });

    // Attempt reconnection if not intentional
    if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  /**
   * Handle Socket.IO error
   */
  handleError(error) {
    this.connectionState = 'error';
    console.error('Socket.IO error:', error);
    this.emit('connection:error', error);
  }

  /**
   * Attempt to reconnect
   */
  async attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.emit('reconnection:attempting', { 
      attempt: this.reconnectAttempts, 
      delay 
    });

    setTimeout(() => {
      // Get URL from current socket or default
      const url = this.socket?.io?.uri || this.lastConnectedUrl;
      if (url) {
        this.connect(url);
      }
    }, delay);
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in WebSocket client event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connectionState === 'connected' && 
           this.socket && 
           this.socket.connected;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.disconnect();
    this.eventHandlers.clear();
    this.messageQueue = [];
  }
}