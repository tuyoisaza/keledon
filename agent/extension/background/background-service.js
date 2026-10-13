// Background Service - Chrome Extension (MV3)
// Handles Sessions, WebSocket, STT, TTS

import { io } from '../ui/socket.io.esm.min.js';
import { BackgroundAuthMethods } from './background-auth.methods.js';
import { BackgroundRuntimeMethods } from './background-runtime.methods.js';
import { BackgroundCommandMethods } from './background-command.methods.js';
import { BackgroundMessageMethods } from './background-message.methods.js';

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
      tts: 'ready',
      webrtc: 'not_detected' // KELEDON-EXT-WEBRTC-STT-ENTRY-008
    };

    this.isListening = false;
    this.currentSessionId = null;
    this.agentActive = true; // Master toggle for agent control
    this.socket = null;
    this.runtimeTier = this.resolveRuntimeTier();
    this.cloudUrl = 'https://keledon.tuyoisaza.com'; // Default production URL
    
    // Branding information (C57)
    this.branding = {
      company: '—',
      brand: '—',
      team: '—'
    };
    
    // User authentication state
    this.userAuth = {
      userId: null,
      email: null,
      name: null,
      role: null,
      teamId: null,
      companyId: null,
      teamName: null,
      companyName: null,
      brandName: null,
      isAuthenticated: false
    };
    
    this.cloudUrlStorageKey = 'KELEDON_BACKEND_URL';
    this.legacyCloudUrlStorageKey = 'keledon.cloud_url';
    this.commandChannelName = null;
    this.currentCommand = null;
    this.commandHistory = []; // Track commands for history tab
    
    // KELEDON-EXT-WEBRTC-STT-ENTRY-008: WebRTC state
    this.webRTCState = {
      detected: false,
      listening: false,
      streamId: null,
      ready: false // KELEDON-EXT-WEBRTC-MESSAGING-ACK-010: Only true after ACK
    };
    
    // KELEDON-EXT-WEBRTC-MESSAGING-ACK-010: Port connections from content scripts
    this.contentPorts = new Map();
    
    // Provider configuration from Supabase (via localStorage)
    this.providerConfig = {
      sttProvider: 'webspeech-stt',
      ttsProvider: 'webspeech-tts',
      rpaProvider: 'native-dom'
    };
    
    // Load provider config from localStorage
    this.loadProviderConfig();
    this.loadStoredAuthData();
    this.loadTeamConfigFromCloud();
  }

  /**
   * Load stored authentication data from chrome.storage.local
   */
  // Phase O/N-1: No complex functionality yet
// All methods will be implemented in later phases
}

for (const methods of [
  BackgroundAuthMethods,
  BackgroundRuntimeMethods,
  BackgroundCommandMethods,
  BackgroundMessageMethods,
]) {
  for (const name of Object.getOwnPropertyNames(methods.prototype)) {
    if (name === 'constructor') continue;
    Object.defineProperty(
      BackgroundService.prototype,
      name,
      Object.getOwnPropertyDescriptor(methods.prototype, name),
    );
  }
}

export { BackgroundService };
