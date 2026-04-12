// Core Runtime - Session Manager, WebSocket Client, Event Routing
// This module coordinates all agent functionality

export { SessionManager } from './session-manager.js';
export { WebSocketClient } from './websocket-client.js';
export { EventRouter } from './event-router.js';

// Factory function to initialize the core runtime
export function createCoreRuntime(config = {}) {
  const sessionManager = new SessionManager();
  const webSocketClient = new WebSocketClient(sessionManager);
  const eventRouter = new EventRouter(sessionManager, webSocketClient);

  // Setup initial routes for common functionality
  eventRouter.register('tts:speak', (data) => {
    console.log('TTS Speak command:', data);
    // TTS handler will be connected here
  });

  eventRouter.register('rpa:execute', (data) => {
    console.log('RPA Execute command:', data);
    // RPA handler will be connected here
  });

  eventRouter.register('autobrowse:execute', async (data) => {
    console.log('AutoBrowse Execute command:', data);
    const { AutoBrowseBridge } = await import('./autobrowse-bridge.js');
    const bridge = new AutoBrowseBridge();
    
    if (!bridge.isEnabled()) {
      console.log('AutoBrowse disabled, falling back to RPA');
      eventRouter.route('rpa:execute', data);
      return { fallback: 'rpa', reason: 'autobrowse_disabled' };
    }
    
    try {
      const result = await bridge.executeGoal({
        goal: data.goal || data.steps?.[0]?.description || 'Execute UI steps',
        context: data.context,
        flowId: data.flow_id,
        sessionId: data.session_id,
        targetUrl: data.context?.targetUrl
      });
      console.log('AutoBrowse result:', result);
      return result;
    } catch (error) {
      console.error('AutoBrowse execution failed, falling back to RPA:', error);
      eventRouter.route('rpa:execute', data);
      return { fallback: 'rpa', reason: 'autobrowse_error', error: String(error) };
    }
  });

  eventRouter.register('rpa:execute-step', (data) => {
    console.log('RPA Execute Step:', data);
    // RPA step handler will be connected here
  });

  eventRouter.register('audio:start-capture', () => {
    console.log('Start audio capture');
    // Audio capture handler will be connected here
  });

  eventRouter.register('audio:stop-capture', () => {
    console.log('Stop audio capture');
    // Audio capture handler will be connected here
  });

  return {
    sessionManager,
    webSocketClient,
    eventRouter,
    connect: (url) => webSocketClient.connect(url, config),
    disconnect: () => webSocketClient.disconnect(),
    isConnected: () => webSocketClient.isConnected(),
    startSession: (sessionId, sessionConfig) => {
      return sessionManager.initializeSession(sessionId, sessionConfig)
        .then(() => sessionManager.startSession());
    },
    stopSession: () => sessionManager.stopSession(),
    cleanup: () => {
      sessionManager.cleanup();
      webSocketClient.cleanup();
      eventRouter.cleanup();
    }
  };
}