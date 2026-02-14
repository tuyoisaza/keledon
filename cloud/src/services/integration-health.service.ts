import { Injectable } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { randomUUID } from 'crypto';

export interface IntegrationProvider {
  id: string;
  name: string;
  category: 'crm' | 'helpdesk' | 'communication' | 'payment' | 'analytics' | 'storage';
  icon: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  version: string;
  lastSync?: Date;
  health?: ProviderHealth;
  features: string[];
  config: ProviderConfig;
  endpoints: string[];
}

export interface ProviderHealth {
  responseTime: number; // milliseconds
  uptime: number; // percentage
  errorRate: number; // percentage
  lastCheck: Date;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
}

export interface ProviderConfig {
  apiKey: boolean;
  oauth: boolean;
  customFields: boolean;
  webhooks: boolean;
  realTime: boolean;
}

export interface ConnectionMetrics {
  providerId: string;
  status: string;
  lastSync: Date;
  metrics: {
    requestsPerMinute: number;
    dataTransfer: number; // bytes
    errorCount: number;
    avgResponseTime: number;
  };
}

@Injectable()
export class IntegrationHealthService {
  private providers = new Map<string, IntegrationProvider>();
  private healthUpdate = new Subject<IntegrationProvider[]>();
  private connectionUpdate = new Subject<ConnectionMetrics[]>();
  
  public providers$ = this.healthUpdate.asObservable();
  public connections$ = this.connectionUpdate.asObservable();

  // Health check intervals per provider
  private healthCheckIntervals = new Map<string, any>();

  constructor() {
    console.log('IntegrationHealthService: Initialized');
    this.initializeDefaultProviders();
    this.startHealthChecks();
  }

  // Register a new integration provider
  registerProvider(provider: Omit<IntegrationProvider, 'health'>): void {
    const fullProvider: IntegrationProvider = {
      ...provider,
      health: {
        responseTime: 0,
        uptime: 100,
        errorRate: 0,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        totalRequests: 0,
        successfulRequests: 0
      }
    };

    this.providers.set(provider.id, fullProvider);
    this.scheduleHealthCheck(provider.id);
    this.broadcastUpdate();
    
    console.log(`IntegrationHealth: Registered provider ${provider.name} (${provider.id})`);
  }

  // Update provider configuration
  updateProviderConfig(providerId: string, config: Partial<IntegrationProvider>): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      Object.assign(provider, config);
      this.providers.set(providerId, provider);
      this.broadcastUpdate();
      console.log(`IntegrationHealth: Updated configuration for provider ${providerId}`);
    }
  }

  // Connect to a provider
  async connectProvider(providerId: string, credentials?: any): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    provider.status = 'connecting';
    this.broadcastUpdate();

    try {
      // Simulate connection process
      const isConnected = await this.testConnection(provider, credentials);
      
      if (isConnected) {
        provider.status = 'connected';
        provider.lastSync = new Date();
        if (provider.health) {
          provider.health.consecutiveFailures = 0;
        }
        console.log(`IntegrationHealth: Connected to provider ${providerId}`);
      } else {
        provider.status = 'error';
        if (provider.health) {
          provider.health.consecutiveFailures++;
        }
        console.error(`IntegrationHealth: Failed to connect to provider ${providerId}`);
      }

      this.broadcastUpdate();
      return isConnected;

    } catch (error) {
      provider.status = 'error';
      if (provider.health) {
        provider.health.consecutiveFailures++;
      }
      this.broadcastUpdate();
      console.error(`IntegrationHealth: Connection error for provider ${providerId}:`, error);
      return false;
    }
  }

  // Disconnect from a provider
  disconnectProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.status = 'disconnected';
      this.broadcastUpdate();
      
      // Stop health checks
      const interval = this.healthCheckIntervals.get(providerId);
      if (interval) {
        clearInterval(interval);
        this.healthCheckIntervals.delete(providerId);
      }
      
      console.log(`IntegrationHealth: Disconnected from provider ${providerId}`);
    }
  }

  // Test provider connection
  async testProviderConnection(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const startTime = Date.now();
    let success = false;

    try {
      // Simulate different connection methods based on provider
      success = await this.testConnection(provider);
      
      const responseTime = Date.now() - startTime;
      this.updateHealthMetrics(providerId, success, responseTime);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateHealthMetrics(providerId, false, responseTime);
      console.error(`IntegrationHealth: Test failed for provider ${providerId}:`, error);
    }

    this.broadcastUpdate();
    return success;
  }

  // Sync provider data
  async syncProvider(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider || provider.status !== 'connected') {
      return false;
    }

    try {
      // Deterministic sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      provider.lastSync = new Date();
      this.broadcastUpdate();
      console.log(`IntegrationHealth: Synced provider ${providerId}`);
      return true;

    } catch (error) {
      console.error(`IntegrationHealth: Sync failed for provider ${providerId}:`, error);
      return false;
    }
  }

  // Get all providers
  getProviders(): IntegrationProvider[] {
    return Array.from(this.providers.values());
  }

  // Get provider by ID
  getProvider(providerId: string): IntegrationProvider | undefined {
    return this.providers.get(providerId);
  }

  // Get connection metrics
  getConnectionMetrics(): ConnectionMetrics[] {
    return Array.from(this.providers.values()).map(provider => ({
      providerId: provider.id,
      status: provider.status,
      lastSync: provider.lastSync || new Date(),
      metrics: {
        requestsPerMinute: this.calculateRequestsPerMinute(provider),
        dataTransfer: 0,
        errorCount: provider.health?.consecutiveFailures || 0,
        avgResponseTime: provider.health?.responseTime || 0
      }
    }));
  }

  // Get providers by category
  getProvidersByCategory(category: IntegrationProvider['category']): IntegrationProvider[] {
    return this.getProviders().filter(provider => provider.category === category);
  }

  // Private methods
  private initializeDefaultProviders(): void {
    const defaultProviders: Omit<IntegrationProvider, 'health'>[] = [
      {
        id: 'salesforce',
        name: 'Salesforce',
        category: 'crm',
        icon: 'Globe',
        description: 'CRM and customer management platform',
        status: 'disconnected',
        version: '2.1.0',
        features: ['Contact Management', 'Lead Tracking', 'Analytics', 'Automation'],
        config: { apiKey: true, oauth: true, customFields: true, webhooks: true, realTime: true },
        endpoints: ['https://api.salesforce.com', '/webhooks/salesforce']
      },
      {
        id: 'genesys',
        name: 'Genesys Cloud',
        category: 'helpdesk',
        icon: 'Headphones',
        description: 'Customer service and contact center platform',
        status: 'disconnected',
        version: '3.2.1',
        features: ['Voice', 'Chat', 'Email', 'Social', 'Analytics'],
        config: { apiKey: true, oauth: true, customFields: false, webhooks: true, realTime: true },
        endpoints: ['https://api.mypurecloud.com', '/webhooks/genesys']
      },
      {
        id: 'zendesk',
        name: 'Zendesk',
        category: 'helpdesk',
        icon: 'MessageSquare',
        description: 'Customer support and ticketing system',
        status: 'disconnected',
        version: '1.8.0',
        features: ['Ticketing', 'Live Chat', 'Help Center', 'Analytics'],
        config: { apiKey: true, oauth: true, customFields: true, webhooks: true, realTime: false },
        endpoints: ['https://api.zendesk.com', '/webhooks/zendesk']
      },
      {
        id: 'slack',
        name: 'Slack',
        category: 'communication',
        icon: 'MessageCircle',
        description: 'Team collaboration and communication platform',
        status: 'disconnected',
        version: '1.0.5',
        features: ['Messaging', 'Channels', 'Integrations', 'Automation'],
        config: { apiKey: true, oauth: true, customFields: false, webhooks: true, realTime: true },
        endpoints: ['https://api.slack.com', '/webhooks/slack']
      },
      {
        id: 'stripe',
        name: 'Stripe',
        category: 'payment',
        icon: 'CreditCard',
        description: 'Payment processing and financial services',
        status: 'disconnected',
        version: '2023.10.0',
        features: ['Payments', 'Subscriptions', 'Invoicing', 'Analytics'],
        config: { apiKey: true, oauth: false, customFields: false, webhooks: true, realTime: true },
        endpoints: ['https://api.stripe.com', '/webhooks/stripe']
      },
      {
        id: 'aws-s3',
        name: 'AWS S3',
        category: 'storage',
        icon: 'HardDrive',
        description: 'Object storage and file management',
        status: 'disconnected',
        version: '1.0.0',
        features: ['File Storage', 'Backup', 'CDN', 'Security'],
        config: { apiKey: true, oauth: false, customFields: false, webhooks: false, realTime: false },
        endpoints: ['https://s3.amazonaws.com']
      }
    ];

    defaultProviders.forEach(provider => {
      this.registerProvider(provider);
    });
  }

  private async testConnection(provider: IntegrationProvider, credentials?: any): Promise<boolean> {
    // Simulate connection testing with different methods per provider
    const testMethods = {
      crm: () => this.testCrmConnection(provider),
      helpdesk: () => this.testHelpdeskConnection(provider),
      communication: () => this.testCommunicationConnection(provider),
      payment: () => this.testPaymentConnection(provider),
      storage: () => this.testStorageConnection(provider),
      analytics: () => this.testAnalyticsConnection(provider)
    };

    const testMethod = testMethods[provider.category];
    return testMethod ? testMethod() : this.testGenericConnection(provider);
  }

  private async testCrmConnection(provider: IntegrationProvider): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return false;
  }

  private async testHelpdeskConnection(provider: IntegrationProvider): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return false;
  }

  private async testCommunicationConnection(provider: IntegrationProvider): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return false;
  }

  private async testPaymentConnection(provider: IntegrationProvider): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return false;
  }

  private async testStorageConnection(provider: IntegrationProvider): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 250));
    return false;
  }

  private async testAnalyticsConnection(provider: IntegrationProvider): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return false;
  }

  private async testGenericConnection(provider: IntegrationProvider): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return false;
  }

  private updateHealthMetrics(providerId: string, success: boolean, responseTime: number): void {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.health) return;

    const health = provider.health;
    health.totalRequests++;
    
    if (success) {
      health.successfulRequests++;
      health.consecutiveFailures = 0;
    } else {
      health.consecutiveFailures++;
    }

    health.responseTime = responseTime;
    health.uptime = (health.successfulRequests / health.totalRequests) * 100;
    health.errorRate = ((health.totalRequests - health.successfulRequests) / health.totalRequests) * 100;
    health.lastCheck = new Date();

    // Update provider status based on health
    if (health.consecutiveFailures >= 3) {
      provider.status = 'error';
    } else if (health.errorRate > 10) {
      provider.status = 'error';
    } else if (provider.status !== 'disconnected') {
      provider.status = 'connected';
    }
  }

  private calculateRequestsPerMinute(provider: IntegrationProvider): number {
    if (!provider.health) return 0;
    return 0;
  }

  private scheduleHealthCheck(providerId: string): void {
    // Clear existing interval
    const existingInterval = this.healthCheckIntervals.get(providerId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule health checks every 30 seconds
    const interval = setInterval(async () => {
      const provider = this.providers.get(providerId);
      if (provider && provider.status === 'connected') {
        await this.testProviderConnection(providerId);
      }
    }, 30000);

    this.healthCheckIntervals.set(providerId, interval);
  }

  private startHealthChecks(): void {
    // Start periodic health checks for all connected providers
    interval(60000).subscribe(async () => {
      const connectedProviders = Array.from(this.providers.values())
        .filter(provider => provider.status === 'connected');
      
      for (const provider of connectedProviders) {
        await this.testProviderConnection(provider.id);
      }
      
      // Broadcast connection metrics
      this.connectionUpdate.next(this.getConnectionMetrics());
    });
  }

  private broadcastUpdate(): void {
    this.healthUpdate.next(this.getProviders());
  }

  // Cleanup
  onModuleDestroy(): void {
    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
  }
}