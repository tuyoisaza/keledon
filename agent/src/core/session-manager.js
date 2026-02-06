/**
 * Session Manager - Canonical Session Lifecycle Management
 * Creates and manages real sessions with UUIDs (anti-demo compliance)
 * Integrates with canonical event contracts
 */
import { TabContext } from './tab-context.js';

export class SessionManager {
  constructor() {
    this.sessions = new Map(); // session_id -> session data
    this.activeSessionId = null;
    this.connectionState = 'disconnected';
    this.eventHandlers = new Map();
    this.agentId = null;
    this.config = {
      sessionTimeout: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      ...this.getEnvironmentConfig()
    };
    
    // Start cleanup interval
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);
  }

  /**
   * Create a new real session (anti-demo compliance)
   */
  async createSession(metadata = {}) {
    try {
      // Generate real UUID (no fake prefixes)
      const sessionId = crypto.randomUUID();
      
      const session = {
        id: sessionId,
        agent_id: this.getAgentId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        config: {
          audioFormat: 'audio/l16;rate=16000',
          sttProvider: 'deepgram',
          ttsProvider: 'elevenlabs',
          debugMode: false,
          ...metadata.config
        },
        metadata: {
          ...metadata,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome Extension',
          tab_url: metadata.tabUrl || null,
          created_via: 'background_service'
        },
        events: [],
        stats: {
          events_sent: 0,
          commands_received: 0,
          errors: 0
        }
      };

      this.sessions.set(sessionId, session);
      this.activeSessionId = sessionId;

      console.log('Created real session:', sessionId);
      
      // Emit session created event
      this.emit('session:created', session);
      
      return session;

    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  /**
   * Start session (begin listening) - compatibility method
   */
  async startSession() {
    const session = this.getCurrentSession();
    if (!session) {
      // Create session if none exists
      return await this.createSession();
    }

    session.status = 'active';
    session.started_at = new Date().toISOString();
    session.updated_at = new Date().toISOString();
    
    this.emit('session:started', { 
      sessionId: session.id,
      startTime: session.started_at 
    });
    
    return session;
  }

  /**
   * Stop session
   */
  async stopSession() {
    const session = this.getCurrentSession();
    if (!session) return;

    session.status = 'stopped';
    session.stopped_at = new Date().toISOString();
    session.updated_at = new Date().toISOString();
    
    const duration = session.stopped_at ? 
      new Date(session.stopped_at).getTime() - new Date(session.created_at).getTime() : 0;
    
    this.emit('session:stopped', {
      sessionId: session.id,
      endTime: session.stopped_at,
      duration
    });
  }

  /**
   * Close session
   */
  async closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session not found for closing: ${sessionId}`);
      return null;
    }

    // Update status
    session.status = 'closed';
    session.closed_at = new Date().toISOString();
    session.updated_at = new Date().toISOString();

    // Clear active session if this was it
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    // Emit session closed event
    this.emit('session:closed', session);
    
    console.log('Closed session:', sessionId);
    return session;
  }

  /**
   * Get current active session
   */
  getCurrentSession() {
    if (!this.activeSessionId) {
      return null;
    }

    const session = this.sessions.get(this.activeSessionId);
    if (!session) {
      this.activeSessionId = null;
      return null;
    }

    // Enrich with tab metadata from TabContext
    try {
      const tab = TabContext.getTab();
      if (tab) {
        session.activeTab = tab;
      }
    } catch (e) {
      // Fail silently — tab-context may not be initialized yet
    }

    return session;
  }

  /**
   * Compatibility property for legacy code
   */
  get currentSession() {
    return this.getCurrentSession();
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
   * Get configuration from environment (anti-demo)
   */
  getEnvironmentConfig() {
    return {
      sessionTimeout: parseInt(process.env?.SESSION_TIMEOUT_MS) || 3600000,
      cleanupInterval: parseInt(process.env?.CLEANUP_INTERVAL_MS) || 300000
    };
  }

  /**
   * Add event to session
   */
  addSessionEvent(sessionId, event) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Validate event structure
    if (!event.session_id || event.session_id !== sessionId) {
      throw new Error('Event session_id mismatch');
    }

    const sessionEvent = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      event_type: event.event_type,
      payload: event.payload,
      ts: event.ts || new Date().toISOString(),
      agent_id: event.agent_id || this.getAgentId(),
      created_at: new Date().toISOString()
    };

    // Add to session events
    session.events.push(sessionEvent);
    session.stats.events_sent++;
    session.updated_at = new Date().toISOString();

    // Emit event added
    this.emit('session:event_added', { session, event: sessionEvent });
    
    return sessionEvent;
  }

  /**
   * Get agent ID
   */
  getAgentId() {
    // Generate stable agent ID based on extension instance
    if (!this.agentId) {
      this.agentId = 'Agent-Extension-' + crypto.randomUUID().slice(0, 8);
    }
    return this.agentId;
  }

  /**
   * Validate session ID format (anti-demo compliance)
   */
  validateSessionId(sessionId) {
    // Check for real UUID format (not fake prefixes like 'ses_' or Date.now())
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions) {
      const createdAt = new Date(session.created_at).getTime();
      const age = now - createdAt;

      if (age > this.config.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      console.log(`Cleaning up ${expiredSessions.length} expired sessions`);
      
      expiredSessions.forEach(sessionId => {
        this.closeSession(sessionId);
        this.sessions.delete(sessionId);
      });

      this.emit('sessions:cleaned_up', { count: expiredSessions.length });
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close all active sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    this.sessions.clear();
    this.activeSessionId = null;
    this.eventHandlers.clear();
  }
}