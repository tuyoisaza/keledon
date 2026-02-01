import React, { useState, useEffect } from 'react';
import { 
  Plug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Activity,
  Zap,
  Settings,
  RefreshCw,
  Link,
  Database,
  Phone,
  MessageSquare,
  FileText,
  Users,
  Shield,
  BarChart3,
  Globe,
  Building,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface IntegrationProvider {
  id: string;
  name: string;
  category: 'crm' | 'helpdesk' | 'communication' | 'analytics' | 'database' | 'other';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  version: string;
  lastSync?: Date;
  health: {
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
  features: string[];
  config: {
    apiKey?: boolean;
    webhook?: boolean;
    oauth?: boolean;
    customFields?: boolean;
  };
}

interface Connection {
  id: string;
  providerId: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  configuration: Record<string, any>;
  metrics: {
    requestsToday: number;
    successRate: number;
    avgResponseTime: number;
    lastActivity: Date;
  };
  createdAt: Date;
}

interface IntegrationHubProps {
  className?: string;
}

export default function InterfaceIntegrationHub({ className }: IntegrationHubProps) {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const mockProviders: IntegrationProvider[] = [
    {
      id: 'salesforce',
      name: 'Salesforce',
      category: 'crm',
      icon: Building,
      description: 'Customer relationship management and sales automation',
      status: 'connected',
      version: 'v2.1',
      lastSync: new Date(),
      health: {
        responseTime: 120,
        uptime: 99.8,
        errorRate: 0.1
      },
      features: ['Lead Management', 'Contact Sync', 'Opportunity Tracking', 'Custom Objects'],
      config: { oauth: true, customFields: true }
    },
    {
      id: 'genesys',
      name: 'Genesys Cloud',
      category: 'helpdesk',
      icon: Phone,
      description: 'Cloud contact center and customer engagement platform',
      status: 'connected',
      version: 'v1.8',
      lastSync: new Date(Date.now() - 300000),
      health: {
        responseTime: 85,
        uptime: 99.9,
        errorRate: 0.05
      },
      features: ['Voice Routing', 'Chat Integration', 'IVR', 'Agent Management'],
      config: { apiKey: true, webhook: true }
    },
    {
      id: 'zendesk',
      name: 'Zendesk',
      category: 'helpdesk',
      icon: MessageSquare,
      description: 'Customer service and support ticketing system',
      status: 'error',
      version: 'v1.5',
      lastSync: new Date(Date.now() - 3600000),
      health: {
        responseTime: 450,
        uptime: 97.2,
        errorRate: 2.8
      },
      features: ['Ticket Management', 'Knowledge Base', 'Live Chat', 'Analytics'],
      config: { webhook: true, apiKey: true }
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      category: 'crm',
      icon: Users,
      description: 'Inbound marketing, sales, and service software',
      status: 'disconnected',
      version: 'v3.0',
      health: {
        responseTime: 0,
        uptime: 0,
        errorRate: 0
      },
      features: ['Lead Capture', 'Email Marketing', 'CRM', 'Analytics'],
      config: { oauth: true, webhook: true }
    },
    {
      id: 'slack',
      name: 'Slack',
      category: 'communication',
      icon: MessageSquare,
      description: 'Team collaboration and messaging platform',
      status: 'connected',
      version: 'v2.0',
      lastSync: new Date(Date.now() - 60000),
      health: {
        responseTime: 45,
        uptime: 99.99,
        errorRate: 0.01
      },
      features: ['Message Posting', 'Channel Management', 'File Sharing', 'Bot Integration'],
      config: { webhook: true, apiKey: true }
    },
    {
      id: 'stripe',
      name: 'Stripe',
      category: 'other',
      icon: Shield,
      description: 'Payment processing and financial services',
      status: 'connected',
      version: 'v1.4',
      lastSync: new Date(),
      health: {
        responseTime: 95,
        uptime: 99.95,
        errorRate: 0.02
      },
      features: ['Payment Processing', 'Subscription Management', 'Invoicing', 'Fraud Detection'],
      config: { apiKey: true, webhook: true }
    },
    {
      id: 'google-analytics',
      name: 'Google Analytics',
      category: 'analytics',
      icon: BarChart3,
      description: 'Web analytics and digital marketing insights',
      status: 'connected',
      version: 'v4',
      lastSync: new Date(Date.now() - 1800000),
      health: {
        responseTime: 200,
        uptime: 99.7,
        errorRate: 0.3
      },
      features: ['Traffic Analysis', 'Conversion Tracking', 'Custom Reports', 'Real-time Data'],
      config: { apiKey: true, oauth: true }
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      category: 'database',
      icon: Database,
      description: 'NoSQL document database for modern applications',
      status: 'connected',
      version: 'v6.0',
      lastSync: new Date(),
      health: {
        responseTime: 15,
        uptime: 99.99,
        errorRate: 0
      },
      features: ['Document Storage', 'Aggregation Pipeline', 'Full-text Search', 'Change Streams'],
      config: { apiKey: true }
    }
  ];

  const mockConnections: Connection[] = [
    {
      id: 'conn-1',
      providerId: 'salesforce',
      name: 'Production Salesforce',
      status: 'active',
      configuration: {
        environment: 'production',
        dataCenter: 'us-west-2',
        syncInterval: 300
      },
      metrics: {
        requestsToday: 1247,
        successRate: 99.8,
        avgResponseTime: 120,
        lastActivity: new Date(Date.now() - 120000)
      },
      createdAt: new Date(Date.now() - 86400000 * 30)
    },
    {
      id: 'conn-2',
      providerId: 'genesys',
      name: 'Main Contact Center',
      status: 'active',
      configuration: {
        region: 'us-east-1',
        queueMonitoring: true,
        realTimeSync: true
      },
      metrics: {
        requestsToday: 892,
        successRate: 99.9,
        avgResponseTime: 85,
        lastActivity: new Date()
      },
      createdAt: new Date(Date.now() - 86400000 * 15)
    },
    {
      id: 'conn-3',
      providerId: 'zendesk',
      name: 'Support Tickets',
      status: 'error',
      configuration: {
        instance: 'company.zendesk.com',
        syncTickets: true,
        autoAssign: true
      },
      metrics: {
        requestsToday: 234,
        successRate: 97.2,
        avgResponseTime: 450,
        lastActivity: new Date(Date.now() - 3600000)
      },
      createdAt: new Date(Date.now() - 86400000 * 45)
    },
    {
      id: 'conn-4',
      providerId: 'slack',
      name: 'Team Notifications',
      status: 'active',
      configuration: {
        workspace: 'company-workspace',
        channels: ['#alerts', '#general'],
        botUser: true
      },
      metrics: {
        requestsToday: 156,
        successRate: 99.99,
        avgResponseTime: 45,
        lastActivity: new Date(Date.now() - 30000)
      },
      createdAt: new Date(Date.now() - 86400000 * 60)
    }
  ];

  // Initialize data
  useEffect(() => {
    setProviders(mockProviders);
    setConnections(mockConnections);
  }, []);

  // Real-time status updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setProviders(prev => prev.map(provider => ({
        ...provider,
        health: {
          ...provider.health,
          responseTime: provider.status === 'connected' 
            ? Math.max(20, provider.health.responseTime + (Math.random() - 0.5) * 20)
            : 0,
          uptime: provider.status === 'connected' 
            ? Math.min(100, Math.max(95, provider.health.uptime + (Math.random() - 0.5) * 0.2))
            : 0,
          errorRate: provider.status === 'connected'
            ? Math.max(0, Math.min(1, provider.health.errorRate + (Math.random() - 0.5) * 0.1))
            : provider.status === 'error' ? Math.random() * 5 + 2 : 0
        },
        lastSync: provider.status === 'connected' 
          ? new Date() 
          : provider.lastSync
      })));

      setConnections(prev => prev.map(connection => ({
        ...connection,
        metrics: {
          ...connection.metrics,
          requestsToday: connection.status === 'active' 
            ? connection.metrics.requestsToday + Math.floor(Math.random() * 5)
            : connection.metrics.requestsToday,
          successRate: connection.status === 'active'
            ? Math.min(100, Math.max(95, connection.metrics.successRate + (Math.random() - 0.5) * 2))
            : 0,
          avgResponseTime: connection.status === 'active'
            ? Math.max(20, connection.metrics.avgResponseTime + (Math.random() - 0.5) * 10)
            : 0,
          lastActivity: connection.status === 'active' 
            ? new Date() 
            : connection.metrics.lastActivity
        }
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const categories = [
    { id: 'all', name: 'All', icon: Globe },
    { id: 'crm', name: 'CRM', icon: Users },
    { id: 'helpdesk', name: 'Helpdesk', icon: MessageSquare },
    { id: 'communication', name: 'Communication', icon: Phone },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'other', name: 'Other', icon: Settings }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active': return 'text-green-500 bg-green-100 border-green-200';
      case 'disconnected':
      case 'inactive': return 'text-gray-500 bg-gray-100 border-gray-200';
      case 'error': return 'text-red-500 bg-red-100 border-red-200';
      case 'connecting': return 'text-yellow-500 bg-yellow-100 border-yellow-200 animate-pulse';
      default: return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  const getHealthColor = (value: number, type: 'responseTime' | 'uptime' | 'errorRate') => {
    switch (type) {
      case 'responseTime':
        return value < 100 ? 'text-green-500' : value < 300 ? 'text-yellow-500' : 'text-red-500';
      case 'uptime':
        return value > 99.5 ? 'text-green-500' : value > 98 ? 'text-yellow-500' : 'text-red-500';
      case 'errorRate':
        return value < 0.1 ? 'text-green-500' : value < 1 ? 'text-yellow-500' : 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const filteredProviders = selectedCategory === 'all' 
    ? providers 
    : providers.filter(p => p.category === selectedCategory);

  const getConnectionsForProvider = (providerId: string) => 
    connections.filter(c => c.providerId === providerId);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Plug className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Interface Integration Hub</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
              realTimeUpdates 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {realTimeUpdates ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(category => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {category.name}
              <span className="text-xs opacity-70">
                ({selectedCategory === 'all' ? providers.length : providers.filter(p => p.category === category.id).length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map(provider => {
          const Icon = provider.icon;
          const providerConnections = getConnectionsForProvider(provider.id);
          const activeConnections = providerConnections.filter(c => c.status === 'active').length;
          
          return (
            <div
              key={provider.id}
              className={cn(
                "p-4 rounded-lg border bg-card cursor-pointer transition-all hover:border-primary/30",
                selectedProvider === provider.id && "border-primary bg-primary/5"
              )}
              onClick={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
            >
              {/* Provider Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{provider.name}</h3>
                    <span className="text-xs text-muted-foreground">v{provider.version}</span>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium border",
                  getStatusColor(provider.status)
                )}>
                  {provider.status}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>

              {/* Status Details */}
              {provider.status === 'connected' && (
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Response Time:</span>
                    <span className={cn("font-mono", getHealthColor(provider.health.responseTime, 'responseTime'))}>
                      {provider.health.responseTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className={cn("font-mono", getHealthColor(provider.health.uptime, 'uptime'))}>
                      {provider.health.uptime.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Error Rate:</span>
                    <span className={cn("font-mono", getHealthColor(provider.health.errorRate, 'errorRate'))}>
                      {provider.health.errorRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Connections */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Connections</span>
                  <span className="text-xs font-medium">{activeConnections}/{providerConnections.length}</span>
                </div>
                <div className="flex gap-1">
                  {providerConnections.map(connection => (
                    <div
                      key={connection.id}
                      className={cn(
                        "w-2 h-2 rounded-full",
                        connection.status === 'active' ? 'bg-green-500' :
                        connection.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                      )}
                      title={connection.name}
                    />
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1">
                {provider.features.slice(0, 3).map(feature => (
                  <span 
                    key={feature}
                    className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs"
                  >
                    {feature}
                  </span>
                ))}
                {provider.features.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">
                    +{provider.features.length - 3}
                  </span>
                )}
              </div>

              {/* Config Icons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                {provider.config.apiKey && <div className="w-4 h-4 bg-blue-500 rounded" title="API Key" />}
                {provider.config.oauth && <div className="w-4 h-4 bg-green-500 rounded" title="OAuth" />}
                {provider.config.webhook && <div className="w-4 h-4 bg-purple-500 rounded" title="Webhooks" />}
                {provider.config.customFields && <div className="w-4 h-4 bg-orange-500 rounded" title="Custom Fields" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Provider Details */}
      {selectedProvider && (
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">Provider Details: {providers.find(p => p.id === selectedProvider)?.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Connections */}
            <div>
              <h4 className="font-medium mb-2">Connections</h4>
              <div className="space-y-2">
                {getConnectionsForProvider(selectedProvider).map(connection => (
                  <div key={connection.id} className="p-3 rounded-lg bg-muted">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{connection.name}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        getStatusColor(connection.status)
                      )}>
                        {connection.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Requests: {connection.metrics.requestsToday}</div>
                      <div>Success: {connection.metrics.successRate.toFixed(1)}%</div>
                      <div>Response: {connection.metrics.avgResponseTime}ms</div>
                      <div>Last: {connection.metrics.lastActivity.toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Metrics */}
            <div>
              <h4 className="font-medium mb-2">Health Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Response Time</span>
                  <span className={cn(
                    "font-mono text-sm",
                    getHealthColor(providers.find(p => p.id === selectedProvider)?.health.responseTime || 0, 'responseTime')
                  )}>
                    {providers.find(p => p.id === selectedProvider)?.health.responseTime}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className={cn(
                    "font-mono text-sm",
                    getHealthColor(providers.find(p => p.id === selectedProvider)?.health.uptime || 0, 'uptime')
                  )}>
                    {providers.find(p => p.id === selectedProvider)?.health.uptime.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Error Rate</span>
                  <span className={cn(
                    "font-mono text-sm",
                    getHealthColor(providers.find(p => p.id === selectedProvider)?.health.errorRate || 0, 'errorRate')
                  )}>
                    {providers.find(p => p.id === selectedProvider)?.health.errorRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}