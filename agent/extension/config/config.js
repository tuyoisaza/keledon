/**
 * Environment Configuration Loader for KELEDON Agent
 * 
 * Loads configuration from environment variables with fallbacks to defaults
 * Supports both Node.js (background scripts) and browser contexts
 */

// Default configuration values
const DEFAULT_CONFIG = {
    BACKEND_URL: 'http://localhost:3001',
    WS_URL: 'ws://localhost:3011',
    RAG_RETRIEVE_ENDPOINT: '/rag/retrieve',
    RAG_EVALUATE_ENDPOINT: '/rag/evaluate',
    LISTENING_SESSIONS_ENDPOINT: '/listening-sessions',
    INTERFACES_ENDPOINT: '/api/interfaces',
    LISTEN_WS_ENDPOINT: '/listen/ws',
    DEBUG: false,
    LOG_LEVEL: 'info'
};

function resolveRuntimeTier(envProvider = {}) {
    const rawTier = String(envProvider.KELEDON_ENV_TIER || '').trim().toUpperCase();
    if (rawTier === 'DEV_LOCAL' || rawTier === 'CI_PROOF' || rawTier === 'PRODUCTION_MANAGED') {
        return rawTier;
    }
    return envProvider.NODE_ENV === 'production' ? 'PRODUCTION_MANAGED' : 'DEV_LOCAL';
}

function isLoopbackUrl(urlValue) {
    try {
        const parsed = new URL(urlValue);
        const host = parsed.hostname.toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    } catch {
        return false;
    }
}

function toWsUrl(httpUrl) {
    return String(httpUrl)
        .replace(/^https:\/\//i, 'wss://')
        .replace(/^http:\/\//i, 'ws://');
}

// Load environment-specific configuration
function loadConfig() {
    const config = { ...DEFAULT_CONFIG };
    const processEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};
    const windowEnv = (typeof window !== 'undefined' && window.ENV) ? window.ENV : {};
    const runtimeTier = resolveRuntimeTier({ ...processEnv, ...windowEnv });
    const isManagedTier = runtimeTier === 'PRODUCTION_MANAGED';
    
    // Try to load from process environment (Node.js context)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.KELEDON_CLOUD_BASE_URL) {
            config.BACKEND_URL = process.env.KELEDON_CLOUD_BASE_URL;
            config.WS_URL = toWsUrl(process.env.KELEDON_CLOUD_BASE_URL);
        }

        Object.keys(DEFAULT_CONFIG).forEach(key => {
            if (isManagedTier && (key === 'BACKEND_URL' || key === 'WS_URL')) {
                return;
            }
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
            config.WS_URL = toWsUrl(window.ENV.KELEDON_CLOUD_BASE_URL);
        }

        Object.keys(DEFAULT_CONFIG).forEach(key => {
            if (isManagedTier && (key === 'BACKEND_URL' || key === 'WS_URL')) {
                return;
            }
            if (window.ENV[key] !== undefined) {
                if (key === 'DEBUG') {
                    config[key] = window.ENV[key] === 'true';
                } else {
                    config[key] = window.ENV[key];
                }
            }
        });
    }

    if (isManagedTier && isLoopbackUrl(config.BACKEND_URL)) {
        throw new Error('PRODUCTION_MANAGED cannot use localhost backend URL in extension runtime.');
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
