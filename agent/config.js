// KELEDON Agent Configuration - Phase 1 Backend Testing
// This provides the configuration for the test harness

(function() {
    'use strict';
    
    // Get environment - check for development vs production
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         !window.location.hostname.includes('keledon');
    
    const getBackendUrl = () => {
        if (isDevelopment) {
            return 'http://localhost:3001';
        }
        // Production: use current origin
        return window.location.origin.replace('http:', 'https:');
    };
    
    const getWsUrl = () => {
        if (isDevelopment) {
            return 'ws://localhost:3011';
        }
        // Production: use wss with current origin
        return window.location.origin.replace('http:', 'ws:').replace('https:', 'wss:');
    };
    
    // Phase 1 Configuration for Backend Testing
    const KELEDON_CONFIG = {
        // Backend URLs - dynamically resolved
        BACKEND_URL: getBackendUrl(),
        WS_URL: getWsUrl(),
        
        // RAG Endpoints
        RAG_RETRIEVE_ENDPOINT: '/rag/retrieve',
        RAG_EVALUATE_ENDPOINT: '/rag/evaluate',
        
        // WebSocket
        LISTEN_WS_ENDPOINT: '/listen/ws',
        
        // Additional services (will be implemented in later phases)
        TTS_ENDPOINT: '/tts/qwen3-tts',
        STT_ENDPOINT: '/stt/whisper',
        RPA_ENDPOINT: '/rpa/playwright',
        
        // Debug settings
        DEBUG: true,
        LOG_LEVEL: 'info'
    };
    
    // Make configuration globally available
    if (typeof window !== 'undefined') {
        window.KELEDON_CONFIG = KELEDON_CONFIG;
        window.AGENT_CONFIG = KELEDON_CONFIG; // For compatibility
        console.log('[KELEDON CONFIG] Phase 1 configuration loaded:', KELEDON_CONFIG);
    }
    
    // Also export for Node.js context
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { KELEDON_CONFIG };
    }
})();
