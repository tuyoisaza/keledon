export class BackgroundMessageMethods {
  async getActiveTabInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs?.[0];
      return {
        id: tab?.id ?? 'unknown',
        url: tab?.url ?? 'unknown',
        title: tab?.title ?? 'unknown',
      };
    } catch (error) {
      return { id: 'unknown', url: 'unknown', title: 'unknown' };
    }
  }

  setupMessageHandlers() {
    // KELEDON-EXT-WEBRTC-MESSAGING-ACK-010: Handle port connections
    chrome.runtime.onConnect.addListener((port) => {
      console.log('[KELEDON] Content script connected:', port.name);
      
      this.contentPorts.set(port.name, port);
      
      port.onMessage.addListener((message) => {
        this.handlePortMessage(message, port);
      });
      
      port.onDisconnect.addListener(() => {
        console.log('[KELEDON] Content script disconnected:', port.name);
        this.contentPorts.delete(port.name);
      });
    });
    
    // Legacy message handler for non-port messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });
  }

  handlePortMessage(message, port) {
    console.log('[KELEDON] Port message received:', message);
    
    switch (message.type) {
        case 'WEBRTC_DETECTED':
            this.handleWebRTCDetected(message, port);
            break;
            
        case 'WEBRTC_AUDIO_ACTIVE':
            this.handleWebRTCAudioActive(message, port);
            break;
            
        default:
            console.log('[KELEDON] Unknown port message type:', message.type);
    }
  }

  handleWebRTCDetected(message, port) {
    console.log('[KELEDON] WebRTC detected:', message);
    
    this.webRTCState.detected = true;
    this.webRTCState.platform = message.platform;
    this.webRTCState.url = message.url;
    
    // Send ACK
    port.postMessage({
        type: 'ACK_WEBRTC_DETECTED',
        nonce: message.nonce,
        success: true,
        webRTCState: this.webRTCState
    });
  }
  
  handleWebRTCAudioActive(message, port) {
    console.log('[KELEDON] WebRTC audio active:', message);
    
    this.webRTCState.detected = true;
    this.webRTCState.audioActive = true;
    this.webRTCState.elementId = message.elementId;
    this.webRTCState.trackCount = message.trackCount;
    this.webRTCState.platform = message.platform;
    this.webRTCState.ready = true; // KELEDON-EXT-WEBRTC-MESSAGING-ACK-010: Mark as ready after ACK
    
    // Update component status
    this.componentStatus.webrtc = 'ready';
    
    // Send ACK with nonce echo
    port.postMessage({
        type: 'ACK_WEBRTC_AUDIO_ACTIVE',
        nonce: message.nonce,
        success: true,
        webRTCState: this.webRTCState
    });
  }

  async handleMessage(message, sendResponse) {
    // Handle AUTH_DATA_RECEIVED first (from auth-bridge content script)
    if (message.type === 'AUTH_DATA_RECEIVED') {
      const result = await this.handleAuthDataReceived(message.payload);
      sendResponse(result);
      return;
    }

    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({
          socketConnected: !!(this.socket && this.socket.connected),
          isListening: this.isListening,
          sessionId: this.currentSessionId,
          agentActive: this.agentActive,
          sttEnabled: this.agentActive,
          ttsEnabled: this.agentActive,
          webRTCDetected: this.webRTCState.detected,
          webRTCListening: this.webRTCState.listening,
          webRTCReady: this.webRTCState.ready,
          branding: this.branding,
          userAuth: this.userAuth,
          cloudUrl: this.cloudUrl
        });
        break;

      case 'PING':
        // Phase O/N-1: Basic connectivity test
        sendResponse({ type: 'PONG', timestamp: Date.now() });
        break;

      case 'GET_HISTORY':
        // Return command history
        const history = this.commandHistory || [];
        sendResponse({ history: history.slice(-50) }); // Last 50 commands
        break;

      case 'GET_PROVIDER_CONFIG':
        // Return provider config from Supabase/localStorage
        sendResponse({ providerConfig: this.getProviderConfig() });
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

      case 'C10_START_LISTENING':
        try {
          await this.emitBrainEventFromRuntime('start_listening_button');
          sendResponse({ success: true, sessionId: this.currentSessionId });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;

      case 'C10_GET_RUNTIME_STATUS':
        sendResponse({
          connected: !!(this.socket && this.socket.connected),
          session_id: this.currentSessionId,
          last_command_id: this.currentCommand?.command_id || null,
          last_command_type: this.currentCommand?.type || null,
          cloud_url: this.cloudUrl,
        });
        break;

      case 'C10_SET_CLOUD_URL':
        try {
          const result = await this.updateCloudRuntimeUrl(message.url, 'sidepanel');
          sendResponse({ success: true, ...result });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;

      // KELEDON-EXT-WEBRTC-STT-ENTRY-008: WebRTC state updates
      case 'WEBRTC_STATE_UPDATE':
        if (message.webRTCState) {
          this.webRTCState = { ...this.webRTCState, ...message.webRTCState };
          console.log('[KELEDON] WebRTC state updated:', this.webRTCState);
          this.componentStatus.webrtc = this.webRTCState.listening ? 'active' : 
                                        this.webRTCState.detected ? 'ready' : 'not_detected';
        }
        sendResponse({ success: true, webRTCState: this.webRTCState });
        break;

      case 'LOG_TO_SIDEPANEL':
        // Forward log messages to sidepanel if needed
        console.log('[KELEDON] Log from content script:', message);
        sendResponse({ success: true });
        break;

      case 'GET_AUTH_STATUS':
        // Return authentication status
        sendResponse({
          isAuthenticated: this.userAuth.isAuthenticated,
          userAuth: this.userAuth,
          branding: this.branding
        });
        break;

      case 'REQUEST_AUTH_SYNC':
        // Request auth sync from landing page
        const syncResult = await this.requestAuthSync();
        sendResponse(syncResult);
        break;

      case 'CLEAR_AUTH':
        // Clear auth data (logout)
        const clearResult = await this.clearAuthData();
        sendResponse(clearResult);
        break;

      case 'CONNECT_TO_KEELEDON':
        // Trigger connection to Keledon landing page
        if (!this.userAuth.isAuthenticated) {
          // Open keledon landing page
          try {
            await chrome.tabs.create({ url: 'https://keledon.tuyoisaza.com' });
            sendResponse({ success: true, message: 'Please login to Keledon, then click "Connect to Keledon" again' });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          // Already authenticated, just sync
          await this.loadStoredAuthData();
          await this.loadTeamConfigFromCloud();
          sendResponse({ success: true, message: 'Already connected', userAuth: this.userAuth });
        }
        break;

      default:
        sendResponse({ error: 'Unknown message type: ' + message.type });
    }
  }

}
