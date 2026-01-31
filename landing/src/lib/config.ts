/**
 * Centralized configuration for API endpoints
 * Uses environment variables for different environments
 */

// Get API URL from environment variable
// For single-container deployment: use empty string or '/' for relative URLs
// For separate services: use full URL like 'https://api.example.com'
const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    
    // If empty or '/', use relative URLs (same origin - single container)
    if (!envUrl || envUrl === '/') {
        return '';
    }
    
    // If set to a full URL, use it (separate services)
    return envUrl;
};

export const API_URL = getApiUrl();

// Get WebSocket URL from environment variable, fallback based on API_URL
const getWebSocketUrl = () => {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    if (wsUrl) return wsUrl;
    
    // If API_URL is empty, use relative WebSocket (same origin)
    if (!API_URL || API_URL === '') {
        // Use current origin with ws/wss protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}`;
    }
    
    // If API_URL is set, convert http/https to ws/wss
    if (API_URL.startsWith('https://')) {
        return API_URL.replace('https://', 'wss://');
    } else if (API_URL.startsWith('http://')) {
        return API_URL.replace('http://', 'ws://');
    }
    
    // Fallback to localhost for development
    return import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
};

export const WEBSOCKET_URL = getWebSocketUrl();

// Launcher service URL (for local development only)
export const LAUNCHER_URL = import.meta.env.VITE_LAUNCHER_URL || 'http://localhost:3100';

// Helper to check if we're in production
export const IS_PRODUCTION = import.meta.env.PROD || import.meta.env.VITE_NODE_ENV === 'production';

// Log configuration in development (helps with debugging)
if (!IS_PRODUCTION) {
    console.log('🔧 API Configuration:', {
        API_URL,
        WEBSOCKET_URL,
        LAUNCHER_URL,
        IS_PRODUCTION
    });
}
