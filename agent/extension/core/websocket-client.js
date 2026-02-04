/**
 * Socket.IO Client - Core Agent Runtime Component
 * Handles communication with cloud backend via Socket.IO
 */

// Import Socket.IO client (assuming it's loaded via manifest)
import { io } from '../ui/socket.io.esm.min.js';

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
    this.lastConnectedUrl = null;
  }

  /**
   * Connect to cloud backend via Socket.IO
   * @param {string} url - Socket.IO server URL
   * @param {Object} options - Connection options
   */
  async connect(url, options = {}) {
    if (this.socket && this.socket.connected) {
      console.log('Already connected');
      return;
    }

    try {
      this.lastConnectedUrl = url;
      this.connectionState = 'connecting';
      
      // Initialize Socket.IO client with proper options
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        ...options
      });
      
      // Setup Socket.IO event handlers
      this.socket.on('connect', () => this.handleOpen());
      this.socket.on('disconnect', (reason) => this.handleClose({ wasClean: false, reason }));
      this.socket.on('connect_error', (error) => this.handleError(error));
      this.socket.on('message', (message) => this.handleMessage({ data: JSON.stringify(message) }));

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
   * Send message to cloud via Socket.IO
   * @param {Object} message - Message to send
   */
  send(message) {
    if (!this.socket || !this.socket.connected) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.socket.emit('message', message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Send brain event to cloud via Socket.IO
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
      session_id: session.id,
      event_type: type, // text_input, ui_result, system
      payload: {
        ...payload,
        confidence: payload.confidence || 0.8,
        provider: payload.provider || 'deepgram',
        metadata: payload.metadata || {}
      },
      ts: new Date().toISOString(),
      agent_id: payload.agent_id || 'chrome-extension'
    };

    // Send as 'brain_event' to match AgentGateway @SubscribeMessage
    if (this.socket && this.socket.connected) {
      this.socket.emit('brain_event', brainEvent);
      return true;
    } else {
      console.warn('Socket not connected, queuing brain event');
      this.messageQueue.push({ type: 'brain_event', data: brainEvent });
      return false;
    }
  }

  /**
   * Handle Socket.IO connection established
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
   * Handle incoming WebSocket message
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.message_type) {
        case 'brain_command':
          this.handleBrainCommand(message.payload);
          break;
        case 'heartbeat':
          this.handleHeartbeat(message.payload);
          break;
        case 'error':
          this.handleError(message.payload);
          break;
        case 'ack':
          this.handleAcknowledgment(message.payload);
          break;
        default:
          console.warn('Unknown message type:', message.message_type);
      }
      
      this.emit('message:received', message);
      
    } catch (error) {
      console.error('Failed to parse message:', error);
      this.emit('message:error', error);
    }
  }

  /**
   * Handle brain command from cloud
   */
  handleBrainCommand(payload) {
    this.emit('command:received', payload);
    
    switch (payload.type) {
      case 'say':
        this.emit('tts:speak', payload.payload);
        break;
      case 'ui_steps':
        this.emit('rpa:execute', payload.payload);
        break;
      case 'mode':
        this.emit('mode:change', payload.payload);
        break;
      case 'stop':
        this.emit('session:stop', payload.payload);
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
   * Handle Socket.IO disconnection
   */
  handleClose(event) {
    this.connectionState = 'disconnected';
    this.emit('connection:closed', { 
      code: 1000, 
      reason: event.reason || 'Unknown',
      wasClean: event.wasClean || false 
    });

    // Socket.IO handles reconnection automatically, but we can emit events
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.emit('reconnection:attempting', { 
        attempt: this.reconnectAttempts + 1, 
        delay: this.reconnectDelay 
      });
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
   * Handle acknowledgment message
   */
  handleAcknowledgment(payload) {
    this.emit('acknowledgment:received', payload);
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