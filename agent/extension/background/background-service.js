// Background Service - Chrome Extension (MV3)
// Handles Sessions, WebSocket, STT, TTS

// Temporary: Skip complex imports for basic functionality
// import { SessionManager } from '../../src/core/session-manager.js';
// import { WebSocketClient } from '../../src/core/websocket-client.js';
// import { STTManager } from '../../src/core/stt-manager.js';
// import { TTSManager } from '../../src/core/tts-manager.js';

class BackgroundService {
  constructor() {
    // Simplified for phase O/N-1: Basic functionality only
    this.componentStatus = {
      websocket: 'disconnected',
      stt: 'ready',
      tts: 'ready'
    };

    this.isListening = false;
    this.currentSessionId = null;
    this.agentActive = true; // Master toggle for agent control
  }

  async start() {
    console.log('[KELEDON] BackgroundService starting');

    await this.initializeComponents();
    this.setupEventHandlers();
    this.setupMessageHandlers();

    console.log('[KELEDON] BackgroundService ready');
  }

  async initializeComponents() {
    // Phase O/N-1: Basic initialization only
    console.log('[KELEDON] Basic components initialized');
  }

  setupEventHandlers() {
    // Phase O/N-1: No complex event handlers
    console.log('[KELEDON] Basic event handlers setup');
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });
  }

  async handleMessage(message, sendResponse) {
    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({
          socketConnected: false, // Phase O/N-2: No WebSocket yet
          isListening: this.isListening,
          sessionId: this.currentSessionId,
          agentActive: this.agentActive,
          sttEnabled: this.agentActive, // Controlled by master toggle
          ttsEnabled: this.agentActive  // Controlled by master toggle
        });
        break;

      case 'PING':
        // Phase O/N-1: Basic connectivity test
        sendResponse({ type: 'PONG', timestamp: Date.now() });
        break;

      case 'TOGGLE_AGENT':
        this.agentActive = !this.agentActive;
        console.log('[KELEDON] Agent active:', this.agentActive);
        sendResponse({ agentActive: this.agentActive });
        break;

      case 'TEST_MESSAGE':
        console.log('[KELEDON] Test message received:', message.text);
        sendResponse({ received: true, text: message.text });
        break;

      default:
        sendResponse({ error: 'Unknown message type: ' + message.type });
    }
  }

  // Phase O/N-1: No complex functionality yet
// All methods will be implemented in later phases
}

export { BackgroundService };