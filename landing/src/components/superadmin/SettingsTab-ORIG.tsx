import React, { useEffect, useMemo, useState } from 'react';
import type {
    ProviderCatalogEntry,
    ProviderType,
    TenantProviderConfig,
    TenantVoiceProfile
} from '@/lib/supabase';

type TenantConfigState = Omit<TenantProviderConfig, 'id' | 'provider_catalog' | 'created_at' | 'updated_at'> & {
    id?: string;
};

interface NewVoiceProfileState {
    name: string;
    provider_id: string;
    language: string;
    is_enabled: boolean;
    is_default: boolean;
    voiceId: string;
    speed: string;
}

interface ConfigFieldOption {
    value: string;
    label: string;
}

interface ConfigFieldDefinition {
    key: string;
    label: string;
    type: 'text' | 'number' | 'checkbox' | 'select' | 'textarea';
    placeholder?: string;
    help?: string;
    options?: ConfigFieldOption[];
}

interface SettingsTabProps {
    view?: 'full' | 'voice-profiles';
    isSuperAdmin: boolean;
    isLoading: boolean;
    error: string | null;
    companyId?: string;
    providerCatalog: ProviderCatalogEntry[];
    tenantProviderConfig: TenantProviderConfig[];
    tenantVoiceProfiles: TenantVoiceProfile[];
    onSaveProviderCatalog: (entries: ProviderCatalogEntry[]) => Promise<void>;
    onSaveTenantConfig: (entries: Omit<TenantProviderConfig, 'provider_catalog' | 'created_at' | 'updated_at'>[]) => Promise<void>;
    onSaveVoiceProfiles: (profiles: TenantVoiceProfile[]) => Promise<void>;
    onCreateVoiceProfile: (profile: Omit<TenantVoiceProfile, 'id' | 'provider_catalog' | 'created_at' | 'updated_at'>) => Promise<void>;
    onDeleteVoiceProfile: (profileId: string) => Promise<void>;
}

const TYPE_LABELS: Record<ProviderType, string> = {
    stt: 'Speech-to-Text',
    tts: 'Text-to-Speech',
    rpa: 'RPA Execution'
};

const STATUS_OPTIONS = ['production', 'experimental', 'deprecated'] as const;

const STARTUP_CONFIG_FIELDS: ConfigFieldDefinition[] = [
    { key: 'auto_start', label: 'Auto-start local service', type: 'checkbox' },
    { key: 'boot_order', label: 'Boot Order', type: 'number', placeholder: '0' },
    { key: 'start_command', label: 'Start Command', type: 'textarea', placeholder: 'npm run start:local' },
    { key: 'cwd', label: 'Working Directory', type: 'text', placeholder: 'C:\\Keldon\\service' },
    { key: 'wait_url', label: 'Wait URL', type: 'text', placeholder: 'http://localhost:9000/health' },
    { key: 'requires_api_key', label: 'Requires API Key', type: 'checkbox' },
    { key: 'required_env', label: 'Required Env Vars', type: 'text', placeholder: 'OPENAI_API_KEY,OTHER_KEY' },
];

const PROVIDER_CONFIG_SCHEMA: Record<string, ConfigFieldDefinition[]> = {
    vosk: [
        { key: 'format', label: 'Format', type: 'text', placeholder: 'audio/l16;rate=16000' },
        { key: 'sample_rate', label: 'Sample Rate', type: 'number', placeholder: '16000' },
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en' }
    ],
    whisper: [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/stt/whisper' },
        { key: 'format', label: 'Format', type: 'text', placeholder: 'audio/wav' },
        { key: 'sample_rate', label: 'Sample Rate', type: 'number', placeholder: '16000' },
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en' },
        { key: 'diarization', label: 'Diarization', type: 'checkbox' },
    ],
    deepgram: [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/stt/deepgram' },
        { key: 'model', label: 'Model', type: 'text', placeholder: 'nova-2' },
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en' },
        { key: 'diarization', label: 'Diarization', type: 'checkbox' },
    ],
    'webspeech-stt': [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/stt/webspeech' },
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en' },
    ],
    'coqui-xtts-v2': [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/tts/coqui' },
        { key: 'voice_id', label: 'Voice ID', type: 'text', placeholder: 'voice-id' },
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en' },
        { key: 'speed', label: 'Speed', type: 'number', placeholder: '1.0' },
    ],
    'qwen3-tts': [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/tts/qwen3' },
        { key: 'voice_id', label: 'Voice ID', type: 'text', placeholder: 'voice-id' },
        { key: 'voice_description', label: 'Voice Description', type: 'textarea', placeholder: 'Calm, clear, empathetic support agent' },
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en' },
        { key: 'speed', label: 'Speed', type: 'number', placeholder: '1.0' },
    ],
    'webspeech-tts': [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/tts/webspeech' },
        { key: 'voice_name', label: 'Voice Name', type: 'text', placeholder: 'Default' },
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en' },
    ],
    'native-dom': [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/rpa/native-dom' },
        {
            key: 'execution_mode',
            label: 'Execution Mode',
            type: 'select',
            options: [
                { value: 'extension', label: 'Extension' },
                { value: 'browser', label: 'Browser' },
            ]
        },
    ],
    'chrome-mv3': [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/rpa/chrome-mv3' },
        {
            key: 'execution_mode',
            label: 'Execution Mode',
            type: 'select',
            options: [
                { value: 'extension', label: 'Extension' },
                { value: 'browser', label: 'Browser' },
            ]
        },
    ],
    playwright: [
        { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/rpa/playwright' },
        { key: 'headless', label: 'Headless', type: 'checkbox' },
    ],
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
    view = 'full',
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
    onDeleteVoiceProfile
}) => {
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [catalogState, setCatalogState] = useState<ProviderCatalogEntry[]>(providerCatalog);
    const [tenantConfigState, setTenantConfigState] = useState<TenantConfigState[]>([]);
    const [voiceProfilesState, setVoiceProfilesState] = useState<TenantVoiceProfile[]>(tenantVoiceProfiles);
    const [newVoiceProfile, setNewVoiceProfile] = useState<NewVoiceProfileState>({
        name: '',
        provider_id: '',
        language: '',
        is_enabled: true,
        is_default: false,
        voiceId: '',
        speed: ''
    });
    const [expandedGlobalConfig, setExpandedGlobalConfig] = useState<Record<string, boolean>>({});
    const [expandedTenantConfig, setExpandedTenantConfig] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setCatalogState(providerCatalog);
    }, [providerCatalog]);

    useEffect(() => {
        const normalized = providerCatalog.map(provider => {
            const existing = tenantProviderConfig.find(cfg => cfg.provider_id === provider.id);
            return {
                id: existing?.id,
                company_id: existing?.company_id || companyId || '',
                provider_id: provider.id,
                provider_type: provider.type,
                is_enabled: existing?.is_enabled ?? false,
                is_default: existing?.is_default ?? false,
                limits: existing?.limits
            };
        });
        setTenantConfigState(normalized);
    }, [providerCatalog, tenantProviderConfig, companyId]);

    useEffect(() => {
        setVoiceProfilesState(tenantVoiceProfiles);
    }, [tenantVoiceProfiles]);

    const groupedCatalog = useMemo(() => {
        return catalogState.reduce((acc, entry) => {
            acc[entry.type].push(entry);
            return acc;
        }, { stt: [], tts: [], rpa: [] } as Record<ProviderType, ProviderCatalogEntry[]>);
    }, [catalogState]);

    const getGlobalDefaultProvider = (type: ProviderType) => {
        return groupedCatalog[type].find(provider =>
            provider.is_enabled &&
            provider.status === 'production' &&
            Boolean((provider.metadata as any)?.default_provider)
        );
    };

    const getProductionProviders = (type: ProviderType) => {
        return groupedCatalog[type].filter(provider => provider.is_enabled && provider.status === 'production');
    };

    const setGlobalDefaultProvider = (type: ProviderType, providerId: string) => {
        setCatalogError(null);
        setCatalogState(prev => prev.map(entry => {
            if (entry.type !== type) return entry;
            const metadata = { ...(entry.metadata || {}) } as Record<string, any>;
            const isDefault = entry.id === providerId;
            if (isDefault) metadata.default_provider = true;
            else delete metadata.default_provider;
            return {
                ...entry,
                is_enabled: isDefault ? true : entry.is_enabled,
                metadata
            };
        }));
    };

    const tenantConfigByProvider = useMemo(() => {
        return new Map(tenantConfigState.map(entry => [entry.provider_id, entry]));
    }, [tenantConfigState]);

    const enabledTenantProviders = useMemo(() => {
        return tenantConfigState.filter(entry => entry.is_enabled);
    }, [tenantConfigState]);

    const enabledTtsProviders = useMemo(() => {
        const enabledProviderIds = new Set(
            enabledTenantProviders.filter(entry => entry.provider_type === 'tts').map(entry => entry.provider_id)
        );
        return providerCatalog.filter(provider => enabledProviderIds.has(provider.id));
    }, [enabledTenantProviders, providerCatalog]);

    const showGlobalCatalog = isSuperAdmin && view !== 'voice-profiles';
    const showTenantConfig = !isSuperAdmin && view !== 'voice-profiles';
    const showVoiceProfiles = view === 'voice-profiles' || !isSuperAdmin;

    const setDefaultTenantProvider = (type: ProviderType, providerId: string) => {
        setTenantConfigState(prev => prev.map(entry => {
            if (entry.provider_type !== type) return entry;
            if (entry.provider_id === providerId) {
                return { ...entry, is_enabled: true, is_default: true };
            }
            return { ...entry, is_default: false };
        }));
    };

    const setDefaultVoiceProfile = (profileId: string) => {
        setVoiceProfilesState(prev => prev.map(profile => ({
            ...profile,
            is_default: profile.id === profileId
        })));
    };

    const handleSaveCatalog = async () => {
        const types: ProviderType[] = ['stt', 'tts', 'rpa'];
        const invalidTypes = types.filter(type => !getGlobalDefaultProvider(type));
        if (invalidTypes.length > 0) {
            setCatalogError(`Missing default provider for: ${invalidTypes.join(', ').toUpperCase()}`);
            return;
        }
        setCatalogError(null);
        await onSaveProviderCatalog(catalogState);
    };

    const handleSaveTenantConfig = async () => {
        const payload = tenantConfigState.map(({ id, ...rest }) => rest);
        await onSaveTenantConfig(payload);
    };

    const handleSaveVoiceProfiles = async () => {
        const normalized = voiceProfilesState.map(profile => ({
            ...profile,
            config: {
                ...(profile.config || {}),
                voice_id: (profile.config as any)?.voice_id || '',
                speed: (profile.config as any)?.speed || ''
            }
        }));
        await onSaveVoiceProfiles(normalized);
    };

    const handleAddVoiceProfile = async () => {
        if (!companyId) return;
        if (!newVoiceProfile.name || !newVoiceProfile.provider_id) return;

        await onCreateVoiceProfile({
            company_id: companyId,
            name: newVoiceProfile.name.trim(),
            provider_id: newVoiceProfile.provider_id,
            language: newVoiceProfile.language.trim() || undefined,
            is_enabled: newVoiceProfile.is_enabled,
            is_default: newVoiceProfile.is_default,
            config: {
                voice_id: newVoiceProfile.voiceId.trim() || undefined,
                speed: newVoiceProfile.speed ? Number(newVoiceProfile.speed) : undefined
            }
        });

        setNewVoiceProfile({
            name: '',
            provider_id: '',
            language: '',
            is_enabled: true,
            is_default: false,
            voiceId: '',
            speed: ''
        });
    };

    const toggleGlobalConfig = (providerId: string) => {
        setExpandedGlobalConfig(prev => ({ ...prev, [providerId]: !prev[providerId] }));
    };

    const toggleTenantConfig = (providerId: string) => {
        setExpandedTenantConfig(prev => ({ ...prev, [providerId]: !prev[providerId] }));
    };

    const updateGlobalConfigField = (providerId: string, key: string, value: any) => {
        setCatalogState(prev => prev.map(entry =>
            entry.id === providerId
                ? { ...entry, metadata: { ...(entry.metadata || {}), [key]: value } }
                : entry
        ));
    };

    const updateTenantConfigField = (providerId: string, key: string, value: any) => {
        setTenantConfigState(prev => prev.map(entry =>
            entry.provider_id === providerId
                ? { ...entry, limits: { ...(entry.limits || {}), [key]: value } }
                : entry
        ));
    };

    const renderConfigField = (
        providerId: string,
        field: ConfigFieldDefinition,
        config: Record<string, any>,
        onChange: (key: string, value: any) => void
    ) => {
        const rawValue = config?.[field.key];
        const displayValue = field.key === 'required_env' && Array.isArray(rawValue)
            ? rawValue.join(', ')
            : rawValue;

        if (field.type === 'checkbox') {
            return (
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={Boolean(rawValue)}
                        onChange={(e) => onChange(field.key, e.target.checked)}
                    />
                    {field.label}
                </label>
            );
        }

        if (field.type === 'select') {
            return (
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{field.label}</label>
                    <select
                        value={value ?? ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                    >
                        <option value="">Select</option>
                        {field.options?.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            );
        }

        if (field.type === 'textarea') {
            return (
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{field.label}</label>
                <textarea
                    value={displayValue ?? ''}
                    onChange={(e) => {
                        const nextValue = field.key === 'required_env'
                            ? e.target.value.split(',').map(value => value.trim()).filter(Boolean)
                            : e.target.value;
                        onChange(field.key, nextValue);
                    }}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                />
                </div>
            );
        }

        return (
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{field.label}</label>
                <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={displayValue ?? ''}
                    onChange={(e) => {
                        const nextValue = field.type === 'number'
                            ? (e.target.value === '' ? '' : Number(e.target.value))
                            : e.target.value;
                        if (field.key === 'required_env') {
                            const parsed = String(nextValue)
                                .split(',')
                                .map(value => value.trim())
                                .filter(Boolean);
                            onChange(field.key, parsed);
                            return;
                        }
                        onChange(field.key, nextValue);
                    }}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                />
            </div>
        );
    };

    const getGlobalConfigFields = (providerId: string) => [
        ...STARTUP_CONFIG_FIELDS,
        ...(PROVIDER_CONFIG_SCHEMA[providerId] || [])
    ];

    const getTenantConfigFields = (providerId: string) => PROVIDER_CONFIG_SCHEMA[providerId] || [];

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
                    {error}
                </div>
            )}

            {isLoading && (
                <div className="text-sm text-muted-foreground">Loading provider settings...</div>
            )}

            {showGlobalCatalog && (
                <div className="p-6 rounded-xl border border-border bg-card space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Global Provider Catalog</h3>
                        <p className="text-sm text-muted-foreground">Enable providers, mark maturity, and control platform availability.</p>
                    </div>

                    {catalogError && (
                        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
                            {catalogError}
                        </div>
                    )}

                    {(['stt', 'tts', 'rpa'] as ProviderType[]).map(type => (
                        <div key={type} className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">{TYPE_LABELS[type]}</h4>
                            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
                                <label className="text-xs text-muted-foreground">Default for plugins</label>
                                <select
                                    value={getGlobalDefaultProvider(type)?.id || ''}
                                    onChange={(e) => setGlobalDefaultProvider(type, e.target.value)}
                                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                >
                                    <option value="" disabled>Select default provider</option>
                                    {getProductionProviders(type).map(provider => (
                                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                                    ))}
                                </select>
                                {getProductionProviders(type).length === 0 && (
                                    <div className="text-xs text-muted-foreground">No production providers enabled yet.</div>
                                )}
                            </div>
                            {groupedCatalog[type].map(provider => (
                                <div key={provider.id} className="space-y-3">
                                    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-foreground">{provider.name}</div>
                                            <div className="text-xs text-muted-foreground">{provider.description || 'No description'}</div>
                                            {(provider.metadata as any)?.default_provider && (
                                                <div className="text-[11px] text-emerald-400 mt-1">Default for plugins</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                            <button
                                                onClick={() => toggleGlobalConfig(provider.id)}
                                                className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
                                            >
                                                {expandedGlobalConfig[provider.id] ? 'Hide Config' : 'Configure'}
                                            </button>
                                            <select
                                                value={provider.status || 'experimental'}
                                                onChange={(e) =>
                                                    setCatalogState(prev => prev.map(entry =>
                                                        entry.id === provider.id
                                                            ? { ...entry, status: e.target.value as ProviderCatalogEntry['status'] }
                                                            : entry
                                                    ))
                                                }
                                                className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                            >
                                                {STATUS_OPTIONS.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                            <label className="flex items-center gap-2 text-sm text-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={provider.is_enabled}
                                                    onChange={(e) =>
                                                        setCatalogState(prev => prev.map(entry =>
                                                            entry.id === provider.id
                                                                ? { ...entry, is_enabled: e.target.checked }
                                                                : entry
                                                        ))
                                                    }
                                                />
                                                Enabled
                                            </label>
                                        </div>
                                    </div>
                                    {expandedGlobalConfig[provider.id] && (
                                        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-3">
                                            <div className="text-sm font-semibold text-foreground">{provider.name} Configuration</div>
                                            {getGlobalConfigFields(provider.id).length === 0 ? (
                                                <div className="text-sm text-muted-foreground">No configuration fields available.</div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {getGlobalConfigFields(provider.id).map(field => (
                                                        <div key={field.key}>
                                                            {renderConfigField(
                                                                provider.id,
                                                                field,
                                                                (provider.metadata as Record<string, any>) || {},
                                                                (key, value) => updateGlobalConfigField(provider.id, key, value)
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleSaveCatalog}
                                                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                                                >
                                                    Save Config
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveCatalog}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                        >
                            Save Provider Catalog
                        </button>
                    </div>
                </div>
            )}

            {showTenantConfig && (
                <div className="p-6 rounded-xl border border-border bg-card space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Tenant Provider Configuration</h3>
                        <p className="text-sm text-muted-foreground">Select approved providers and set defaults for your organization.</p>
                    </div>

                    {(['stt', 'tts', 'rpa'] as ProviderType[]).map(type => {
                        const providers = groupedCatalog[type];
                        const enabledOptions = providers.filter(provider => {
                            const config = tenantConfigByProvider.get(provider.id);
                            return provider.is_enabled && provider.status !== 'deprecated' && config?.is_enabled;
                        });

                        const defaultProvider = tenantConfigState.find(entry => entry.provider_type === type && entry.is_default && entry.is_enabled);

                        return (
                            <div key={type} className="space-y-3">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <h4 className="text-sm font-semibold text-foreground">{TYPE_LABELS[type]}</h4>
                                    <select
                                        value={defaultProvider?.provider_id || ''}
                                        onChange={(e) => setDefaultTenantProvider(type, e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                    >
                                        <option value="" disabled>Select default</option>
                                        {enabledOptions.map(provider => (
                                            <option key={provider.id} value={provider.id}>{provider.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {providers.map(provider => {
                                    const config = tenantConfigByProvider.get(provider.id);
                                    const isGloballyEnabled = provider.is_enabled && provider.status !== 'deprecated';
                                    return (
                                        <div key={provider.id} className="space-y-3">
                                            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">{provider.name}</div>
                                                    <div className="text-xs text-muted-foreground">{provider.description || 'No description'}</div>
                                                    <div className="text-[11px] text-muted-foreground mt-1">
                                                        Status: {provider.status || 'experimental'}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                                    <button
                                                        onClick={() => toggleTenantConfig(provider.id)}
                                                        disabled={!isGloballyEnabled}
                                                        className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted disabled:opacity-50"
                                                    >
                                                        {expandedTenantConfig[provider.id] ? 'Hide Config' : 'Configure'}
                                                    </button>
                                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                                        <input
                                                            type="checkbox"
                                                            checked={config?.is_enabled || false}
                                                            disabled={!isGloballyEnabled}
                                                            onChange={(e) =>
                                                                setTenantConfigState(prev => prev.map(entry => {
                                                                    if (entry.provider_id !== provider.id) return entry;
                                                                    if (!e.target.checked) {
                                                                        return { ...entry, is_enabled: false, is_default: false };
                                                                    }
                                                                    return { ...entry, is_enabled: true };
                                                                }))
                                                            }
                                                        />
                                                        Enabled for tenant
                                                    </label>
                                                </div>
                                            </div>
                                            {expandedTenantConfig[provider.id] && (
                                                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-3">
                                                    <div className="text-sm font-semibold text-foreground">{provider.name} Configuration</div>
                                                    {getTenantConfigFields(provider.id).length === 0 ? (
                                                        <div className="text-sm text-muted-foreground">No configuration fields available.</div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {getTenantConfigFields(provider.id).map(field => (
                                                                <div key={field.key}>
                                                                    {renderConfigField(
                                                                        provider.id,
                                                                        field,
                                                                        (config?.limits as Record<string, any>) || {},
                                                                        (key, value) => updateTenantConfigField(provider.id, key, value)
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={handleSaveTenantConfig}
                                                            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                                                        >
                                                            Save Config
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveTenantConfig}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                        >
                            Save Tenant Settings
                        </button>
                    </div>
                </div>
            )}

            {showVoiceProfiles && (
                <div className="p-6 rounded-xl border border-border bg-card space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Voice Profiles</h3>
                        <p className="text-sm text-muted-foreground">Create reusable voice presets for approved TTS providers.</p>
                    </div>

                    {!companyId && (
                        <div className="text-sm text-muted-foreground">Assign a company to manage voice profiles.</div>
                    )}

                    {companyId && (
                        <>
                            {voiceProfilesState.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No voice profiles yet. Add one below.</div>
                            ) : (
                                <div className="space-y-3">
                                    {voiceProfilesState.map(profile => (
                                        <div key={profile.id} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <input
                                                    value={profile.name}
                                                    onChange={(e) =>
                                                        setVoiceProfilesState(prev => prev.map(item =>
                                                            item.id === profile.id ? { ...item, name: e.target.value } : item
                                                        ))
                                                    }
                                                    placeholder="Voice name"
                                                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                                />
                                                <select
                                                    value={profile.provider_id}
                                                    onChange={(e) =>
                                                        setVoiceProfilesState(prev => prev.map(item =>
                                                            item.id === profile.id ? { ...item, provider_id: e.target.value } : item
                                                        ))
                                                    }
                                                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                                >
                                                    <option value="" disabled>Select provider</option>
                                                    {enabledTtsProviders.map(provider => (
                                                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    value={profile.language || ''}
                                                    onChange={(e) =>
                                                        setVoiceProfilesState(prev => prev.map(item =>
                                                            item.id === profile.id ? { ...item, language: e.target.value } : item
                                                        ))
                                                    }
                                                    placeholder="Language (optional)"
                                                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <input
                                                    value={(profile.config as any)?.voice_id || ''}
                                                    onChange={(e) =>
                                                        setVoiceProfilesState(prev => prev.map(item =>
                                                            item.id === profile.id
                                                                ? {
                                                                    ...item,
                                                                    config: { ...(item.config || {}), voice_id: e.target.value }
                                                                }
                                                                : item
                                                        ))
                                                    }
                                                    placeholder="Voice ID (optional)"
                                                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                                />
                                                <input
                                                    value={(profile.config as any)?.speed || ''}
                                                    onChange={(e) =>
                                                        setVoiceProfilesState(prev => prev.map(item =>
                                                            item.id === profile.id
                                                                ? {
                                                                    ...item,
                                                                    config: { ...(item.config || {}), speed: e.target.value }
                                                                }
                                                                : item
                                                        ))
                                                    }
                                                    placeholder="Speed (optional)"
                                                    className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                                />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4">
                                                <label className="flex items-center gap-2 text-sm text-foreground">
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.is_enabled}
                                                        onChange={(e) =>
                                                            setVoiceProfilesState(prev => prev.map(item =>
                                                                item.id === profile.id
                                                                    ? {
                                                                        ...item,
                                                                        is_enabled: e.target.checked,
                                                                        is_default: e.target.checked ? item.is_default : false
                                                                    }
                                                                    : item
                                                            ))
                                                        }
                                                    />
                                                    Enabled
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-foreground">
                                                    <input
                                                        type="radio"
                                                        checked={profile.is_default}
                                                        onChange={() => setDefaultVoiceProfile(profile.id)}
                                                    />
                                                    Default voice
                                                </label>
                                                <button
                                                    onClick={() => onDeleteVoiceProfile(profile.id)}
                                                    className="text-sm text-red-400 hover:text-red-300"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-border pt-4 space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">Add voice profile</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        value={newVoiceProfile.name}
                                        onChange={(e) => setNewVoiceProfile(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Voice name"
                                        className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                    />
                                    <select
                                        value={newVoiceProfile.provider_id}
                                        onChange={(e) => setNewVoiceProfile(prev => ({ ...prev, provider_id: e.target.value }))}
                                        className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                    >
                                        <option value="" disabled>Select provider</option>
                                        {enabledTtsProviders.map(provider => (
                                            <option key={provider.id} value={provider.id}>{provider.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        value={newVoiceProfile.language}
                                        onChange={(e) => setNewVoiceProfile(prev => ({ ...prev, language: e.target.value }))}
                                        placeholder="Language (optional)"
                                        className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        value={newVoiceProfile.voiceId}
                                        onChange={(e) => setNewVoiceProfile(prev => ({ ...prev, voiceId: e.target.value }))}
                                        placeholder="Voice ID (optional)"
                                        className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                    />
                                    <input
                                        value={newVoiceProfile.speed}
                                        onChange={(e) => setNewVoiceProfile(prev => ({ ...prev, speed: e.target.value }))}
                                        placeholder="Speed (optional)"
                                        className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={newVoiceProfile.is_enabled}
                                            onChange={(e) => setNewVoiceProfile(prev => ({ ...prev, is_enabled: e.target.checked }))}
                                        />
                                        Enabled
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={newVoiceProfile.is_default}
                                            onChange={(e) => setNewVoiceProfile(prev => ({ ...prev, is_default: e.target.checked }))}
                                        />
                                        Default voice
                                    </label>
                                    <button
                                        onClick={handleAddVoiceProfile}
                                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                                    >
                                        Add Voice Profile
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveVoiceProfiles}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                                >
                                    Save Voice Profiles
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

        </div>
    );
};
