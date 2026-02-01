import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '../context/SocketContext';

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

export function useIntegrationHub(socket?: Socket | null) {
  const { socket: contextSocket } = useSocket();
  const actualSocket = socket || contextSocket;
  
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!actualSocket) {
      console.warn('useIntegrationHub: No socket connection available');
      setLoading(false);
      return;
    }

    setLoading(true);

    // Request initial data
    actualSocket.emit('dashboard:get-integrations');
    actualSocket.emit('dashboard:get-connections');

    // Listen for integration updates
    const handleIntegrationsUpdate = (data: IntegrationProvider[]) => {
      setProviders(data);
      setLoading(false);
    };

    const handleConnectionsUpdate = (data: Connection[]) => {
      setConnections(data);
    };

    const handleProviderStatusUpdate = (data: { providerId: string; status: IntegrationProvider['status']; health?: IntegrationProvider['health'] }) => {
      setProviders(prev => prev.map(provider => 
        provider.id === data.providerId 
          ? {
              ...provider,
              status: data.status,
              health: data.health || provider.health,
              lastSync: data.status === 'connected' ? new Date() : provider.lastSync
            }
          : provider
      ));
    };

    const handleConnectionUpdate = (connection: Connection) => {
      setConnections(prev => {
        const index = prev.findIndex(c => c.providerId === connection.providerId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = connection;
          return updated;
        }
        return [...prev, connection];
      });
    };

    const handleHealthMetrics = (data: { providerId: string; metrics: IntegrationProvider['health'] }) => {
      setProviders(prev => prev.map(provider => 
        provider.id === data.providerId 
          ? { ...provider, health: data.metrics }
          : provider
      ));
    };

    // Register event listeners
    actualSocket.on('dashboard:integrations-update', handleIntegrationsUpdate);
    actualSocket.on('dashboard:connections-update', handleConnectionsUpdate);
    actualSocket.on('dashboard:provider-status-update', handleProviderStatusUpdate);
    actualSocket.on('dashboard:connection-update', handleConnectionUpdate);
    actualSocket.on('dashboard:health-metrics', handleHealthMetrics);

    // Cleanup on unmount
    return () => {
      actualSocket.off('dashboard:integrations-update', handleIntegrationsUpdate);
      actualSocket.off('dashboard:connections-update', handleConnectionsUpdate);
      actualSocket.off('dashboard:provider-status-update', handleProviderStatusUpdate);
      actualSocket.off('dashboard:connection-update', handleConnectionUpdate);
      actualSocket.off('dashboard:health-metrics', handleHealthMetrics);
    };
  }, [actualSocket]);

  // Control functions
  const connectProvider = (providerId: string, config?: any) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:provider-connect', { providerId, config });
    }
  };

  const disconnectProvider = (providerId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:provider-disconnect', { providerId });
    }
  };

  const testConnection = (providerId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:provider-test', { providerId });
    }
  };

  const syncProvider = (providerId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:provider-sync', { providerId });
    }
  };

  const selectProvider = (providerId: string) => {
    setSelectedProvider(selectedProvider === providerId ? null : providerId);
  };

  const clearSelection = () => {
    setSelectedProvider(null);
  };

  const setFilterValue = (filterValue: string) => {
    setFilter(filterValue);
  };

  // Computed values
  const filteredProviders = providers.filter(provider => 
    filter === 'all' || provider.category === filter
  );

  const connectedProviders = providers.filter(p => p.status === 'connected');
  const errorProviders = providers.filter(p => p.status === 'error');

  return {
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
  };
}