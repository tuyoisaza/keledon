/**
 * Agent Configuration
 * 
 * For production deployment, update BACKEND_URL to your deployed backend URL.
 * This can be set via environment variable during build, or manually updated here.
 * 
 * The backend URL should be:
 * - For HTTPS: https://your-domain.com or https://your-service.run.app
 * - For WebSocket: wss://your-domain.com or wss://your-service.run.app
 */

// Get backend URL from environment or use default
// In production, this should be set to your deployed backend URL
const BACKEND_URL = (() => {
    // Check if we're in a build environment with env var
    if (typeof process !== 'undefined' && process.env && process.env.BACKEND_URL) {
        return process.env.BACKEND_URL;
    }
    
    // Default to localhost for development
    // UPDATE THIS for production deployment
    return 'http://localhost:3001';
})();

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BACKEND_URL };
} else {
    // For browser/extension context
    window.AGENT_CONFIG = { BACKEND_URL };
}
