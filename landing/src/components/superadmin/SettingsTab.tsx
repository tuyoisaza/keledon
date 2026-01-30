import { useState } from 'react';
import { AlertTriangle, Settings, Globe, Database } from 'lucide-react';
import { toast } from 'sonner';

interface ProviderConfig {
  id: string;
  type: string;
  name: string;
  status: string;
  is_enabled: boolean;
  metadata?: Record<string, any>;
}

interface VoiceProfile {
  id: string;
  name: string;
  provider_id: string;
}

interface TenantConfig {
  company_id: string;
  provider_id: string;
  provider_type: string;
  is_enabled: boolean;
}

const defaultProviderCatalog: ProviderConfig[] = [
  {
    id: 'whisper',
    type: 'stt',
    name: 'Whisper (OpenAI)',
    status: 'production',
    is_enabled: true,
    metadata: {
      endpoint: '/stt/whisper',
      sample_rate: 16000
    }
  },
  {
    id: 'deepgram',
    type: 'stt',
    name: 'Deepgram Streaming',
    status: 'production',
    is_enabled: true,
    metadata: {
      endpoint: '/stt/deepgram',
      model: 'nova-2'
    }
  },
  {
    id: 'openai-tts',
    type: 'tts',
    name: 'OpenAI TTS',
    status: 'production',
    is_enabled: true,
    metadata: {
      endpoint: '/tts/openai',
      voice: 'alloy'
    }
  }
];

export function SettingsTab() {
  const [activeTab, setActiveTab] =
    useState<'catalog' | 'tenant' | 'profiles'>('catalog');

  const [catalogState, setCatalogState] =
    useState<ProviderConfig[]>(defaultProviderCatalog);

  const [tenantConfigState] = useState<TenantConfig[]>([]);
  const [voiceProfilesState] = useState<VoiceProfile[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [loading] = useState(false);
  const [catalogError] = useState<string | null>(null);

  // Stub handlers (safe for build)
  const onSaveProviderCatalog = async () =>
    toast.success('Provider catalog saved (stub)');

  const onSaveTenantConfig = async () =>
    toast.success('Tenant config saved (stub)');

  const onSaveVoiceProfiles = async () =>
    toast.success('Voice profiles saved (stub)');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b mb-6">
        <button onClick={() => setActiveTab('catalog')}>Catalog</button>
        <button onClick={() => setActiveTab('tenant')}>Tenant</button>
        <button onClick={() => setActiveTab('profiles')}>Profiles</button>
      </div>

      {catalogError && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 flex items-center gap-2">
          <AlertTriangle />
          {catalogError}
        </div>
      )}

      {/* CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Global Providers</h2>
            <button
              onClick={onSaveProviderCatalog}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              <Globe className="inline mr-2 h-4 w-4" />
              Save
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogState.map((provider) => (
              <div
                key={provider.id}
                className="border rounded p-4 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <strong>{provider.name}</strong>
                  <input
                    type="checkbox"
                    checked={provider.is_enabled}
                    onChange={(e) =>
                      setCatalogState((prev) =>
                        prev.map((p) =>
                          p.id === provider.id
                            ? { ...p, is_enabled: e.target.checked }
                            : p
                        )
                      )
                    }
                  />
                </div>

                <pre className="text-xs bg-gray-50 p-2 rounded">
                  {JSON.stringify(provider.metadata, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TENANT */}
      {activeTab === 'tenant' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Tenant Configuration</h2>

          <input
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Company ID"
            className="border p-2 rounded w-full max-w-md"
          />

          <button
            onClick={onSaveTenantConfig}
            disabled={!companyId}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            <Database className="inline mr-2 h-4 w-4" />
            Save
          </button>
        </div>
      )}

      {/* PROFILES */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Voice Profiles</h2>

          <button
            onClick={onSaveVoiceProfiles}
            disabled={!companyId}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            <Settings className="inline mr-2 h-4 w-4" />
            Save Profiles
          </button>

          {voiceProfilesState.length === 0 && (
            <div className="text-gray-500">No profiles configured</div>
          )}
        </div>
      )}
    </div>
  );
}
