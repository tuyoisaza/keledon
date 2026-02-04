/**
 * WebSocket Client - Core Agent Runtime Component
 * Handles communication with cloud backend
 */

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
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    try {
      this.socket = new WebSocket(url);
      this.connectionState = 'connecting';
      
      this.socket.onopen = () => this.handleOpen();
      this.socket.onmessage = (event) => this.handleMessage(event);
      this.socket.onclose = (event) => this.handleClose(event);
      this.socket.onerror = (error) => this.handleError(error);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.socket.close();
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
      this.socket.close();
    }
  }

  /**
   * Send message to cloud
   * @param {Object} message - Message to send
   */
  send(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Send brain event to cloud
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
      message_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      direction: 'agent_to_cloud',
      message_type: 'brain_event',
      session_id: session.id,
      payload: {
        type,
        ...payload
      }
    };

    return this.send(brainEvent);
  }

  /**
   * Handle WebSocket open
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
      default:
        console.warn('Unknown brain command type:', payload.type);
    }
  }

  /**
   * Initialize TTS Manager for real speech synthesis
   */
  initializeTTSManager() {
    if (this.ttsManager) return;

    // Import and initialize TTS Manager
    import('./tts/tts-manager.js').then(({ TTSManager }) => {
      this.ttsManager = new TTSManager(this);
      console.log('WebSocketClient: TTS Manager initialized for real speech synthesis');
    }).catch(error => {
      console.error('WebSocketClient: Failed to initialize TTS Manager', error);
    });
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
   * Handle WebSocket close
   */
  handleClose(event) {
    this.connectionState = 'disconnected';
    this.emit('connection:closed', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean 
    });

    // Attempt reconnection if not intentional
    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  handleError(error) {
    this.connectionState = 'error';
    console.error('WebSocket error:', error);
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
      const url = this.socket?.url || this.lastConnectedUrl;
      if (url) {
        this.connect(url);
      }
    }, delay);
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
           this.socket.readyState === WebSocket.OPEN;
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