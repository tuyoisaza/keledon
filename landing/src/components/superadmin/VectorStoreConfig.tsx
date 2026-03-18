import { useState, useEffect } from 'react';
import { Database, Settings, Check, AlertCircle, RefreshCw, Eye, EyeOff, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VectorStoreConfigProps {
  onConfigChange?: () => void;
}

interface VectorStoreConfig {
  qdrantUrl: string;
  qdrantApiKey: string;
  openaiApiKey: string;
}

export default function VectorStoreConfig({ onConfigChange }: VectorStoreConfigProps) {
  const [config, setConfig] = useState<VectorStoreConfig>({
    qdrantUrl: '/qdrant',
    qdrantApiKey: '',
    openaiApiKey: '',
  });

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem('vector-store-config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      } else {
        const defaultConfig: VectorStoreConfig = {
          qdrantUrl: '/qdrant',
          qdrantApiKey: '',
          openaiApiKey: '',
        };
        setConfig(defaultConfig);
        localStorage.setItem('vector-store-config', JSON.stringify(defaultConfig));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveConfig = async (newConfig: VectorStoreConfig) => {
    setSaving(true);
    try {
      localStorage.setItem('vector-store-config', JSON.stringify(newConfig));
      setConfig(newConfig);
      toast.success('Configuration saved');
      onConfigChange?.();
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (service: 'qdrant' | 'openai') => {
    setTestResults(prev => ({ ...prev, [service]: 'testing' }));

    try {
      if (service === 'qdrant') {
        const response = await fetch(`${config.qdrantUrl}/collections`, {
          headers: config.qdrantApiKey ? { 'api-key': config.qdrantApiKey } : {},
        });
        if (!response.ok) {
          throw new Error(`Qdrant connection failed: ${response.statusText}`);
        }
        toast.success('Qdrant connection successful');
      } else if (service === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.openaiApiKey}`,
          },
        });
        if (!response.ok) {
          throw new Error(`OpenAI connection failed: ${response.statusText}`);
        }
        toast.success('OpenAI connection successful');
      }

      setTestResults(prev => ({ ...prev, [service]: 'success' }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [service]: 'error' }));
      toast.error(error instanceof Error ? error.message : 'Connection test failed');
    }
  };

  const toggleApiKeyVisibility = (field: string) => {
    setShowApiKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Vector Store Configuration</h2>
      </div>

      {/* Environment Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-primary">Production Environment</p>
            <p className="text-sm text-muted-foreground">
              Connected to Qdrant running in your Railway container at /qdrant
            </p>
          </div>
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
                onChange={(e) => setConfig({ ...config, qdrantUrl: e.target.value })}
                onBlur={() => saveConfig(config)}
                className="w-full px-3 py-2 pr-20 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                placeholder="/qdrant"
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
            <p className="text-xs text-muted-foreground mt-1">
              Default: /qdrant (internal nginx proxy)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Qdrant API Key (Optional)</label>
            <div className="relative">
              <input
                type={showApiKeys.qdrant ? 'text' : 'password'}
                value={config.qdrantApiKey}
                onChange={(e) => setConfig({ ...config, qdrantApiKey: e.target.value })}
                onBlur={() => saveConfig(config)}
                className="w-full px-3 py-2 pr-20 border border-border rounded-lg bg-muted/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                placeholder="Leave empty if no auth required"
              />
              <button
                onClick={() => toggleApiKeyVisibility('qdrant')}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
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
              onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
              onBlur={() => saveConfig(config)}
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
          <p className="text-xs text-muted-foreground mt-1">
            Required for creating document embeddings
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => saveConfig(config)}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
