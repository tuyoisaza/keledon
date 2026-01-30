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
  }

  /**
   * Initialize a new session
   * @param {string} sessionId - Unique session identifier
   * @param {Object} config - Session configuration
   */
  async initializeSession(sessionId, config = {}) {
    this.currentSession = {
      id: sessionId,
      startTime: new Date(),
      config: {
        audioFormat: 'audio/l16;rate=16000',
        sttProvider: 'deepgram',
        ttsProvider: 'elevenlabs',
        debugMode: false,
        ...config
      },
      state: 'initialized'
    };

    this.emit('session:initialized', { sessionId, config });
    return this.currentSession;
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
   * Stop the session
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