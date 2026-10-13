export class BackgroundRuntimeMethods {
  resolveRuntimeTier() {
    const rawTier =
      (typeof process !== 'undefined' && process?.env?.KELEDON_ENV_TIER) ||
      (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production'
        ? 'PRODUCTION_MANAGED'
        : 'DEV_LOCAL');

    const tier = String(rawTier || 'DEV_LOCAL').trim().toUpperCase();
    if (tier === 'PRODUCTION_MANAGED' || tier === 'CI_PROOF' || tier === 'DEV_LOCAL') {
      return tier;
    }

    return 'DEV_LOCAL';
  }

  isLoopbackOrigin(urlValue) {
    try {
      const parsed = new URL(urlValue);
      const host = parsed.hostname.toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    } catch {
      return false;
    }
  }

  async start() {
    console.log('[KELEDON] BackgroundService starting');

    await this.initializeComponents();
    await this.loadCloudRuntimeConfig();
    this.setupEventHandlers();
    this.setupMessageHandlers();
    this.connectCloudRuntime();

    console.log('[KELEDON] BackgroundService ready');
  }

  async initializeComponents() {
    // Phase O/N-1: Basic initialization only
    console.log('[KELEDON] Basic components initialized');
  }

  setupEventHandlers() {
    // Phase O/N-1: No complex event handlers
    console.log('[KELEDON] Basic event handlers setup');
  }

  normalizeCloudUrl(rawUrl) {
    if (typeof rawUrl !== 'string') {
      return null;
    }

    const value = rawUrl.trim();
    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      const origin = parsed.origin;
      if (this.runtimeTier === 'PRODUCTION_MANAGED' && this.isLoopbackOrigin(origin)) {
        return null;
      }

      return origin;
    } catch (error) {
      return null;
    }
  }

  async loadCloudRuntimeConfig() {
    const defaultCloudUrl = this.runtimeTier === 'DEV_LOCAL'
      ? 'http://localhost:3001'
      : 'https://keledon.tuyoisaza.com';

    const canonicalCloudBase =
      (typeof process !== 'undefined' && process?.env?.KELEDON_CLOUD_BASE_URL) || '';

    if (canonicalCloudBase) {
      const normalizedCanonical = this.normalizeCloudUrl(canonicalCloudBase);
      if (!normalizedCanonical) {
        throw new Error('[C22.3] KELEDON_CLOUD_BASE_URL is invalid for current runtime tier.');
      }
      this.cloudUrl = normalizedCanonical;
    }

    try {
      const stored = await chrome.storage.local.get([
        this.cloudUrlStorageKey,
        this.legacyCloudUrlStorageKey,
      ]);
      const storedUrl =
        this.normalizeCloudUrl(stored?.[this.cloudUrlStorageKey]) ||
        this.normalizeCloudUrl(stored?.[this.legacyCloudUrlStorageKey]);
      if (storedUrl && this.runtimeTier !== 'PRODUCTION_MANAGED') {
        this.cloudUrl = storedUrl;
      }
    } catch (error) {
      console.warn('[C11-EXT] Failed to load cloud URL from storage, using default');
    }

    if (!this.cloudUrl) {
      this.cloudUrl = this.normalizeCloudUrl(defaultCloudUrl);
    }

    if (this.runtimeTier === 'PRODUCTION_MANAGED' && this.isLoopbackOrigin(this.cloudUrl)) {
      throw new Error('[C22.3] PRODUCTION_MANAGED cannot use localhost cloud URL.');
    }

    console.log(`[C11-EXT] Runtime tier: ${this.runtimeTier}`);
    console.log(`[C11-EXT] Cloud runtime URL: ${this.cloudUrl}`);
  }

  async updateCloudRuntimeUrl(rawUrl, source = 'unknown') {
    const normalized = this.normalizeCloudUrl(rawUrl);
    if (!normalized) {
      throw new Error('Invalid cloud URL. Use http:// or https:// with host and port.');
    }

    if (normalized === this.cloudUrl) {
      return { cloudUrl: this.cloudUrl, reconnected: false };
    }

    this.cloudUrl = normalized;
    await chrome.storage.local.set({
      [this.cloudUrlStorageKey]: this.cloudUrl,
      [this.legacyCloudUrlStorageKey]: this.cloudUrl,
    });
    console.log(`[C11-EXT] Cloud runtime URL updated from ${source}: ${this.cloudUrl}`);

    this.connectCloudRuntime();
    return { cloudUrl: this.cloudUrl, reconnected: true };
  }

  disconnectCloudRuntime() {
    if (!this.socket) {
      return;
    }

    if (this.commandChannelName) {
      this.socket.off(this.commandChannelName);
      this.commandChannelName = null;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.currentSessionId = null;
    this.componentStatus.websocket = 'disconnected';
  }

  connectCloudRuntime() {
    if (!this.cloudUrl) {
      console.warn('[C10-EXT] Cloud URL not configured - cannot connect. Set via sidepanel or chrome.storage.');
      this.componentStatus.websocket = 'disconnected';
      return;
    }

    if (this.socket && this.socket.connected) {
      return;
    }

    const connectionUrl = `${this.cloudUrl}/agent`;
    console.log(`[C10-EXT] Attempting to connect to: ${connectionUrl}`);

    try {
      this.socket = io(connectionUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', async () => {
        this.componentStatus.websocket = 'connected';
        console.log('[C10-EXT] Connected to cloud runtime');
        await this.ensureSession();
      });

      this.socket.on('disconnect', (reason) => {
        this.componentStatus.websocket = 'disconnected';
        console.warn('[C10-EXT] Disconnected from cloud runtime:', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.componentStatus.websocket = 'error';
        console.error('[C10-EXT] Cloud runtime connection error:', error.message);
      });

      this.socket.on('session.created', (payload) => {
        this.currentSessionId = payload?.session_id || null;
        
        // Update branding from session payload (C57)
        if (payload) {
          this.branding.company = payload.company_name || '—';
          this.branding.brand = payload.brand_name || '—';
          this.branding.team = payload.team_name || '—';
        }

        if (this.currentSessionId) {
          if (this.commandChannelName) {
            this.socket.off(this.commandChannelName);
          }

          this.commandChannelName = `command.${this.currentSessionId}`;
          this.socket.on(this.commandChannelName, (command) => {
            this.handleCloudCommand(command).catch((error) => {
              console.error('[C10-EXT] Failed to process command:', error);
            });
          });
        }
        console.log('[C10-EXT] Session ready:', this.currentSessionId);
      });
    } catch (error) {
      console.error('[C10-EXT] Failed to create socket connection:', error);
      this.componentStatus.websocket = 'error';
    }
  }

}
