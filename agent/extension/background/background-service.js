// Background Service - Chrome Extension with STT Integration
// Integrates Session Management, WebSocket Client, and STT Manager

import { SessionManager } from '../core/session-manager.js';
import { WebSocketClient } from '../core/websocket-client.js';
import { STTManager } from '../core/stt-manager.js';
import { TTSManager } from '../core/tts-manager.js';

class BackgroundService {
    constructor() {
        // Core components
        this.sessionManager = new SessionManager();
        this.webSocketClient = new WebSocketClient(this.sessionManager);
        this.sttManager = new STTManager(this.sessionManager, this.webSocketClient);
        this.ttsManager = new TTSManager(this.sessionManager, this.webSocketClient);
        
        // State tracking
        this.connectionState = 'disconnected';
        this.isListening = false;
        this.isSTTActive = false;
        this.isTTSActive = false;
        this.currentSessionId = null;
        this.currentTabTitle = null;
        
        // Component states for Side Panel
        this.componentStatus = {
            websocket: 'disconnected',
            stt: 'ready',
            tts: 'ready',
            session: null
        };
    }

    async start() {
        console.log('BackgroundService started - with STT integration');
        
        try {
            // Initialize components
            await this.initializeComponents();
            
            // Setup message handlers
            this.setupMessageHandlers();
            this.setupEventHandlers();
            
            console.log('BackgroundService ready with STT integration');
        } catch (error) {
            console.error('Failed to start BackgroundService:', error);
        }
    }

    async initializeComponents() {
        try {
            // Initialize STT manager (requires API key)
            await this.sttManager.initialize();
            console.log('STT Manager initialized');
        } catch (error) {
            console.warn('STT Manager initialization failed:', error.message);
            this.componentStatus.stt = 'error';
        }

        try {
            // Initialize TTS manager (requires API key)
            await this.ttsManager.initialize();
            console.log('TTS Manager initialized');
        } catch (error) {
            console.warn('TTS Manager initialization failed:', error.message);
            this.componentStatus.tts = 'error';
        }
    }

    setupEventHandlers() {
        // Handle WebSocket events
        this.webSocketClient.on('connection:established', () => {
            this.componentStatus.websocket = 'connected';
            console.log('WebSocket connected');
        });

        this.webSocketClient.on('connection:closed', () => {
            this.componentStatus.websocket = 'disconnected';
            console.log('WebSocket disconnected');
        });

        // Handle TTS events from WebSocket
        this.webSocketClient.on('tts:speak', (payload) => {
            this.handleTTSCommand(payload);
        });

        // Handle STT events
        this.sttManager.on('stt:listening', () => {
            this.componentStatus.stt = 'listening';
            this.isSTTActive = true;
            console.log('STT listening started');
        });

        this.sttManager.on('stt:stopped', () => {
            this.componentStatus.stt = 'ready';
            this.isSTTActive = false;
            console.log('STT listening stopped');
        });

        this.sttManager.on('stt:text_input_sent', (data) => {
            console.log('text_input event sent:', data.text);
        });

        this.sttManager.on('stt:error', (error) => {
            this.componentStatus.stt = 'error';
            this.stats.errors++;
            this.emit('stt:error', error);
        });

        // Handle TTS events
        this.ttsManager.on('tts:utterance_started', (data) => {
            this.componentStatus.tts = 'speaking';
            this.isTTSActive = true;
            console.log('TTS speech started:', data.text.substring(0, 50));
        });

        this.ttsManager.on('tts:utterance_completed', (data) => {
            this.componentStatus.tts = 'ready';
            this.isTTSActive = false;
            console.log('TTS speech completed');
        });

        this.ttsManager.on('tts:speech_stopped', (data) => {
            this.componentStatus.tts = 'ready';
            this.isTTSActive = false;
            console.log('TTS speech stopped:', data.reason);
        });

        this.ttsManager.on('tts:error', (error) => {
            this.componentStatus.tts = 'error';
            console.error('TTS error:', error.message);
        });
    }

        // Handle TTS events
        this.ttsManager.on('tts:utterance_started', (data) => {
            this.componentStatus.tts = 'speaking';
            this.isTTSActive = true;
            console.log('TTS speech started:', data.text.substring(0, 50));
        });

        this.ttsManager.on('tts:utterance_completed', (data) => {
            this.componentStatus.tts = 'ready';
            this.isTTSActive = false;
            console.log('TTS speech completed');
        });

        this.ttsManager.on('tts:speech_stopped', (data) => {
            this.componentStatus.tts = 'ready';
            this.isTTSActive = false;
            console.log('TTS speech stopped:', data.reason);
        });

        this.ttsManager.on('tts:error', (error) => {
            this.componentStatus.tts = 'error';
            console.error('TTS error:', error.message);
        });
    }

    setupMessageHandlers() {
        // Setup message handlers for Chrome extension
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
        
        console.log('Message handlers setup complete');
    }

    handleMessage(message, sender, sendResponse) {
        console.log('Received message:', message.type);
        
        switch (message.type) {
            case 'GET_STATUS':
                sendResponse(this.getStatus());
                break;
                
            case 'START_LISTENING':
                this.startListening().then(result => sendResponse(result))
                              .catch(error => sendResponse({ error: error.message }));
                break;
                
            case 'STOP_LISTENING':
                this.stopListening().then(result => sendResponse(result))
                             .catch(error => sendResponse({ error: error.message }));
                break;

            case 'CONNECT_WEBSOCKET':
                this.connectWebSocket(message.url).then(result => sendResponse(result))
                                         .catch(error => sendResponse({ error: error.message }));
                break;

            case 'DISCONNECT_WEBSOCKET':
                this.disconnectWebSocket().then(result => sendResponse(result))
                                            .catch(error => sendResponse({ error: error.message }));
                break;

            case 'GET_COMPONENT_STATUS':
                sendResponse({ 
                    components: this.componentStatus,
                    session: this.sessionManager.getCurrentSession()
                });
                break;
                
            case 'TTS_SPEAK':
                this.handleTTSCommand(message.payload).then(result => sendResponse(result))
                                  .catch(error => sendResponse({ error: error.message }));
                break;
                
            default:
                console.log('Unhandled message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
    }

    async startListening() {
        try {
            if (this.isListening) {
                return { success: false, error: 'Already listening' };
            }

            // Create real session (anti-demo compliance)
            const session = await this.sessionManager.createSession();
            this.currentSessionId = session.id;
            this.currentTabTitle = `KELEDON Session ${session.id.slice(0, 8)}`;
            
            // Start STT processing
            await this.sttManager.start();
            
            this.isListening = true;
            
            console.log('Started real listening session:', this.currentSessionId);
            return { 
                success: true, 
                sessionId: this.currentSessionId,
                sttStatus: this.sttManager.getStatus()
            };
            
        } catch (error) {
            console.error('Failed to start listening:', error);
            return { success: false, error: error.message };
        }
    }

    async stopListening() {
        try {
            if (!this.isListening) {
                return { success: false, error: 'Not currently listening' };
            }

            // Stop STT processing
            await this.sttManager.stop();
            
            // Close session
            if (this.currentSessionId) {
                await this.sessionManager.closeSession(this.currentSessionId);
            }
            
            this.isListening = false;
            this.currentSessionId = null;
            this.currentTabTitle = null;
            
            console.log('Stopped listening session');
            return { success: true };
            
        } catch (error) {
            console.error('Failed to stop listening:', error);
            return { success: false, error: error.message };
        }
    }

    async connectWebSocket(url) {
        try {
            await this.webSocketClient.connect(url);
            return { success: true, state: this.webSocketClient.getConnectionState() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async disconnectWebSocket() {
        try {
            this.webSocketClient.disconnect();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getStatus() {
        return {
            status: this.componentStatus.websocket === 'connected' ? 'ready' : 'disconnected',
            listening: this.isListening,
            sessionId: this.currentSessionId,
            tabTitle: this.currentTabTitle,
            sttActive: this.isSTTActive,
            components: this.componentStatus,
            session: this.sessionManager.getCurrentSession(),
            sttStats: this.sttManager.getStatus()
        };
    }
}

export { BackgroundService };