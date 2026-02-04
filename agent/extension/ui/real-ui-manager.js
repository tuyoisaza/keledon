/**
 * Real UI Integration for Side Panel
 * Replaces mock displays with real agent state monitoring
 */

// Real-time UI Manager - connects to RealAgentStateMonitor
class RealUIManager {
    constructor() {
        this.agentStateMonitor = window.agentStateMonitor;
        if (!this.agentStateMonitor) {
            console.error('[RealUIManager] RealAgentStateMonitor not available');
            return;
        }
        
        this.setupRealTimeUpdates();
        console.log('[RealUIManager] Initialized with real agent state monitoring');
    }

    setupRealTimeUpdates() {
        // Subscribe to real agent state updates
        this.agentStateMonitor.addListener((state) => {
            this.updateConnectionDisplay(state.connection);
            this.updateComponentDisplay(state.components);
            this.updateListeningDisplay(state.listening);
            this.updatePerformanceDisplay(state.performance);
        });
        
        // Initial update
        const initialState = this.agentStateMonitor.getState();
        this.updateConnectionDisplay(initialState.connection);
        this.updateComponentDisplay(initialState.components);
        this.updateListeningDisplay(initialState.listening);
        this.updatePerformanceDisplay(initialState.performance);
    }

    updateConnectionDisplay(connectionState) {
        const statusDot = document.getElementById('connectionDot');
        const statusText = document.getElementById('connectionStatus');
        
        if (statusDot && statusText) {
            // Remove all status classes
            statusDot.className = 'status-dot';
            
            switch (connectionState.status) {
                case 'connected':
                    statusDot.classList.add('connected');
                    statusText.textContent = 'Connected to Cloud';
                    break;
                case 'connecting':
                    statusDot.classList.add('connecting');
                    statusText.textContent = 'Creating session...';
                    break;
                case 'error':
                    statusDot.classList.add('error');
                    statusText.textContent = `Error: ${connectionState.error || 'Connection failed'}`;
                    break;
                case 'disconnected':
                    statusDot.classList.add('disconnected');
                    statusText.textContent = 'Disconnected';
                    break;
                default:
                    statusText.textContent = connectionState.status || 'Unknown';
            }
            
            // Show session info if available (real session, not fake)
            if (connectionState.sessionId) {
                const sessionPreview = `Session ${connectionState.sessionId.substring(0, 8)}...`;
                this.updateSessionInfo(sessionPreview);
            } else if (connectionState.status === 'connected') {
                this.updateSessionInfo('Connected');
            } else {
                this.updateSessionInfo('No session');
            }
        }
    }

    updateComponentDisplay(components) {
        // WebSocket status
        this.updateComponentDot('websocketStatus', components.websocket);
        
        // STT status
        this.updateComponentDot('sttStatus', components.stt);
        
        // TTS status
        this.updateComponentDot('ttsStatus', components.tts);
        
        // Session status
        this.updateSessionStatus(components.session);
    }

    updateComponentDot(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = 'status-dot';
            
            switch (status) {
                case 'connected':
                case 'ready':
                    element.classList.add('ready');
                    break;
                case 'processing':
                case 'listening':
                case 'speaking':
                    element.classList.add('processing');
                    break;
                case 'error':
                    element.classList.add('error');
                    break;
                default:
                    element.classList.add('disconnected');
            }
        }
    }

    updateSessionStatus(session) {
        const sessionElement = document.getElementById('sessionStatus');
        if (sessionElement) {
            if (session && session.id) {
                sessionElement.textContent = `Active: ${session.id.substring(0, 8)}...`;
            } else {
                sessionElement.textContent = 'No active session';
            }
        }
    }

    updateListeningDisplay(listeningState) {
        const listeningIndicator = document.getElementById('listeningIndicator');
        const sessionInfo = document.getElementById('currentSessionInfo');
        
        if (listeningIndicator && sessionInfo) {
            if (listeningState.active && listeningState.sessionId) {
                listeningIndicator.textContent = '🎤 Listening...';
                listeningIndicator.style.color = 'var(--success)';
                
                if (listeningState.tabTitle) {
                    sessionInfo.textContent = listeningState.tabTitle;
                }
                
                if (listeningState.startTime) {
                    const duration = Date.now() - new Date(listeningState.startTime).getTime();
                    const seconds = Math.floor(duration / 1000);
                    sessionInfo.textContent += ` (${seconds}s)`;
                }
            } else {
                listeningIndicator.textContent = '🎤 Not Listening';
                listeningIndicator.style.color = 'var(--muted)';
                
                if (sessionInfo && !listeningState.active) {
                    sessionInfo.textContent = 'No active session';
                }
            }
        }
    }

    updatePerformanceDisplay(performance) {
        // Update performance metrics display if elements exist
        const eventsElement = document.getElementById('eventsProcessed');
        const commandsElement = document.getElementById('commandsReceived');
        
        if (eventsElement) {
            eventsElement.textContent = performance.eventsProcessed || 0;
        }
        
        if (commandsElement) {
            commandsElement.textContent = performance.commandsReceived || 0;
        }
    }

    updateSessionInfo(info) {
        const sessionInfoElement = document.getElementById('currentSessionInfo');
        if (sessionInfoElement) {
            sessionInfoElement.textContent = info;
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    // Get evidence of real-time monitoring
    getMonitoringEvidence() {
        if (!this.agentStateMonitor) {
            return { error: 'RealAgentStateMonitor not available' };
        }
        
        return this.agentStateMonitor.getEvidence();
    }
}

// Initialize real UI manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.RealAgentStateMonitor !== 'undefined') {
        window.realUIManager = new RealUIManager();
        console.log('[RealUIManager] Real-time UI integration initialized');
        
        // Replace any existing mock UI with real monitoring
        if (typeof window.uiManager !== 'undefined') {
            console.log('[RealUIManager] Replacing mock UI manager with real monitoring');
            window.uiManager = window.realUIManager;
        }
    } else {
        console.error('[RealUIManager] RealAgentStateMonitor not loaded. Side panel will not have real-time updates.');
    }
});

// Export for global access
if (typeof window !== 'undefined') {
    window.RealUIManager = RealUIManager;
}