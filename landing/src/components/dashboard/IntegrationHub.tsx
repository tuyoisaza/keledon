import React from 'react';
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
  Info,
  Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIntegrationHub } from '../../hooks/useIntegrationHub';

interface IntegrationProvider {
  id: string;
  name: string;
  category: 'crm' | 'helpdesk' | 'communication' | 'analytics' | 'database' | 'other';
  icon: string;
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
  providerId: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastSync?: Date;
  metrics?: {
    requestsPerMinute: number;
    dataTransfer: number;
    errorCount: number;
  };
}

interface IntegrationHubProps {
  className?: string;
}

export default function IntegrationHub({ className }: IntegrationHubProps) {
  const { 
    providers,
    connections,
    filteredProviders,
    connectedProviders,
    errorProviders,
    selectedProvider,
    filter,
    loading,
    selectProvider,
    clearSelection,
    setFilterValue,
    connectProvider,
    disconnectProvider,
    testConnection,
    syncProvider
  } = useIntegrationHub();

  const categoryIcons = {
    crm: Users,
    helpdesk: Phone,
    communication: MessageSquare,
    analytics: BarChart3,
    database: Database,
    other: Plug
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Globe': return Globe;
      case 'Building': return Building;
      case 'Phone': return Phone;
      case 'MessageSquare': return MessageSquare;
      case 'FileText': return FileText;
      case 'Users': return Users;
      case 'Shield': return Shield;
      case 'BarChart3': return BarChart3;
      case 'Database': return Database;
      default: return Plug;
    }
  };

  const getStatusColor = (status: IntegrationProvider['status']) => {
    switch (status) {
      case 'connected': return 'text-green-500 bg-green-100 border-green-200';
      case 'disconnected': return 'text-gray-500 bg-gray-100 border-gray-200';
      case 'error': return 'text-red-500 bg-red-100 border-red-200';
      case 'connecting': return 'text-yellow-500 bg-yellow-100 border-yellow-200 animate-pulse';
      default: return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  const getHealthIndicator = (health: IntegrationProvider['health']) => {
    if (health.errorRate > 10) return 'error';
    if (health.responseTime > 1000) return 'warning';
    return 'healthy';
  };

  const categories = ['all', 'crm', 'helpdesk', 'communication', 'analytics', 'database', 'other'];

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-3">
          <Plug className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-xl font-semibold">Interface Integration Hub</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Plug className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading Integration Providers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Plug className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Interface Integration Hub</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{connectedProviders.length} connected</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>{errorProviders.length} errors</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterValue(cat)}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-medium transition-all",
              filter === cat 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.length === 0 ? (
          <div className="col-span-full p-8 text-center border-2 border-dashed border-border rounded-lg">
            <Plug className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Integrations Found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'No integration providers are currently configured.'
                : `No ${filter} integrations found.`
              }
            </p>
          </div>
        ) : (
          filteredProviders.map((provider) => {
            const IconComponent = getIconComponent(provider.icon);
            const CategoryIcon = categoryIcons[provider.category];
            const connection = connections.find(c => c.providerId === provider.id);
            const healthStatus = getHealthIndicator(provider.health);

            return (
              <div key={provider.id} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                {/* Provider Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{provider.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CategoryIcon className="w-3 h-3" />
                        <span>{provider.category}</span>
                        <span>•</span>
                        <span>v{provider.version}</span>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    getStatusColor(provider.status)
                  )}>
                    {provider.status.toUpperCase()}
                  </div>
                </div>

                {/* Health Indicators */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Response Time</span>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        healthStatus === 'error' ? "text-red-500" :
                        healthStatus === 'warning' ? "text-yellow-500" :
                        "text-green-500"
                      )}>
                        {provider.health.responseTime}ms
                      </span>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        healthStatus === 'error' ? "bg-red-500" :
                        healthStatus === 'warning' ? "bg-yellow-500" :
                        "bg-green-500"
                      )} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="text-green-500">{provider.health.uptime}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Error Rate</span>
                    <span className={cn(
                      provider.health.errorRate > 5 ? "text-red-500" : "text-green-500"
                    )}>
                      {provider.health.errorRate}%
                    </span>
                  </div>
                </div>

                {/* Last Sync */}
                {provider.lastSync && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Clock className="w-3 h-3" />
                    <span>Last sync: {provider.lastSync.toLocaleTimeString()}</span>
                  </div>
                )}

                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {provider.features.slice(0, 3).map((feature) => (
                    <span key={feature} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                      {feature}
                    </span>
                  ))}
                  {provider.features.length > 3 && (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                      +{provider.features.length - 3}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {provider.status === 'connected' ? (
                    <>
                      <button
                        onClick={() => testConnection(provider.id)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Test
                      </button>
                      <button
                        onClick={() => syncProvider(provider.id)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1"
                      >
                        <Activity className="w-3 h-3" />
                        Sync
                      </button>
                      <button
                        onClick={() => disconnectProvider(provider.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => connectProvider(provider.id)}
                      className="w-full px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plug className="w-3 h-3" />
                      Connect
                    </button>
                  )}
                  <button
                    onClick={() => selectProvider(provider.id)}
                    className="p-1.5 border border-border hover:bg-muted transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Provider Details */}
      {selectedProvider && (
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">Provider Details: {providers.find(p => p.id === selectedProvider)?.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-semibold">{providers.find(p => p.id === selectedProvider)?.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Category:</span>
              <p className="font-semibold">{providers.find(p => p.id === selectedProvider)?.category}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Version:</span>
              <p className="font-semibold">{providers.find(p => p.id === selectedProvider)?.version}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Response Time:</span>
              <p className="font-semibold">{providers.find(p => p.id === selectedProvider)?.health.responseTime}ms</p>
            </div>
            <div>
              <span className="text-muted-foreground">Uptime:</span>
              <p className="font-semibold">{providers.find(p => p.id === selectedProvider)?.health.uptime}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Error Rate:</span>
              <p className="font-semibold">{providers.find(p => p.id === selectedProvider)?.health.errorRate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}