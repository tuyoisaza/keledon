/**
 * Session Manager - Core Agent Runtime Component
 * Manages conversation sessions, connection state, and lifecycle
 */
import { TabContext } from './tab-context';

export class SessionManager {
  constructor() {
    this.currentSession = null;
    this.connectionState = 'disconnected';
    this.eventHandlers = new Map();
    this.webSocketClient = null;
  }

  /**
   * Set WebSocket client for cloud communication
   */
  setWebSocketClient(webSocketClient) {
    this.webSocketClient = webSocketClient;
  }

  /**
   * Create a new session with cloud backend (real runtime path)
   */
  async createSession(metadata = {}) {
    try {
      const agentId = 'chrome-extension-' + Date.now();
      
      if (this.webSocketClient && this.webSocketClient.isConnected()) {
        // Create session via cloud
        this.webSocketClient.socket.emit('session.create', {
          agent_id: agentId,
          tab_url: metadata.tabUrl,
          tab_title: metadata.tabTitle
        });

        // Wait for session.created response
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Session creation timeout'));
          }, 10000);

          const handler = (data) => {
            clearTimeout(timeout);
            this.webSocketClient.socket.off('session.created', handler);
            
            this.currentSession = {
              id: data.session_id,
              agent_id: data.agent_id,
              status: data.status,
              created_at: data.created_at,
              startTime: new Date(),
              config: {
                audioFormat: 'audio/l16;rate=16000',
                sttProvider: 'deepgram',
                ttsProvider: 'elevenlabs',
                debugMode: false,
                ...metadata
              },
              state: 'active'
            };

            this.emit('session:created', this.currentSession);
            resolve(this.currentSession);
          };

          this.webSocketClient.socket.on('session.created', handler);
        });
      } else {
        // Fallback: create local session if not connected
        const sessionId = 'local-' + crypto.randomUUID();
        this.currentSession = {
          id: sessionId,
          agent_id: agentId,
          status: 'active',
          created_at: new Date().toISOString(),
          startTime: new Date(),
          config: {
            audioFormat: 'audio/l16;rate=16000',
            sttProvider: 'deepgram',
            ttsProvider: 'elevenlabs',
            debugMode: false,
            ...metadata
          },
          state: 'active'
        };

        this.emit('session:created', this.currentSession);
        return this.currentSession;
      }
    } catch (error) {
      console.error('Session creation failed:', error);
      throw error;
    }
  }

  /**
   * Initialize a new session (legacy method)
   * @param {string} sessionId - Unique session identifier
   * @param {Object} config - Session configuration
   */
  async initializeSession(sessionId, config = {}) {
    console.warn('initializeSession is deprecated, use createSession instead');
    return this.createSession(config);
  }

  /**
   * Start the session (begin listening)
   */
  async startSession() {
    if (!this.currentSession) {
      throw new Error('No session initialized. Call initializeSession first.');
    }

    this.currentSession.state = 'active';
    this.currentSession.startTime = new Date();
    
    this.emit('session:started', { 
      sessionId: this.currentSession.id,
      startTime: this.currentSession.startTime 
    });
  }

/**
   * Stop session
   */
  async stopSession() {
    if (!this.currentSession) return;

    this.currentSession.state = 'stopped';
    this.currentSession.endTime = new Date();
    
    const duration = this.currentSession.endTime - this.currentSession.startTime;
    
    this.emit('session:stopped', {
      sessionId: this.currentSession.id,
      endTime: this.currentSession.endTime,
      duration
    });
  }

  /**
   * Close session (alias for stopSession)
   */
  async closeSession(sessionId) {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      console.warn('No matching session to close:', sessionId);
      return;
    }

    await this.stopSession();
    this.currentSession = null;
  }

  /**
   * Get current session info
   * Enriches with active tab metadata from TabContext
   */
  getCurrentSession() {
    if (!this.currentSession) return null;

    try {
      const tab = TabContext.getTab();
      if (tab) {
        this.currentSession.activeTab = tab;
      }
    } catch (e) {
      // Fail silently — tab-context may not be initialized yet
    }

    return this.currentSession;
  }

  /**
   * Update session configuration
   */
  updateConfig(config) {
    if (!this.currentSession) return;

    this.currentSession.config = {
      ...this.currentSession.config,
      ...config
    };

    this.emit('session:config-updated', {
      sessionId: this.currentSession.id,
      config: this.currentSession.config
    });
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
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.currentSession) {
      this.stopSession();
    }
    this.currentSession = null;
    this.eventHandlers.clear();
  }
}