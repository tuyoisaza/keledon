/**
 * Event Router - Core Agent Runtime Component
 * Routes events between components and handles coordination
 */

export class EventRouter {
  constructor(sessionManager, webSocketClient) {
    this.sessionManager = sessionManager;
    this.webSocketClient = webSocketClient;
    this.routes = new Map();
    this.middleware = [];
    
    this.setupEventBridges();
  }

  /**
   * Setup automatic event bridging between components
   */
  setupEventBridges() {
    // Bridge Session Manager events to WebSocket
    this.sessionManager.on('session:started', (data) => {
      this.webSocketClient.sendBrainEvent('system', {
        event: 'call_started',
        data: { ...data }
      });
    });

    this.sessionManager.on('session:stopped', (data) => {
      this.webSocketClient.sendBrainEvent('system', {
        event: 'call_ended',
        data: { ...data }
      });
    });

    this.sessionManager.on('session:config-updated', (data) => {
      this.webSocketClient.sendBrainEvent('system', {
        event: 'config_updated',
        data: { ...data }
      });
    });

    // Bridge WebSocket events to routing
    this.webSocketClient.on('command:received', (command) => {
      this.route('cloud:command', command);
    });

    this.webSocketClient.on('connection:established', () => {
      this.route('system:connected', {});
    });

    this.webSocketClient.on('connection:closed', (data) => {
      this.route('system:disconnected', data);
    });

    this.webSocketClient.on('connection:error', (error) => {
      this.route('system:error', error);
    });
  }

  /**
   * Register route for event type
   * @param {string} eventType - Event type to route
   * @param {Function|Array} handlers - Handler function(s)
   */
  register(eventType, handlers) {
    if (typeof handlers === 'function') {
      handlers = [handlers];
    }

    if (!this.routes.has(eventType)) {
      this.routes.set(eventType, []);
    }
    
    this.routes.get(eventType).push(...handlers);
  }

  /**
   * Unregister route handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler to remove
   */
  unregister(eventType, handler) {
    if (!this.routes.has(eventType)) return;

    const handlers = this.routes.get(eventType);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Add middleware to event processing pipeline
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Route event to appropriate handlers
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  async route(eventType, data) {
    // Run middleware first
    for (const middleware of this.middleware) {
      try {
        await middleware(eventType, data);
      } catch (error) {
        console.error(`Middleware error for ${eventType}:`, error);
        return; // Stop processing if middleware fails
      }
    }

    // Route to registered handlers
    if (!this.routes.has(eventType)) {
      console.warn(`No handlers registered for event type: ${eventType}`);
      return;
    }

    const handlers = this.routes.get(eventType);
    
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Handler error for ${eventType}:`, error);
      }
    }
  }

  /**
   * Route STT result to cloud
   * @param {Object} sttResult - Speech-to-text result
   */
  routeSTTResult(sttResult) {
    this.webSocketClient.sendBrainEvent('text_input', {
      text: sttResult.text,
      confidence: sttResult.confidence,
      provider: sttResult.provider,
      words: sttResult.words,
      alternatives: sttResult.alternatives,
      language: sttResult.language,
      duration_ms: sttResult.duration_ms,
      metadata: sttResult.metadata
    });
  }

  /**
   * Route RPA result to cloud
   * @param {Object} rpaResult - RPA execution result
   */
  routeRPAResult(rpaResult) {
    this.webSocketClient.sendBrainEvent('ui_result', {
      flow_id: rpaResult.flowId,
      step_id: rpaResult.stepId,
      status: rpaResult.status,
      result: rpaResult.result,
      error: rpaResult.error,
      duration_ms: rpaResult.durationMs
    });
  }

  /**
   * Route system error to cloud
   * @param {Object} error - Error details
   */
  routeSystemError(error) {
    this.webSocketClient.sendBrainEvent('system', {
      event: 'error',
      data: {
        code: error.code || 'unknown_error',
        message: error.message || 'Unknown error occurred',
        details: error.details,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Create specialized routers for common patterns
   */
  createTTSRouter() {
    return {
      speak: (text, options = {}) => {
        this.webSocketClient.send({
          message_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          direction: 'agent_to_cloud',
          message_type: 'brain_event',
          session_id: this.sessionManager.getCurrentSession()?.id,
          payload: {
            type: 'say',
            payload: { text, ...options }
          }
        });
      }
    };
  }

  createRPARouter() {
    return {
      executeStep: (step) => {
        this.route('rpa:execute-step', step);
      },
      executeFlow: (flowId, steps) => {
        this.route('rpa:execute-flow', { flowId, steps });
      },
      reportResult: (result) => {
        this.routeRPAResult(result);
      }
    };
  }

  createAudioRouter() {
    return {
      sttResult: (result) => {
        this.routeSTTResult(result);
      },
      startCapture: () => {
        this.route('audio:start-capture', {});
      },
      stopCapture: () => {
        this.route('audio:stop-capture', {});
      }
    };
  }

  /**
   * Get current routes (for debugging)
   */
  getRoutes() {
    const routesMap = {};
    for (const [eventType, handlers] of this.routes) {
      routesMap[eventType] = handlers.length;
    }
    return routesMap;
  }

  /**
   * Clear all routes and middleware
   */
  clear() {
    this.routes.clear();
    this.middleware = [];
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.clear();
    // Remove event listeners
    this.sessionManager = null;
    this.webSocketClient = null;
  }
}