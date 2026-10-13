export class BackgroundAuthMethods {
  async loadStoredAuthData() {
    try {
      const keys = [
        'keldon-user-id',
        'keldon-user-email',
        'keldon-user-name',
        'keldon-user-role',
        'keldon-team-id',
        'keldon-company-id',
        'keldon-team-name',
        'keldon-company-name',
        'keldon-brand-name'
      ];
      
      const result = await chrome.storage.local.get(keys);
      
      if (result['keldon-user-id']) {
        this.userAuth = {
          userId: result['keldon-user-id'],
          email: result['keldon-user-email'],
          name: result['keldon-user-name'],
          role: result['keldon-user-role'],
          teamId: result['keldon-team-id'],
          companyId: result['keldon-company-id'],
          teamName: result['keldon-team-name'],
          companyName: result['keldon-company-name'],
          brandName: result['keldon-brand-name'],
          isAuthenticated: true
        };
        
        // Update branding
        this.branding = {
          company: this.userAuth.companyName || '—',
          brand: this.userAuth.brandName || '—',
          team: this.userAuth.teamName || '—'
        };
        
        console.log('[C10-EXT] Auth data loaded from storage:', {
          userId: this.userAuth.userId,
          teamId: this.userAuth.teamId
        });
      }
    } catch (error) {
      console.error('[C10-EXT] Failed to load stored auth data:', error);
    }
  }

  /**
   * Handle AUTH_DATA_RECEIVED from auth-bridge content script
   */
  async handleAuthDataReceived(authData) {
    console.log('[C10-EXT] Auth data received from landing page:', authData);
    
    if (!authData || !authData.userId) {
      console.warn('[C10-EXT] Invalid auth data received');
      return { success: false, error: 'Invalid auth data' };
    }

    // Update user auth state
    this.userAuth = {
      userId: authData.userId,
      email: authData.email,
      name: authData.name,
      role: authData.role,
      teamId: authData.teamId,
      companyId: authData.companyId,
      teamName: authData.teamName,
      companyName: authData.companyName,
      brandName: authData.brandName,
      isAuthenticated: true
    };

    // Update branding
    this.branding = {
      company: authData.companyName || '—',
      brand: authData.brandName || '—',
      team: authData.teamName || '—'
    };

    // Store in chrome.storage.local for persistence
    try {
      await chrome.storage.local.set({
        'keldon-user-id': authData.userId,
        'keldon-user-email': authData.email,
        'keldon-user-name': authData.name,
        'keldon-user-role': authData.role,
        'keldon-team-id': authData.teamId,
        'keldon-company-id': authData.companyId,
        'keldon-team-name': authData.teamName,
        'keldon-company-name': authData.companyName,
        'keldon-brand-name': authData.brandName,
        'keldon-authenticated': true,
        'keldon-auth-timestamp': Date.now()
      });
      
      console.log('[C10-EXT] Auth data stored successfully');
      
      // Reload team config with new team ID
      if (authData.teamId) {
        await this.loadTeamConfigFromCloud();
      }
      
      // Notify sidepanel about auth change
      this.notifySidepanelAuthChange();
      
      return { success: true, userAuth: this.userAuth };
    } catch (error) {
      console.error('[C10-EXT] Failed to store auth data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify sidepanel that auth data has changed
   */
  notifySidepanelAuthChange() {
    if (this.contentPorts.has('sidepanel')) {
      const sidepanelPort = this.contentPorts.get('sidepanel');
      sidepanelPort.postMessage({
        type: 'AUTH_DATA_UPDATED',
        payload: this.userAuth
      });
    }
  }

  /**
   * Request auth sync from content script
   */
  async requestAuthSync() {
    console.log('[C10-EXT] Requesting auth sync...');
    
    try {
      // Try to get auth from any keledon tab
      const tabs = await chrome.tabs.query({ url: 'https://keledon.tuyoisaza.com/*' });
      
      if (tabs.length > 0) {
        const result = await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'REQUEST_AUTH_SYNC'
        });
        return result;
      } else {
        console.warn('[C10-EXT] No keledon tabs found for auth sync');
        return { success: false, error: 'No keledon tab found' };
      }
    } catch (error) {
      console.error('[C10-EXT] Failed to request auth sync:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear auth data (logout)
   */
  async clearAuthData() {
    console.log('[C10-EXT] Clearing auth data...');
    
    this.userAuth = {
      userId: null,
      email: null,
      name: null,
      role: null,
      teamId: null,
      companyId: null,
      teamName: null,
      companyName: null,
      brandName: null,
      isAuthenticated: false
    };

    this.branding = {
      company: '—',
      brand: '—',
      team: '—'
    };

    try {
      await chrome.storage.local.remove([
        'keldon-user-id',
        'keldon-user-email',
        'keldon-user-name',
        'keldon-user-role',
        'keldon-team-id',
        'keldon-company-id',
        'keldon-team-name',
        'keldon-company-name',
        'keldon-brand-name',
        'keldon-authenticated',
        'keldon-auth-timestamp'
      ]);
      
      this.notifySidepanelAuthChange();
      return { success: true };
    } catch (error) {
      console.error('[C10-EXT] Failed to clear auth data:', error);
      return { success: false, error: error.message };
    }
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

}
