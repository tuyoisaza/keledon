/**
 * Genesys Adapter - Handles Genesys Pure Cloud calls via API
 * 
 * Manages:
 * - API authentication
 * - Call control (answer, hold, transfer, end)
 * - Call state monitoring
 * - Audio path (not WebRTC - uses Genesys telephony)
 */

import { EventEmitter } from 'events';

export interface GenesysConfig {
  apiKey?: string;
  organizationId?: string;
  region?: string; // us-east-1, eu-west-1, etc.
  endpoint?: string;
}

export interface GenesysCall {
  id: string;
  state: 'alerting' | 'connected' | 'held' | 'disconnected';
  participantId: string;
  phoneNumber?: string;
  direction: 'inbound' | 'outbound';
  startTime?: number;
  duration?: number;
}

export class GenesysAdapter extends EventEmitter {
  private config: GenesysConfig | null = null;
  private authToken: string | null = null;
  private currentCall: GenesysCall | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(config?: GenesysConfig) {
    super();
    if (config) {
      this.initialize(config);
    }
  }

  /**
   * Initialize with configuration
   */
  async initialize(config: GenesysConfig): Promise<void> {
    this.config = config;
    console.log('[Genesys] Initialized for region:', config.region || 'us-east-1');
  }

  /**
   * Authenticate with Genesys Cloud
   */
  async authenticate(): Promise<void> {
    if (!this.config?.apiKey || !this.config?.organizationId) {
      throw new Error('Genesys API key and organization ID required');
    }

    const region = this.config.region || 'us-east-1';
    const endpoint = this.config.endpoint || `https://api.${region}.genesys.cloud`;

    try {
      const response = await fetch(`${endpoint}/api/v2/authentication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: this.config.apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Genesys auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.accessToken;
      this.isConnected = true;
      
      this.emit('authenticated');
      console.log('[Genesys] Authenticated successfully');

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current call status
   */
  async getCurrentCall(): Promise<GenesysCall | null> {
    if (!this.isConnected) {
      await this.authenticate();
    }

    const region = this.config?.region || 'us-east-1';
    const endpoint = this.config?.endpoint || `https://api.${region}.genesys.cloud`;

    try {
      const response = await fetch(`${endpoint}/api/v2/conversations/calls`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.conversations && data.conversations.length > 0) {
          this.currentCall = this.mapGenesysCall(data.conversations[0]);
          return this.currentCall;
        }
      }

      return null;

    } catch (error) {
      console.error('[Genesys] Failed to get call:', error);
      return null;
    }
  }

  /**
   * Answer incoming call
   */
  async answerCall(callId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not authenticated');
    }

    const region = this.config?.region || 'us-east-1';
    const endpoint = this.config?.endpoint || `https://api.${region}.genesys.cloud`;

    const response = await fetch(`${endpoint}/api/v2/conversations/calls/${callId}/participants/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: ''
      })
    });

    if (response.ok) {
      this.currentCall = {
        id: callId,
        state: 'connected',
        participantId: '',
        direction: 'inbound'
      };
      this.emit('call:answered', { callId });
      console.log('[Genesys] Call answered:', callId);
    } else {
      throw new Error(`Failed to answer call: ${response.status}`);
    }
  }

  /**
   * Hold call
   */
  async holdCall(callId: string): Promise<void> {
    const region = this.config?.region || 'us-east-1';
    const endpoint = this.config?.endpoint || `https://api.${region}.genesys.cloud`;

    await fetch(`${endpoint}/api/v2/conversations/calls/${callId}/participants/hold`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (this.currentCall) {
      this.currentCall.state = 'held';
    }
    this.emit('call:held', { callId });
    console.log('[Genesys] Call held:', callId);
  }

  /**
   * Resume call from hold
   */
  async resumeCall(callId: string): Promise<void> {
    const region = this.config?.region || 'us-east-1';
    const endpoint = this.config?.endpoint || `https://api.${region}.genesys.cloud`;

    await fetch(`${endpoint}/api/v2/conversations/calls/${callId}/participants/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (this.currentCall) {
      this.currentCall.state = 'connected';
    }
    this.emit('call:resumed', { callId });
    console.log('[Genesys] Call resumed:', callId);
  }

  /**
   * End call
   */
  async endCall(callId: string): Promise<void> {
    const region = this.config?.region || 'us-east-1';
    const endpoint = this.config?.endpoint || `https://api.${region}.genesys.cloud`;

    await fetch(`${endpoint}/api/v2/conversations/calls/${callId}/participants/disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.currentCall = null;
    this.emit('call:ended', { callId });
    console.log('[Genesys] Call ended:', callId);
  }

  /**
   * Transfer call
   */
  async transferCall(callId: string, targetNumber: string): Promise<void> {
    const region = this.config?.region || 'us-east-1';
    const endpoint = this.config?.endpoint || `https://api.${region}.genesys.cloud`;

    await fetch(`${endpoint}/api/v2/conversations/calls/${callId}/participants/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: targetNumber,
        userId: ''
      })
    });

    this.emit('call:transferred', { callId, target: targetNumber });
    console.log('[Genesys] Call transferred to:', targetNumber);
  }

  /**
   * Start monitoring for new calls (polling)
   */
  startMonitoring(pollIntervalMs: number = 5000): void {
    this.pollInterval = setInterval(async () => {
      const call = await this.getCurrentCall();
      if (call && call !== this.currentCall) {
        this.currentCall = call;
        this.emit('call:incoming', call);
      }
    }, pollIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Get current call
   */
  getCurrentCallState(): GenesysCall | null {
    return this.currentCall;
  }

  /**
   * Check if connected
   */
  isAuthenticated(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.stopMonitoring();
    this.authToken = null;
    this.isConnected = false;
    this.currentCall = null;
    console.log('[Genesys] Disconnected');
  }

  private mapGenesysCall(raw: any): GenesysCall {
    return {
      id: raw.id,
      state: this.mapState(raw.state),
      participantId: raw.participants?.[0]?.id || '',
      phoneNumber: raw.participants?.[0]?.address || '',
      direction: raw.direction || 'inbound',
      startTime: raw.startTime ? new Date(raw.startTime).getTime() : undefined
    };
  }

  private mapState(rawState: string): GenesysCall['state'] {
    switch (rawState) {
      case 'alerting': return 'alerting';
      case 'connected': return 'connected';
      case 'held': return 'held';
      default: return 'disconnected';
    }
  }
}

export const genesysAdapter = new GenesysAdapter();