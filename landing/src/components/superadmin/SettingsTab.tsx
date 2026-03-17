import { useState } from 'react';
import { AlertTriangle, Settings, Globe, Database, Save, Loader2, Trash2, Plus } from 'lucide-react';
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
  is_default?: boolean;
}

interface SettingsTabProps {
  view: 'full' | 'voice-profiles';
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  companyId?: string;
  providerCatalog: ProviderConfig[];
  tenantProviderConfig: TenantConfig[];
  tenantVoiceProfiles: VoiceProfile[];
  onSaveProviderCatalog: (catalog: ProviderConfig[]) => Promise<void>;
  onSaveTenantConfig: (config: TenantConfig[]) => Promise<void>;
  onSaveVoiceProfiles: (profiles: VoiceProfile[]) => Promise<void>;
  onCreateVoiceProfile: (profile: Omit<VoiceProfile, 'id'>) => Promise<void>;
  onDeleteVoiceProfile: (id: string) => Promise<void>;
}

export function SettingsTab({
  view,
  isSuperAdmin,
  isLoading,
  error,
  companyId,
  providerCatalog,
  tenantProviderConfig,
  tenantVoiceProfiles,
  onSaveProviderCatalog,
  onSaveTenantConfig,
  onSaveVoiceProfiles,
  onCreateVoiceProfile,
  onDeleteVoiceProfile,
}: SettingsTabProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tenant' | 'profiles'>('catalog');
  const [saving, setSaving] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileProvider, setNewProfileProvider] = useState('elevenlabs');

  const catalogState = providerCatalog.map(p => ({
    id: p.id,
    type: p.type,
    name: p.name,
    status: p.status,
    is_enabled: p.is_enabled,
    metadata: p.metadata
  }));

  const setCatalogState = (updater: ProviderConfig[] | ((prev: ProviderConfig[]) => ProviderConfig[])) => {
    // This would need to be lifted to parent in a real implementation
    console.log('Catalog update requested:', updater);
  };

  const handleSaveProviderCatalog = async () => {
    setSaving(true);
    try {
      await onSaveProviderCatalog(catalogState);
      toast.success('Provider catalog saved');
    } catch (err) {
      toast.error('Failed to save provider catalog');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTenantConfig = async () => {
    if (!companyId) {
      toast.error('No company selected');
      return;
    }
    setSaving(true);
    try {
      await onSaveTenantConfig(tenantProviderConfig);
      toast.success('Tenant config saved');
    } catch (err) {
      toast.error('Failed to save tenant config');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) {
      toast.error('Profile name required');
      return;
    }
    try {
      await onCreateVoiceProfile({ name: newProfileName, provider_id: newProfileProvider });
      setNewProfileName('');
      toast.success('Voice profile created');
    } catch (err) {
      toast.error('Failed to create profile');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Delete this voice profile?')) return;
    try {
      await onDeleteVoiceProfile(id);
      toast.success('Profile deleted');
    } catch (err) {
      toast.error('Failed to delete profile');
    }
  };

  const sttProviders = catalogState.filter(p => p.type === 'stt');
  const ttsProviders = catalogState.filter(p => p.type === 'tts');
  const rpaProviders = catalogState.filter(p => p.type === 'rpa');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {view === 'voice-profiles' ? 'Voice Profiles' : 'Settings'}
      </h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 flex items-center gap-2">
          <AlertTriangle />
          {error}
        </div>
      )}

      {isLoading && (
        <div className="mb-4 p-4 bg-blue-50 text-blue-600 flex items-center gap-2">
          <Loader2 className="animate-spin" />
          Loading settings...
        </div>
      )}

      {view === 'full' && (
        <div className="flex gap-4 border-b mb-6">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 ${activeTab === 'catalog' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
          >
            Catalog
          </button>
          <button
            onClick={() => setActiveTab('tenant')}
            className={`px-4 py-2 ${activeTab === 'tenant' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
          >
            Tenant
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 ${activeTab === 'profiles' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
          >
            Profiles
          </button>
        </div>
      )}

      {/* CATALOG */}
      {(view === 'full' && activeTab === 'catalog') && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Global Providers</h2>
            {isSuperAdmin && (
              <button
                onClick={handleSaveProviderCatalog}
                disabled={saving || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Save
              </button>
            )}
          </div>

          {sttProviders.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Speech-to-Text (STT)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sttProviders.map((provider) => (
                  <div key={provider.id} className="border rounded p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{provider.name}</strong>
                        <span className="text-xs text-gray-500 ml-2">({provider.status})</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={provider.is_enabled}
                        disabled={!isSuperAdmin}
                        onChange={(e) => {
                          if (!isSuperAdmin) return;
                          setCatalogState((prev) =>
                            prev.map((p) =>
                              p.id === provider.id
                                ? { ...p, is_enabled: e.target.checked }
                                : p
                            )
                          );
                        }}
                        className="h-4 w-4"
                      />
                    </div>
                    {provider.metadata && (
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(provider.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ttsProviders.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Text-to-Speech (TTS)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ttsProviders.map((provider) => (
                  <div key={provider.id} className="border rounded p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{provider.name}</strong>
                        <span className="text-xs text-gray-500 ml-2">({provider.status})</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={provider.is_enabled}
                        disabled={!isSuperAdmin}
                        onChange={(e) => {
                          if (!isSuperAdmin) return;
                          setCatalogState((prev) =>
                            prev.map((p) =>
                              p.id === provider.id
                                ? { ...p, is_enabled: e.target.checked }
                                : p
                            )
                          );
                        }}
                        className="h-4 w-4"
                      />
                    </div>
                    {provider.metadata && (
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(provider.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {rpaProviders.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">RPA Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rpaProviders.map((provider) => (
                  <div key={provider.id} className="border rounded p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <strong>{provider.name}</strong>
                        <span className="text-xs text-gray-500 ml-2">({provider.status})</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={provider.is_enabled}
                        disabled={!isSuperAdmin}
                        onChange={(e) => {
                          if (!isSuperAdmin) return;
                          setCatalogState((prev) =>
                            prev.map((p) =>
                              p.id === provider.id
                                ? { ...p, is_enabled: e.target.checked }
                                : p
                            )
                          );
                        }}
                        className="h-4 w-4"
                      />
                    </div>
                    {provider.metadata && (
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(provider.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TENANT */}
      {(view === 'full' && activeTab === 'tenant') && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Tenant Configuration</h2>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-4">
              Company: <strong>{companyId || 'Not selected'}</strong>
            </p>

            {tenantProviderConfig.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-medium">Active Providers</h3>
                {['stt', 'tts', 'rpa'].map((type) => {
                  const configs = tenantProviderConfig.filter(c => c.provider_type === type);
                  if (configs.length === 0) return null;
                  return (
                    <div key={type}>
                      <h4 className="text-sm font-medium text-gray-700 uppercase">{type}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                        {configs.map((config) => (
                          <div key={`${config.provider_id}-${config.company_id}`} className="bg-white p-3 rounded border">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={config.is_enabled}
                                onChange={async (e) => {
                                  const updated = tenantProviderConfig.map(c =>
                                    c.provider_id === config.provider_id && c.company_id === config.company_id
                                      ? { ...c, is_enabled: e.target.checked }
                                      : c
                                  );
                                  await onSaveTenantConfig(updated);
                                }}
                                className="h-4 w-4"
                              />
                              <span className="text-sm">{config.provider_id}</span>
                              {config.is_default && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No tenant configuration found</p>
            )}
          </div>

          <button
            onClick={handleSaveTenantConfig}
            disabled={saving || !companyId}
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Save Tenant Config
          </button>
        </div>
      )}

      {/* PROFILES */}
      {(view === 'full' || view === 'voice-profiles') && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Voice Profiles</h2>

          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Profile Name</label>
              <input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="My Voice Profile"
                className="border p-2 rounded w-64"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <select
                value={newProfileProvider}
                onChange={(e) => setNewProfileProvider(e.target.value)}
                className="border p-2 rounded w-48"
              >
                {ttsProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddProfile}
              className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Profile
            </button>
          </div>

          {tenantVoiceProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenantVoiceProfiles.map((profile) => (
                <div key={profile.id} className="border rounded p-4 flex justify-between items-center">
                  <div>
                    <strong>{profile.name}</strong>
                    <span className="text-sm text-gray-500 ml-2">({profile.provider_id})</span>
                  </div>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">No voice profiles configured</div>
          )}
        </div>
      )}
    </div>
  );
}
