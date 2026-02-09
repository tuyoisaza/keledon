/**
 * Environment Configuration Loader for KELEDON Agent
 * 
 * Loads configuration from environment variables with fallbacks to defaults
 * Supports both Node.js (background scripts) and browser contexts
 */

// Default configuration values
const DEFAULT_CONFIG = {
    BACKEND_URL: 'https://cloud.keledon.invalid',
    WS_URL: 'wss://cloud.keledon.invalid',
    RAG_RETRIEVE_ENDPOINT: '/rag/retrieve',
    RAG_EVALUATE_ENDPOINT: '/rag/evaluate',
    LISTENING_SESSIONS_ENDPOINT: '/listening-sessions',
    INTERFACES_ENDPOINT: '/api/interfaces',
    LISTEN_WS_ENDPOINT: '/listen/ws',
    DEBUG: false,
    LOG_LEVEL: 'info'
};

// Load environment-specific configuration
function loadConfig() {
    const config = { ...DEFAULT_CONFIG };
    
    // Try to load from process environment (Node.js context)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.KELEDON_CLOUD_BASE_URL) {
            config.BACKEND_URL = process.env.KELEDON_CLOUD_BASE_URL;
        }

        Object.keys(DEFAULT_CONFIG).forEach(key => {
            if (process.env[key]) {
                // Convert string environment values to appropriate types
                if (key === 'DEBUG') {
                    config[key] = process.env[key] === 'true';
                } else {
                    config[key] = process.env[key];
                }
            }
        });
    }
    
    // Try to load from window.ENV (browser context - set by build process)
    if (typeof window !== 'undefined' && window.ENV) {
        if (window.ENV.KELEDON_CLOUD_BASE_URL !== undefined) {
            config.BACKEND_URL = window.ENV.KELEDON_CLOUD_BASE_URL;
        }

        Object.keys(DEFAULT_CONFIG).forEach(key => {
            if (window.ENV[key] !== undefined) {
                if (key === 'DEBUG') {
                    config[key] = window.ENV[key] === 'true';
                } else {
                    config[key] = window.ENV[key];
                }
            }
        });
    }
    
    return config;
}

// Load the configuration
const CONFIG = loadConfig();

// Export for different contexts
if (typeof module !== 'undefined' && module.exports) {
    // Node.js/Background script context
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    // Browser/Extension context
    window.AGENT_CONFIG = CONFIG;
}

// Export as ES6 module for modern builds
if (typeof window !== 'undefined') {
    window.KELEDON_CONFIG = CONFIG;
}
