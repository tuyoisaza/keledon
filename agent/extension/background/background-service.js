// Background Service - Minimal ES Module for Chrome Extension
// Simplified to avoid legacy background import issues

class BackgroundService {
    constructor() {
        this.socket = null;
        this.connectionState = 'disconnected';
        this.messageHandlers = new Map();
        this.isListening = false;
        this.currentSessionId = null;
        this.currentTabTitle = null;
    }

    start() {
        console.log('BackgroundService started - minimal implementation');
        this.setupMessageHandlers();
        console.log('BackgroundService ready');
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
                sendResponse({ 
                    status: 'ready',
                    listening: this.isListening,
                    sessionId: this.currentSessionId,
                    tabTitle: this.currentTabTitle
                });
                break;
                
            case 'START_LISTENING':
                this.startListening();
                sendResponse({ success: true, sessionId: this.currentSessionId });
                break;
                
            case 'STOP_LISTENING':
                this.stopListening();
                sendResponse({ success: true });
                break;
                
            default:
                console.log('Unhandled message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
    }

    startListening() {
        this.isListening = true;
        this.currentSessionId = 'session_' + Date.now();
        this.currentTabTitle = 'KELEDON Session';
        
        console.log('Started listening session:', this.currentSessionId);
    }

    stopListening() {
        this.isListening = false;
        this.currentSessionId = null;
        this.currentTabTitle = null;
        
        console.log('Stopped listening session');
    }
}

export { BackgroundService };