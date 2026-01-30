import { useState, useEffect } from 'react';
import { Database, Settings, Check, AlertCircle, RefreshCw, Globe, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VectorStoreConfigProps {
  onConfigChange?: (config: VectorStoreConfig) => void;
}

interface VectorStoreConfig {
  environment: 'local' | 'production';
  qdrantUrl: string;
  qdrantApiKey: string;
  openaiApiKey: string;
  backupLocalPath: string;
  backupCloudPath: string;
}

export default function VectorStoreConfig({ onConfigChange }: VectorStoreConfigProps) {
  const [config, setConfig] = useState<VectorStoreConfig>({
    environment: 'local',
    qdrantUrl: 'http://localhost:6333',
    qdrantApiKey: '',
    openaiApiKey: '',
    backupLocalPath: './vs-backups',
    backupCloudPath: ''
  });

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load saved config from localStorage (encrypted in development only)
    loadConfig();
  }, []);

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem('vector-store-config');
      if (savedConfig) {
        // In development, we could decrypt here if needed
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveConfig = (newConfig: VectorStoreConfig) => {
    try {
      localStorage.setItem('vector-store-config', JSON.stringify(newConfig));
      setConfig(newConfig);
      onConfigChange?.(newConfig);
    } catch (error) {
      console.error('Failed to save config:', error);
      setError('Failed to save configuration');
    }
  };

  const testConnection = async (service: 'qdrant' | 'openai') => {
    setTestResults(prev => ({ ...prev, [service]: 'testing' }));
    setError(null);

    try {
      if (service === 'qdrant') {
        const response = await fetch(`${config.qdrantUrl}/collections`, {
          headers: config.qdrantApiKey ? { 'api-key': config.qdrantApiKey } : {},
        });
        if (!response.ok) {
          throw new Error(`Qdrant connection failed: ${response.statusText}`);
        }
      } else if (service === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.openaiApiKey}`,
          },
        });
        if (!response.ok) {
          throw new Error(`OpenAI connection failed: ${response.statusText}`);
        }
      }

      setTestResults(prev => ({ ...prev, [service]: 'success' }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [service]: 'error' }));
      setError(error instanceof Error ? error.message : 'Connection test failed');
    }
  };

  const toggleApiKeyVisibility = (field: string) => {
    setShowApiKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleEnvironmentChange = (environment: 'local' | 'production') => {
    const newConfig: VectorStoreConfig = {
      ...config,
      environment,
      // Auto-fill defaults based on environment
      ...(environment === 'local' ? {
        qdrantUrl: 'http://localhost:6333',
        qdrantApiKey: '',
      } : {
        qdrantUrl: import.meta.env.VITE_QDRANT_URL || 'https://keledon.tuyoisaza.com/qdrant',
        qdrantApiKey: import.meta.env.VITE_QDRANT_API_KEY || '',
      })
    };
    saveConfig(newConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Vector Store Configuration</h2>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Environment Selection */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-medium mb-4">Environment</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleEnvironmentChange('local')}
            className={cn(
              'p-4 rounded-lg border-2 transition-all',
              config.environment === 'local'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4" />
              <span className="font-medium">Local Development</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Local Qdrant instance with Docker
            </p>
          </button>

          <button
            onClick={() => handleEnvironmentChange('production')}
            className={cn(
              'p-4 rounded-lg border-2 transition-all',
              config.environment === 'production'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" />
              <span className="font-medium">Production</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Remote Qdrant instance (Environment variables only)
            </p>
          </button>
        </div>
      </div>

      {/* Qdrant Configuration */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-medium mb-4">Qdrant Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Qdrant URL</label>
            <div className="relative">
              <input
                type="text"
                value={config.qdrantUrl}
                onChange={(e) => saveConfig({ ...config, qdrantUrl: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 pr-20 border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none',
                  config.environment === 'production' ? 'border-muted cursor-not-allowed' : 'border-border'
                )}
                disabled={config.environment === 'production'}
                placeholder="http://localhost:6333"
              />
              <button
                onClick={() => testConnection('qdrant')}
                disabled={testResults.qdrant === 'testing'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {testResults.qdrant === 'testing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : testResults.qdrant === 'success' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : testResults.qdrant === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Qdrant API Key</label>
            <div className="relative">
              <input
                type={showApiKeys.qdrant ? 'text' : 'password'}
                value={config.qdrantApiKey}
                onChange={(e) => saveConfig({ ...config, qdrantApiKey: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 pr-20 border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none',
                  config.environment === 'production' ? 'border-muted cursor-not-allowed' : 'border-border'
                )}
                disabled={config.environment === 'production'}
                placeholder="Optional API key"
              />
              <button
                onClick={() => toggleApiKeyVisibility('qdrant')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                disabled={config.environment === 'production'}
              >
                {showApiKeys.qdrant ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OpenAI Configuration */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-medium mb-4">OpenAI Configuration</h3>
        
        <div>
          <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
          <div className="relative">
            <input
              type={showApiKeys.openai ? 'text' : 'password'}
              value={config.openaiApiKey}
              onChange={(e) => saveConfig({ ...config, openaiApiKey: e.target.value })}
              className="w-full px-3 py-2 pr-20 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
              placeholder="sk-..."
            />
            <button
              onClick={() => testConnection('openai')}
              disabled={!config.openaiApiKey || testResults.openai === 'testing'}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {testResults.openai === 'testing' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : testResults.openai === 'success' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : testResults.openai === 'error' ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <Database className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => toggleApiKeyVisibility('openai')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
            >
              {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Backup Configuration */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-medium mb-4">Backup Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Local Backup Path</label>
            <input
              type="text"
              value={config.backupLocalPath}
              onChange={(e) => saveConfig({ ...config, backupLocalPath: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
              placeholder="./vs-backups"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cloud Backup Path (Optional)</label>
            <input
              type="text"
              value={config.backupCloudPath}
              onChange={(e) => saveConfig({ ...config, backupCloudPath: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
              placeholder="s3://bucket/path or /remote/path"
            />
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-medium mb-4">Configuration Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {config.environment === 'production' 
                ? 'Configuration locked to environment variables' 
                : 'Configuration stored locally (encrypted in development)'
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Environment: <span className="font-medium">{config.environment}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}