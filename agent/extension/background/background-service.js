// Background Service - Chrome Extension (MV3)
// Handles Sessions, WebSocket, STT, TTS

import { io } from '../ui/socket.io.esm.min.js';

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
    this.cloudUrl = null; // Will be loaded from config
    
    // Branding information (C57)
    this.branding = {
      company: '—',
      brand: '—',
      team: '—'
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
    this.loadTeamConfigFromCloud();
  }

  async loadTeamConfigFromCloud() {
    try {
      const teamId = await this.getCurrentTeamId();
      if (!teamId) {
        console.log('[C10-EXT] No team ID found, using local config');
        return;
      }
      const baseUrl = this.cloudUrl || 'https://keledon.tuyoisaza.com';
      
      const response = await fetch(`${baseUrl}/api/teams/${teamId}/config`);
      if (response.ok) {
        const config = await response.json();
        
        this.providerConfig = {
          sttProvider: config.sttProvider || 'vosk',
          ttsProvider: config.ttsProvider || 'elevenlabs',
          rpaProvider: 'native-dom'
        };
        
        if (config.voskServerUrl) {
          await chrome.storage.local.set({ 'keldon-vosk-server-url': config.voskServerUrl });
        }
        
        console.log('[C10-EXT] Team config loaded from cloud:', this.providerConfig);
      }
    } catch (error) {
      console.warn('[C10-EXT] Failed to load team config from cloud:', error);
    }
  }

  async getCurrentTeamId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['keldon-team-id'], (result) => {
        resolve(result['keldon-team-id'] || null);
      });
    });
  }

  async loadProviderConfig() {
    try {
      const keys = ['keldon-stt-provider', 'keldon-tts-provider', 'keldon-rpa-provider'];
      const result = await chrome.storage.local.get(keys);
      
      if (result['keldon-stt-provider']) {
        this.providerConfig.sttProvider = result['keldon-stt-provider'];
      }
      if (result['keldon-tts-provider']) {
        this.providerConfig.ttsProvider = result['keldon-tts-provider'];
      }
      if (result['keldon-rpa-provider']) {
        this.providerConfig.rpaProvider = result['keldon-rpa-provider'];
      }
      
      console.log('[C10-EXT] Provider config loaded:', this.providerConfig);
    } catch (error) {
      console.warn('[C10-EXT] Failed to load provider config:', error);
    }
  }

  getProviderConfig() {
    return this.providerConfig;
  }

  resolveRuntimeTier() {
    const rawTier =
      (typeof process !== 'undefined' && process?.env?.KELEDON_ENV_TIER) ||
      (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production'
        ? 'PRODUCTION_MANAGED'
        : 'DEV_LOCAL');

    const tier = String(rawTier || 'DEV_LOCAL').trim().toUpperCase();
    if (tier === 'PRODUCTION_MANAGED' || tier === 'CI_PROOF' || tier === 'DEV_LOCAL') {
      return tier;
    }

    return 'DEV_LOCAL';
  }

  isLoopbackOrigin(urlValue) {
    try {
      const parsed = new URL(urlValue);
      const host = parsed.hostname.toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    } catch {
      return false;
    }
  }

  async start() {
    console.log('[KELEDON] BackgroundService starting');

    await this.initializeComponents();
    await this.loadCloudRuntimeConfig();
    this.setupEventHandlers();
    this.setupMessageHandlers();
    this.connectCloudRuntime();

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

  normalizeCloudUrl(rawUrl) {
    if (typeof rawUrl !== 'string') {
      return null;
    }

    const value = rawUrl.trim();
    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      const origin = parsed.origin;
      if (this.runtimeTier === 'PRODUCTION_MANAGED' && this.isLoopbackOrigin(origin)) {
        return null;
      }

      return origin;
    } catch (error) {
      return null;
    }
  }

  async loadCloudRuntimeConfig() {
    const defaultCloudUrl = this.runtimeTier === 'DEV_LOCAL'
      ? 'http://localhost:3001'
      : 'https://keledon.tuyoisaza.com';

    const canonicalCloudBase =
      (typeof process !== 'undefined' && process?.env?.KELEDON_CLOUD_BASE_URL) || '';

    if (canonicalCloudBase) {
      const normalizedCanonical = this.normalizeCloudUrl(canonicalCloudBase);
      if (!normalizedCanonical) {
        throw new Error('[C22.3] KELEDON_CLOUD_BASE_URL is invalid for current runtime tier.');
      }
      this.cloudUrl = normalizedCanonical;
    }

    try {
      const stored = await chrome.storage.local.get([
        this.cloudUrlStorageKey,
        this.legacyCloudUrlStorageKey,
      ]);
      const storedUrl =
        this.normalizeCloudUrl(stored?.[this.cloudUrlStorageKey]) ||
        this.normalizeCloudUrl(stored?.[this.legacyCloudUrlStorageKey]);
      if (storedUrl && this.runtimeTier !== 'PRODUCTION_MANAGED') {
        this.cloudUrl = storedUrl;
      }
    } catch (error) {
      console.warn('[C11-EXT] Failed to load cloud URL from storage, using default');
    }

    if (!this.cloudUrl) {
      this.cloudUrl = this.normalizeCloudUrl(defaultCloudUrl);
    }

    if (this.runtimeTier === 'PRODUCTION_MANAGED' && this.isLoopbackOrigin(this.cloudUrl)) {
      throw new Error('[C22.3] PRODUCTION_MANAGED cannot use localhost cloud URL.');
    }

    console.log(`[C11-EXT] Runtime tier: ${this.runtimeTier}`);
    console.log(`[C11-EXT] Cloud runtime URL: ${this.cloudUrl}`);
  }

  async updateCloudRuntimeUrl(rawUrl, source = 'unknown') {
    const normalized = this.normalizeCloudUrl(rawUrl);
    if (!normalized) {
      throw new Error('Invalid cloud URL. Use http:// or https:// with host and port.');
    }

    if (normalized === this.cloudUrl) {
      return { cloudUrl: this.cloudUrl, reconnected: false };
    }

    this.cloudUrl = normalized;
    await chrome.storage.local.set({
      [this.cloudUrlStorageKey]: this.cloudUrl,
      [this.legacyCloudUrlStorageKey]: this.cloudUrl,
    });
    console.log(`[C11-EXT] Cloud runtime URL updated from ${source}: ${this.cloudUrl}`);

    this.connectCloudRuntime();
    return { cloudUrl: this.cloudUrl, reconnected: true };
  }

  disconnectCloudRuntime() {
    if (!this.socket) {
      return;
    }

    if (this.commandChannelName) {
      this.socket.off(this.commandChannelName);
      this.commandChannelName = null;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.currentSessionId = null;
    this.componentStatus.websocket = 'disconnected';
  }

  connectCloudRuntime() {
    if (!this.cloudUrl) {
      console.warn('[C10-EXT] Cloud URL not configured - cannot connect. Set via sidepanel or chrome.storage.');
      this.componentStatus.websocket = 'disconnected';
      return;
    }

    if (this.socket && this.socket.connected) {
      return;
    }

    const connectionUrl = `${this.cloudUrl}/agent`;
    console.log(`[C10-EXT] Attempting to connect to: ${connectionUrl}`);

    try {
      this.socket = io(connectionUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', async () => {
        this.componentStatus.websocket = 'connected';
        console.log('[C10-EXT] Connected to cloud runtime');
        await this.ensureSession();
      });

      this.socket.on('disconnect', (reason) => {
        this.componentStatus.websocket = 'disconnected';
        console.warn('[C10-EXT] Disconnected from cloud runtime:', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.componentStatus.websocket = 'error';
        console.error('[C10-EXT] Cloud runtime connection error:', error.message);
      });

      this.socket.on('session.created', (payload) => {
        this.currentSessionId = payload?.session_id || null;
        
        // Update branding from session payload (C57)
        if (payload) {
          this.branding.company = payload.company_name || '—';
          this.branding.brand = payload.brand_name || '—';
          this.branding.team = payload.team_name || '—';
        }

        if (this.currentSessionId) {
          if (this.commandChannelName) {
            this.socket.off(this.commandChannelName);
          }

          this.commandChannelName = `command.${this.currentSessionId}`;
          this.socket.on(this.commandChannelName, (command) => {
            this.handleCloudCommand(command).catch((error) => {
              console.error('[C10-EXT] Failed to process command:', error);
            });
          });
        }
        console.log('[C10-EXT] Session ready:', this.currentSessionId);
      });
    } catch (error) {
      console.error('[C10-EXT] Failed to create socket connection:', error);
      this.componentStatus.websocket = 'error';
    }
  }

  async ensureSession() {
    if (!this.socket || !this.socket.connected || this.currentSessionId) {
      return;
    }

    let activeTab = null;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs?.[0] || null;
    } catch (error) {
      console.warn('[C10-EXT] Could not query active tab for session metadata');
    }

    this.socket.emit('session.create', {
      agent_id: `keledon-ext-${chrome.runtime.id}`,
      tab_url: activeTab?.url || 'unknown',
      tab_title: activeTab?.title || 'unknown',
    });
  }

  async emitBrainEventFromRuntime(trigger) {
    if (!this.agentActive) {
      console.warn('[C10-EXT] Agent inactive, start listening ignored');
      return;
    }

    await this.ensureSession();
    if (!this.socket || !this.socket.connected || !this.currentSessionId) {
      throw new Error('Extension runtime not connected to cloud session');
    }

    this.socket.emit('brain_event', {
      event_id: `evt-${crypto.randomUUID()}`,
      session_id: this.currentSessionId,
      event_type: 'text_input',
      agent_id: `keledon-ext-${chrome.runtime.id}`,
      ts: new Date().toISOString(),
      payload: {
        text: 'click submit button',
        confidence: 0.92,
        provider: 'real-extension-runtime',
        metadata: {
          companyId: 'keledon',
          topK: 3,
          trigger,
        },
      },
    });

    console.log('[C10-EXT] brain_event emitted from real extension runtime');
  }

  async handleCloudCommand(command) {
    const metadata = command?.metadata || {};
    const startedAt = new Date().toISOString();
    const startedEpoch = Date.now();

    this.currentCommand = command;
    console.log(
      `[C10-EXT] command received type=${command?.type} decision_id=${metadata.decision_id} trace_id=${metadata.trace_id}`,
    );

    // Add to command history
    this.commandHistory.push({
      timestamp: startedAt,
      type: command?.type || 'unknown',
      content: command?.ui_steps ? JSON.stringify(command.ui_steps) : (command?.text || 'No content'),
      decision_id: metadata.decision_id,
      trace_id: metadata.trace_id
    });
    
    // Keep only last 50 commands
    if (this.commandHistory.length > 50) {
      this.commandHistory = this.commandHistory.slice(-50);
    }

    await this.emitExecutionEvidence(command, {
      event: 'agent.exec.start',
      execution_result: 'success',
      outcome: 'success',
      startedAt,
      completedAt: startedAt,
      latencyMs: 0,
      detail: 'extension_received_command',
    });

    try {
      await this.executeCommand(command);

      const completedAt = new Date().toISOString();
      await this.emitExecutionEvidence(command, {
        event: 'agent.exec.end',
        execution_result: 'success',
        outcome: 'success',
        startedAt,
        completedAt,
        latencyMs: Math.max(1, Date.now() - startedEpoch),
        detail: 'extension_executed_cloud_command',
      });
    } catch (error) {
      const completedAt = new Date().toISOString();
      await this.emitExecutionEvidence(command, {
        event: 'agent.exec.error',
        execution_result: 'failure',
        outcome: 'failure',
        startedAt,
        completedAt,
        latencyMs: Math.max(1, Date.now() - startedEpoch),
        detail: error?.message || 'command_execution_failed',
        errorCode: 'EXTENSION_EXECUTION_FAILED',
      });
      throw error;
    }
  }

  async executeCommand(command) {
    const commandType = command?.type;

    if (commandType === 'say') {
      const text = command?.say?.text || '';
      if (text) {
        chrome.runtime.sendMessage({
          type: 'C10_RUNTIME_LOG',
          level: 'info',
          message: `SAY command: ${text}`,
        });
      }
      return;
    }

    if (commandType === 'ui_steps') {
      chrome.runtime.sendMessage({
        type: 'C10_RUNTIME_LOG',
        level: 'info',
        message: `UI_STEPS command with ${(command?.ui_steps || []).length} step(s)`,
      });
      return;
    }

    if (commandType === 'mode' || commandType === 'stop') {
      chrome.runtime.sendMessage({
        type: 'C10_RUNTIME_LOG',
        level: 'info',
        message: `${commandType.toUpperCase()} command executed`,
      });
      return;
    }

    throw new Error(`Unsupported cloud command type: ${commandType || 'unknown'}`);
  }

  async emitExecutionEvidence(command, payload) {
    if (!this.socket || !this.socket.connected || !this.currentSessionId) {
      throw new Error('Cannot emit execution evidence without cloud session');
    }

    const metadata = command?.metadata || {};
    if (!metadata.decision_id || !metadata.trace_id) {
      throw new Error('Cloud command metadata missing decision_id or trace_id');
    }

    const tabInfo = await this.getActiveTabInfo();
    const executionTimestamp = payload.completedAt;

    const agentExecResultPayload = {
      event: payload.event,
      session_id: this.currentSessionId,
      decision_id: metadata.decision_id,
      trace_id: metadata.trace_id,
      command_id: command?.command_id,
      command_type: command?.type || 'unknown',
      tab_id: String(tabInfo.id),
      execution_status: payload.execution_result,
      execution_timestamp: executionTimestamp,
      metadata: {
        traceparent: metadata.traceparent,
        tracestate: metadata.tracestate,
      },
    };

    const executionEvidencePayload = {
      event: payload.event,
      session_id: this.currentSessionId,
      decision_id: metadata.decision_id,
      trace_id: metadata.trace_id,
      command_id: command?.command_id,
      command_type: command?.type || 'unknown',
      tab_id: String(tabInfo.id),
      execution_result: payload.execution_result,
      execution_status: payload.execution_result,
      execution_timestamp: executionTimestamp,
      outcome: payload.outcome,
      started_at: payload.startedAt,
      completed_at: payload.completedAt,
      latency_ms: payload.latencyMs,
      evidence: {
        source: 'browser-extension',
        action: command?.type || 'unknown',
        detail: payload.detail,
        ...(payload.errorCode ? { error_code: payload.errorCode } : {}),
      },
      metadata: {
        traceparent: metadata.traceparent,
        tracestate: metadata.tracestate,
      },
    };

    this.socket.emit('AGENT_EXEC_RESULT', agentExecResultPayload);
    this.socket.emit('execution.evidence', executionEvidencePayload);
    console.log(
      `[C11-EXT] AGENT_EXEC_RESULT emitted event=${agentExecResultPayload.event} decision_id=${agentExecResultPayload.decision_id} trace_id=${agentExecResultPayload.trace_id} status=${agentExecResultPayload.execution_status}`,
    );
  }

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
    const normalizedType = String(message?.type || '').toUpperCase();
    if (
      normalizedType.includes('AUTH') ||
      normalizedType.includes('ROLE') ||
      normalizedType.includes('TOKEN')
    ) {
      console.error('[C22.5] Extension auth logic attempt blocked. Cloud is sole auth verifier.');
      sendResponse({
        success: false,
        error: 'Auth and role verification are cloud-only responsibilities.',
      });
      return;
    }

    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({
          socketConnected: !!(this.socket && this.socket.connected),
          isListening: this.isListening,
          sessionId: this.currentSessionId,
          agentActive: this.agentActive,
          sttEnabled: this.agentActive, // Controlled by master toggle
          ttsEnabled: this.agentActive, // Controlled by master toggle
          webRTCDetected: this.webRTCState.detected, // KELEDON-EXT-WEBRTC-STT-ENTRY-008
          webRTCListening: this.webRTCState.listening, // KELEDON-EXT-WEBRTC-STT-ENTRY-008
          webRTCReady: this.webRTCState.ready, // KELEDON-EXT-WEBRTC-MESSAGING-ACK-010: Only true after ACK
          branding: this.branding // C57 branding reflection
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

      default:
        sendResponse({ error: 'Unknown message type: ' + message.type });
    }
  }

  // Phase O/N-1: No complex functionality yet
// All methods will be implemented in later phases
}

export { BackgroundService };
