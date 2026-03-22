/**
 * Auth Bridge - Content Script
 * 
 * This script runs on keledon.tuyoisaza.com and bridges authentication
 * data to the Chrome extension background service.
 * 
 * It reads the auth token from sessionStorage, fetches user info from
 * the backend, and sends it to the extension for automatic configuration.
 */

(function() {
    'use strict';

    const KEELEDON_API = 'https://keledon.tuyoisaza.com';
    const AUTH_KEY = 'auth_token';

    console.log('[Keledon Auth Bridge] Initializing...');

    /**
     * Get auth token from sessionStorage
     */
    function getAuthToken() {
        try {
            return sessionStorage.getItem(AUTH_KEY);
        } catch (e) {
            console.error('[Keledon Auth Bridge] Cannot access sessionStorage:', e);
            return null;
        }
    }

    /**
     * Fetch user info from the backend
     */
    async function fetchUserInfo(token) {
        try {
            const response = await fetch(`${KEELEDON_API}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[Keledon Auth Bridge] Auth check failed:', response.status);
                return null;
            }

            const data = await response.json();
            
            if (data.success && data.user) {
                return {
                    userId: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    teamId: data.user.team_id,
                    companyId: data.user.company_id,
                    teamName: data.user.team_name,
                    companyName: data.user.company_name,
                    brandName: data.user.brand_name
                };
            }

            console.warn('[Keledon Auth Bridge] No user data in response');
            return null;
        } catch (e) {
            console.error('[Keledon Auth Bridge] Failed to fetch user info:', e);
            return null;
        }
    }

    /**
     * Send auth data to the background service
     */
    function sendToBackground(userInfo) {
        try {
            chrome.runtime.sendMessage({
                type: 'AUTH_DATA_RECEIVED',
                payload: userInfo
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Keledon Auth Bridge] Failed to send to background:', chrome.runtime.lastError.message);
                } else {
                    console.log('[Keledon Auth Bridge] Auth data sent to background service');
                }
            });
        } catch (e) {
            console.error('[Keledon Auth Bridge] Error sending to background:', e);
        }
    }

    /**
     * Main initialization - try to get auth data and send to background
     */
    async function initialize() {
        const token = getAuthToken();
        
        if (!token) {
            console.log('[Keledon Auth Bridge] No auth token found in sessionStorage');
            return;
        }

        console.log('[Keledon Auth Bridge] Auth token found, fetching user info...');
        
        const userInfo = await fetchUserInfo(token);
        
        if (userInfo) {
            console.log('[Keledon Auth Bridge] User info retrieved:', {
                userId: userInfo.userId,
                email: userInfo.email,
                teamId: userInfo.teamId
            });
            sendToBackground(userInfo);
        } else {
            console.warn('[Keledon Auth Bridge] Could not retrieve user info');
        }
    }

    /**
     * Also listen for requests from the sidepanel to trigger auth sync
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'REQUEST_AUTH_SYNC') {
            console.log('[Keledon Auth Bridge] Auth sync requested by extension');
            initialize().then(() => {
                sendResponse({ success: true });
            });
            return true; // Keep channel open for async response
        }
    });

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // Small delay to ensure sessionStorage is populated
        setTimeout(initialize, 100);
    }

    // Also try again on storage changes (in case of SPA navigation)
    window.addEventListener('storage', (event) => {
        if (event.key === AUTH_KEY) {
            console.log('[Keledon Auth Bridge] Auth token changed, re-initializing...');
            initialize();
        }
    });

    console.log('[Keledon Auth Bridge] Script loaded, waiting for auth...');
})();
