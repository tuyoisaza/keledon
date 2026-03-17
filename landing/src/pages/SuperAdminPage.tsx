import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, Tag, Users as UsersIcon, UserCircle, Plus, Search, Bug, Settings, User, LayoutGrid, Mic, Layers, Activity, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getCompanies, createCompany, updateCompany, deleteCompany,
    getBrands, createBrand, updateBrand, deleteBrand,
    getTeams, createTeam, updateTeam, deleteTeam,
    getAgents, createAgent, updateAgent, deleteAgent,
    getUsers, createUser, updateUser, deleteUser,
    addCompanyCountry, removeCompanyCountry,
    getProviderCatalog, upsertProviderCatalog,
    getTenantProviderConfig, upsertTenantProviderConfig,
    getTenantVoiceProfiles, createTenantVoiceProfile,
    updateTenantVoiceProfile, deleteTenantVoiceProfile,
    getTeamDetails,
    type Company, type Brand, type Team,
    type ProviderCatalogEntry, type ProviderType,
    type TenantProviderConfig, type TenantVoiceProfile
} from '@/lib/crud-api';
import { useAuth } from '@/context/AuthContext';
import { debugLogger } from '@/lib/debug-logger';

// Modular Components
import { EntityTable } from '@/components/superadmin/EntityTable';
import { EntityForm } from '@/components/superadmin/EntityForm';
import { SettingsTab } from '@/components/superadmin/SettingsTab-ORIG';
import FlowsPage from '@/pages/FlowsPage';
import { DebugTab } from '@/components/superadmin/DebugTab';
import { DeleteConfirmationModal } from '@/components/superadmin/DeleteConfirmationModal';
import ManagementPage from '@/pages/ManagementPage';
import VectorStoreTab from '@/components/superadmin/VectorStoreTab';

type EntityType = 'companies' | 'brands' | 'teams' | 'users' | 'agents' | 'settings' | 'voice-profiles' | 'flows' | 'debug' | 'status' | 'vector-store';

// Unified type for display
interface DisplayEntity {
    id: string;
    [key: string]: any;
}

const tabs: { id: EntityType; label: string; icon: React.ElementType }[] = [
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'brands', label: 'Brands', icon: Tag },
    { id: 'teams', label: 'Teams', icon: UsersIcon },
    { id: 'users', label: 'Users', icon: User },
    { id: 'agents', label: 'Agents', icon: UserCircle },
    { id: 'flows', label: 'Flows', icon: LayoutGrid },
    { id: 'voice-profiles', label: 'Voice Profiles', icon: Mic },
    { id: 'settings', label: 'Providers', icon: Settings },
    { id: 'vector-store', label: 'Vector Store', icon: Database },
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'status', label: 'Status', icon: Activity },
];

const defaultProviderCatalog: ProviderCatalogEntry[] = [
    {
        id: 'vosk',
        type: 'stt',
        name: 'Vosk (Local Streaming)',
        description: 'On-device streaming STT via Vosk worker',
        status: 'experimental',
        is_enabled: true,
        metadata: {
            format: 'audio/l16;rate=16000',
            sample_rate: 16000,
            language: 'en',
            execution_mode: 'local-worker'
        }
    },
    {
        id: 'whisper',
        type: 'stt',
        name: 'Whisper (OpenAI, open-weights)',
        description: 'Accurate speech recognition with open weights',
        status: 'production',
        is_enabled: true,
        metadata: {
            endpoint: '/stt/whisper',
            format: 'audio/wav',
            sample_rate: 16000,
            language: 'en',
            diarization: false
        }
    },
    {
        id: 'deepgram',
        type: 'stt',
        name: 'Deepgram',
        description: 'Low-latency streaming transcription',
        status: 'production',
        is_enabled: true,
        metadata: {
            endpoint: '/stt/deepgram',
            model: 'nova-2',
            language: 'en',
            diarization: false
        }
    },
    {
        id: 'webspeech-stt',
        type: 'stt',
        name: 'Web Speech API',
        description: 'Browser-native speech recognition',
        status: 'experimental',
        is_enabled: true,
        metadata: {
            endpoint: '/stt/webspeech',
            language: 'en'
        }
    },
    {
        id: 'coqui-xtts-v2',
        type: 'tts',
        name: 'Coqui XTTS-v2',
        description: 'Multilingual, voice cloning ready',
        status: 'production',
        is_enabled: true,
        metadata: {
            endpoint: '/tts/coqui',
            voice_id: '',
            language: 'en',
            speed: 1.0
        }
    },
    {
        id: 'qwen3-tts',
        type: 'tts',
        name: 'Qwen3-TTS',
        description: 'Qwen3 eSpeak-NG compatible TTS stack',
        status: 'experimental',
        is_enabled: true,
        metadata: {
            endpoint: '/tts/qwen3',
            voice_id: '',
            voice_description: 'Calm, clear, empathetic support agent',
            language: 'en',
            speed: 1.0
        }
    },
    {
        id: 'webspeech-tts',
        type: 'tts',
        name: 'Web Speech API',
        description: 'Browser built-in voices',
        status: 'experimental',
        is_enabled: true,
        metadata: {
            endpoint: '/tts/webspeech',
            voice_name: '',
            language: 'en'
        }
    },
    {
        id: 'native-dom',
        type: 'rpa',
        name: 'Native DOM Automation',
        description: 'Browser APIs and DOM-native execution',
        status: 'production',
        is_enabled: true,
        metadata: {
            endpoint: '/rpa/native-dom',
            execution_mode: 'extension'
        }
    },
    {
        id: 'playwright',
        type: 'rpa',
        name: 'Playwright',
        description: 'Cross-browser automation with Playwright',
        status: 'production',
        is_enabled: true,
        metadata: {
            endpoint: '/rpa/playwright',
            headless: true
        }
    },
    {
        id: 'chrome-mv3',
        type: 'rpa',
        name: 'Chrome Extensions (MV3)',
        description: 'Manifest V3 extension automation',
        status: 'experimental',
        is_enabled: true,
        metadata: {
            endpoint: '/rpa/chrome-mv3',
            execution_mode: 'extension'
        }
    }
];

const defaultProviderOrder: Record<ProviderType, string[]> = {
    stt: ['whisper', 'deepgram', 'webspeech-stt', 'vosk'],
    tts: ['coqui-xtts-v2', 'qwen3-tts', 'webspeech-tts'],
    rpa: ['native-dom', 'playwright', 'chrome-mv3']
};

const availableCountries = [
    { code: 'US', name: 'United States' },
    { code: 'MX', name: 'Mexico' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'ES', name: 'Spain' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'IT', name: 'Italy' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CO', name: 'Colombia' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'PE', name: 'Peru' },
];

export default function SuperAdminPage() {
    const { impersonateUser, isActuallySuperAdmin, user: authUser } = useAuth(); // Changed
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Filter tabs based on role
    const filteredTabs = tabs.filter(tab => {
        if (!isActuallySuperAdmin) {
            return !['companies', 'debug', 'status', 'vector-store'].includes(tab.id);
        }
        return true;
    });

    // Get tab from URL or default
    const getInitialTab = (): EntityType => {
        const tabParam = searchParams.get('tab');
        if (tabParam && tabs.some(t => t.id === tabParam)) {
            return tabParam as EntityType;
        }
        // Handle /management/providers route
        const path = window.location.pathname;
        if (path.includes('/providers')) return 'settings'; // providers tab is 'settings' in the code
        if (path.includes('/status')) return 'status';
        if (path.includes('/debug')) return 'debug';
        if (path.includes('/vector-store')) return 'vector-store';
        if (path.includes('/voice-profiles')) return 'voice-profiles';
        if (path.includes('/flows')) return 'flows';
        if (path.includes('/companies')) return 'companies';
        if (path.includes('/brands')) return 'brands';
        if (path.includes('/teams')) return 'teams';
        if (path.includes('/users')) return 'users';
        if (path.includes('/agents')) return 'agents';
        if (!isActuallySuperAdmin) return 'settings';
        return 'companies';
    };

    const [activeTab, setActiveTab] = useState<EntityType>(getInitialTab);

    // Map tab IDs to URL paths
    const getTabPath = (tabId: EntityType): string => {
        const pathMap: Record<EntityType, string> = {
            'settings': 'providers',
            'vector-store': 'vector-store',
            'debug': 'debug',
            'status': 'status',
            'flows': 'flows',
            'voice-profiles': 'voice-profiles',
            'companies': 'companies',
            'brands': 'brands',
            'teams': 'teams',
            'users': 'users',
            'agents': 'agents',
        };
        return pathMap[tabId] || tabId;
    };

    // Sync tab changes to URL
    const handleTabChange = (tabId: EntityType) => {
        setActiveTab(tabId);
        navigate(`/management/${getTabPath(tabId)}`, { replace: true });
    };

    const [data, setData] = useState<DisplayEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEntity, setEditingEntity] = useState<DisplayEntity | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Dropdown options state
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);

    // Country selection state
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

    // Team creation flow state
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');

    // Debug state
    const [debugMode, setDebugMode] = useState(() => {
        const saved = localStorage.getItem('keldon-debug-mode');
        return saved === 'true';
    });
    const [debugLogs, setDebugLogs] = useState<string>('');
    const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [modelError, setModelError] = useState<string | null>(null);

    // Subscribe to centralized logger
    useEffect(() => {
        if (!debugMode) return;

        // Initial load
        const formatLogs = (logs: any[]) => logs.map(l =>
            `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`
        ).join('\n');

        setDebugLogs(formatLogs(debugLogger.getLogs()));

        // Subscribe to updates
        const unsubscribe = debugLogger.subscribe((logs) => {
            setDebugLogs(formatLogs(logs));
        });

        return () => unsubscribe();
    }, [debugMode]);

    // Reset error when status changes
    useEffect(() => {
        if (modelStatus !== 'error') {
            setModelError(null);
        }
    }, [modelStatus]);

    // Provider Settings (global + tenant)
    const [providerCatalog, setProviderCatalog] = useState<ProviderCatalogEntry[]>(defaultProviderCatalog);
    const [tenantProviderConfig, setTenantProviderConfig] = useState<TenantProviderConfig[]>([]);
    const [tenantVoiceProfiles, setTenantVoiceProfiles] = useState<TenantVoiceProfile[]>([]);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [teamInfo, setTeamInfo] = useState<any>(null);

    // Delete confirmation modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteTargetName, setDeleteTargetName] = useState<string>('');

    // Fetch data when tab changes
    useEffect(() => {
        if (activeTab !== 'debug' && activeTab !== 'settings' && activeTab !== 'flows' && activeTab !== 'voice-profiles') {
            refreshData();
            fetchOptions();
        }
    }, [activeTab]);

    const sortProviderCatalog = (entries: ProviderCatalogEntry[]) => {
        return [...entries].sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return a.name.localeCompare(b.name);
        });
    };

    const applyTenantConfigDefaults = (
        catalog: ProviderCatalogEntry[],
        tenantConfig: TenantProviderConfig[],
        companyId: string
    ) => {
        const catalogById = new Map(catalog.map(entry => [entry.id, entry]));
        let needsUpdate = false;

        const updated = tenantConfig.map(entry => {
            const hasLimits = entry.limits && Object.keys(entry.limits || {}).length > 0;
            if (hasLimits) return entry;
            const provider = catalogById.get(entry.provider_id);
            if (!provider?.metadata) return entry;
            needsUpdate = true;
            return { ...entry, limits: provider.metadata };
        });

        return { updated, needsUpdate };
    };

    const buildTenantDefaults = (catalog: ProviderCatalogEntry[], companyId: string) => {
        const byType: Record<ProviderType, ProviderCatalogEntry[]> = {
            stt: [],
            tts: [],
            rpa: []
        };

        catalog.forEach(provider => {
            byType[provider.type].push(provider);
        });

        const defaults: Omit<TenantProviderConfig, 'id' | 'provider_catalog' | 'created_at' | 'updated_at'>[] = [];

        (Object.keys(byType) as ProviderType[]).forEach(type => {
            const providers = byType[type];
            const enabledProviders = providers.filter(p => p.is_enabled && p.status !== 'deprecated');
            const preferredDefaults = defaultProviderOrder[type] || [];
            const defaultProvider = preferredDefaults
                .map(id => enabledProviders.find(p => p.id === id))
                .find(Boolean) || enabledProviders.find(p => p.status === 'production') || enabledProviders[0];

            providers.forEach(provider => {
                defaults.push({
                    company_id: companyId,
                    provider_id: provider.id,
                    provider_type: provider.type,
                    is_enabled: provider.is_enabled && provider.status === 'production',
                    is_default: defaultProvider?.id === provider.id
                });
            });
        });

        return defaults;
    };

    const syncLocalStorageDefaults = (config: TenantProviderConfig[], catalog: ProviderCatalogEntry[]) => {
        const getDefaultProvider = (type: ProviderType) => {
            const defaultEntry = config.find(c => c.provider_type === type && c.is_default && c.is_enabled);
            if (defaultEntry) return defaultEntry.provider_id;
            const fallback = config.find(c => c.provider_type === type && c.is_enabled);
            return fallback?.provider_id;
        };

        const stt = getDefaultProvider('stt');
        const tts = getDefaultProvider('tts');
        const rpa = getDefaultProvider('rpa');

        if (stt) localStorage.setItem('keldon-stt-provider', stt);
        if (tts) localStorage.setItem('keldon-tts-provider', tts);
        if (rpa) localStorage.setItem('keldon-rpa-provider', rpa);

        if (!stt || !tts || !rpa) {
            const enabledCatalog = catalog.filter(p => p.is_enabled && p.status !== 'deprecated');
            if (!stt) {
                const fallback = enabledCatalog.find(p => p.type === 'stt');
                if (fallback) localStorage.setItem('keldon-stt-provider', fallback.id);
            }
            if (!tts) {
                const fallback = enabledCatalog.find(p => p.type === 'tts');
                if (fallback) localStorage.setItem('keldon-tts-provider', fallback.id);
            }
            if (!rpa) {
                const fallback = enabledCatalog.find(p => p.type === 'rpa');
                if (fallback) localStorage.setItem('keldon-rpa-provider', fallback.id);
            }
        }
    };

    useEffect(() => {
        if (activeTab !== 'settings') return;

        const loadSettings = async () => {
            setSettingsLoading(true);
            setSettingsError(null);
            try {
                let catalog = await getProviderCatalog();
                if (catalog.length === 0 && isActuallySuperAdmin) {
                    catalog = await upsertProviderCatalog(defaultProviderCatalog);
                }

                if (isActuallySuperAdmin) {
                    const catalogIds = new Set(catalog.map(entry => entry.id));
                    const missingDefaults = defaultProviderCatalog.filter(entry => !catalogIds.has(entry.id));
                    if (missingDefaults.length > 0) {
                        const updated = await upsertProviderCatalog(missingDefaults);
                        catalog = sortProviderCatalog([...catalog, ...updated]);
                    }
                }
                if (catalog.length === 0) {
                    catalog = defaultProviderCatalog;
                }

                catalog = sortProviderCatalog(catalog);
                setProviderCatalog(catalog);

                if (!isActuallySuperAdmin) {
                    if (!authUser?.company_id) {
                        setSettingsError('Missing company assignment for admin settings.');
                        setTenantProviderConfig([]);
                        setTenantVoiceProfiles([]);
                        return;
                    }

                    let tenantConfig = await getTenantProviderConfig(authUser.company_id);
                    if (tenantConfig.length === 0) {
                        const defaults = buildTenantDefaults(catalog, authUser.company_id);
                        if (defaults.length > 0) {
                            tenantConfig = await upsertTenantProviderConfig(defaults);
                        }
                    }

                    if (tenantConfig.length > 0) {
                        const { updated, needsUpdate } = applyTenantConfigDefaults(catalog, tenantConfig, authUser.company_id);
                        if (needsUpdate) {
                            const payload = updated.map(entry => ({
                                company_id: entry.company_id,
                                provider_id: entry.provider_id,
                                provider_type: entry.provider_type,
                                is_enabled: entry.is_enabled,
                                is_default: entry.is_default,
                                limits: entry.limits
                            }));
                            tenantConfig = await upsertTenantProviderConfig(payload);
                        } else {
                            tenantConfig = updated;
                        }
                    }

                    setTenantProviderConfig(tenantConfig);
                    const voices = await getTenantVoiceProfiles(authUser.company_id);
                    setTenantVoiceProfiles(voices);
                    syncLocalStorageDefaults(tenantConfig, catalog);
                }
            } catch (error) {
                console.error('Failed to load provider settings:', error);
                setSettingsError('Failed to load provider settings.');
                setProviderCatalog(defaultProviderCatalog);
            } finally {
                setSettingsLoading(false);
            }
        };

        loadSettings();
    }, [activeTab, isActuallySuperAdmin, authUser?.company_id]);

    useEffect(() => {
        const loadTeamInfo = async () => {
            if (!authUser?.team_id) {
                setTeamInfo(null);
                return;
            }

            try {
                const data = await getTeamDetails(authUser.team_id);
                setTeamInfo(data);
            } catch (error) {
                console.error('Failed to load team details:', error);
                setTeamInfo(null);
            }
        };

        loadTeamInfo();
    }, [authUser?.team_id]);

    // Debug helpers
    const handleDebugToggle = (enabled: boolean) => {
        setDebugMode(enabled);
        debugLogger.enable(enabled);
    };

    const addDebugLog = (message: string) => {
        debugLogger.log('info', message);
    };

    const handleSaveProviderCatalog = async (entries: ProviderCatalogEntry[]) => {
        setSettingsLoading(true);
        setSettingsError(null);
        try {
            const updated = await upsertProviderCatalog(entries);
            setProviderCatalog(sortProviderCatalog(updated));
        } catch (error) {
            console.error('Failed to save provider catalog:', error);
            setSettingsError('Failed to save provider catalog.');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleSaveTenantConfig = async (entries: Omit<TenantProviderConfig, 'provider_catalog' | 'created_at' | 'updated_at'>[]) => {
        if (!authUser?.company_id) {
            setSettingsError('Missing company assignment for admin settings.');
            return;
        }

        setSettingsLoading(true);
        setSettingsError(null);
        try {
            const updated = await upsertTenantProviderConfig(entries);
            setTenantProviderConfig(updated);
            syncLocalStorageDefaults(updated, providerCatalog);
        } catch (error) {
            console.error('Failed to save tenant provider config:', error);
            setSettingsError('Failed to save tenant provider config.');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleSaveVoiceProfiles = async (profiles: TenantVoiceProfile[]) => {
        if (!authUser?.company_id) {
            setSettingsError('Missing company assignment for voice profiles.');
            return;
        }

        setSettingsLoading(true);
        setSettingsError(null);
        try {
            for (const profile of profiles) {
                await updateTenantVoiceProfile(profile.id, {
                    name: profile.name,
                    provider_id: profile.provider_id,
                    language: profile.language,
                    is_enabled: profile.is_enabled,
                    is_default: profile.is_default,
                    config: profile.config
                });
            }
            const updated = await getTenantVoiceProfiles(authUser.company_id);
            setTenantVoiceProfiles(updated);
        } catch (error) {
            console.error('Failed to save voice profiles:', error);
            setSettingsError('Failed to save voice profiles.');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleCreateVoiceProfile = async (profile: Omit<TenantVoiceProfile, 'id' | 'provider_catalog' | 'created_at' | 'updated_at'>) => {
        if (!authUser?.company_id) {
            setSettingsError('Missing company assignment for voice profiles.');
            return;
        }

        setSettingsLoading(true);
        setSettingsError(null);
        try {
            if (profile.is_default) {
                for (const existing of tenantVoiceProfiles) {
                    if (existing.is_default) {
                        await updateTenantVoiceProfile(existing.id, { is_default: false });
                    }
                }
            }

            await createTenantVoiceProfile({
                ...profile,
                company_id: authUser.company_id
            });
            const updated = await getTenantVoiceProfiles(authUser.company_id);
            setTenantVoiceProfiles(updated);
        } catch (error) {
            console.error('Failed to create voice profile:', error);
            setSettingsError('Failed to create voice profile.');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleDeleteVoiceProfile = async (profileId: string) => {
        if (!authUser?.company_id) {
            setSettingsError('Missing company assignment for voice profiles.');
            return;
        }

        setSettingsLoading(true);
        setSettingsError(null);
        try {
            await deleteTenantVoiceProfile(profileId);
            const updated = await getTenantVoiceProfiles(authUser.company_id);
            setTenantVoiceProfiles(updated);
        } catch (error) {
            console.error('Failed to delete voice profile:', error);
            setSettingsError('Failed to delete voice profile.');
        } finally {
            setSettingsLoading(false);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            let result: any[] = [];
            const companyId = isActuallySuperAdmin ? undefined : authUser?.company_id;

            switch (activeTab) {
                case 'companies': result = await getCompanies(); break;
                case 'brands': result = await getBrands(companyId); break;
                case 'teams': result = await getTeams(companyId); break;
                case 'users': result = await getUsers(companyId); break;
                case 'agents': result = await getAgents(companyId); break;
            }
            setData(result);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const companyId = isActuallySuperAdmin ? undefined : authUser?.company_id;

            if (activeTab === 'brands' || activeTab === 'teams' || activeTab === 'users' || activeTab === 'agents') {
                const c = await getCompanies(); // Might need to filter this too or just let it be for now
                setCompanies(c);
            }
            if (activeTab === 'teams' || activeTab === 'agents' || activeTab === 'users') {
                const b = await getBrands(companyId);
                setBrands(b);
            }
            if (activeTab === 'agents' || activeTab === 'users') {
                const t = await getTeams(companyId);
                setTeams(t);
            }
            if (activeTab === 'agents') {
                const u = await getUsers(companyId);
                setUsers(u.map(user => ({ id: user.id, name: user.name, email: user.email })));
            }
        } catch (error) {
            console.error('Failed to fetch options:', error);
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const values = Object.fromEntries(formData.entries());

        try {
            if (editingEntity) {
                const id = editingEntity.id;
                switch (activeTab) {
                    case 'companies':
                        await updateCompany(id, values as any);
                        if (editingEntity.countries) {
                            const existing = editingEntity.countries.map((c: any) => c.country_code);
                            const toAdd = selectedCountries.filter(c => !existing.includes(c));
                            const toRemove = existing.filter((c: string) => !selectedCountries.includes(c));

                            await Promise.all([
                                ...toAdd.map((c: string) => addCompanyCountry(id, c)),
                                ...toRemove.map((c: string) => removeCompanyCountry(id, c))
                            ]);
                        } else {
                            await Promise.all(selectedCountries.map(c => addCompanyCountry(id, c)));
                        }
                        break;
                    case 'brands': await updateBrand(id, values as any); break;
                    case 'teams': await updateTeam(id, values as any); break;
                    case 'users': await updateUser(id, values as any); break;
                    case 'agents': await updateAgent(id, values as any); break;
                }
            } else {
                switch (activeTab) {
                    case 'companies':
                        const newCompany = await createCompany(values as any);
                        if (newCompany && selectedCountries.length > 0) {
                            await Promise.all(selectedCountries.map(c => addCompanyCountry(newCompany.id, c)));
                        }
                        break;
                    case 'brands': await createBrand(values as any); break;
                    case 'teams': await createTeam(values as any); break;
                    case 'users': await createUser(values as any); break;
                    case 'agents': await createAgent(values as any); break;
                }
            }
            setShowForm(false);
            setEditingEntity(null);
            setSelectedCountries([]);
            refreshData();
        } catch (error: any) {
            console.error('Failed to save:', error);
            alert('Failed to save entity: ' + (error.message || error));
        }
    };

    const openDeleteModal = (id: string, name: string) => {
        setDeleteTargetId(id);
        setDeleteTargetName(name);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            switch (activeTab) {
                case 'companies': await deleteCompany(deleteTargetId); break;
                case 'brands': await deleteBrand(deleteTargetId); break;
                case 'teams': await deleteTeam(deleteTargetId); break;
                case 'users': await deleteUser(deleteTargetId); break;
                case 'agents': await deleteAgent(deleteTargetId); break;
            }
            refreshData();
        } catch (error: any) {
            console.error('Failed to delete:', error);
            alert(`Failed to delete item: ${error.message || 'Unknown error'}`);
        } finally {
            setDeleteModalOpen(false);
            setDeleteTargetId(null);
            setDeleteTargetName('');
        }
    };

    const getColumns = (): { key: string; label: string; render?: (row: any) => React.ReactNode }[] => {
        switch (activeTab) {
            case 'companies': return [
                { key: 'name', label: 'NAME' },
                { key: 'industry', label: 'INDUSTRY' },
                {
                    key: 'countries',
                    label: 'COUNTRIES',
                    render: (row: any) => (
                        <div className="flex flex-wrap gap-1">
                            {row.countries && row.countries.length > 0 ? (
                                row.countries.map((c: any) => {
                                    const country = availableCountries.find(ac => ac.code === c.country_code);
                                    return (
                                        <span key={c.country_code} className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                                            {country ? country.name : c.country_code}
                                        </span>
                                    );
                                })
                            ) : (
                                <span className="text-muted-foreground text-xs italic">None</span>
                            )}
                        </div>
                    )
                }
            ];
            case 'brands': return [
                { key: 'name', label: 'NAME' },
                { key: 'companies', label: 'COMPANY', render: (row) => row.companies?.name || row.company_id },
                {
                    key: 'color', label: 'COLOR', render: (row) => (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: row.color }} />
                            <span className="text-muted-foreground font-mono text-sm">{row.color}</span>
                        </div>
                    )
                }
            ];
            case 'teams': return [
                { key: 'name', label: 'NAME' },
                { key: 'brands', label: 'BRAND', render: (row) => row.brands?.name || row.brand_id },
                { key: 'member_count', label: 'MEMBERS' }
            ];
            case 'users': return [
                { key: 'name', label: 'NAME' },
                { key: 'email', label: 'EMAIL' },
                { key: 'companies', label: 'COMPANY', render: (row: any) => row.companies?.name || row.company_id || '—' },
                { key: 'teams', label: 'TEAM', render: (row: any) => row.teams?.name || '—' },
                {
                    key: 'role', label: 'ROLE', render: (row: any) => (
                        <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            row.role === 'superadmin' ? 'bg-red-500/20 text-red-400' :
                                row.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                            {row.role}
                        </span>
                    )
                },
                {
                    key: 'is_online', label: 'STATUS', render: (row: any) => (
                        <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            row.is_online ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
                        )}>
                            {row.is_online ? '🟢 Online' : '⚫ Offline'}
                        </span>
                    )
                }
            ];
            case 'agents': return [
                { key: 'name', label: 'NAME' },
                { key: 'email', label: 'EMAIL' },
                { key: 'teams', label: 'TEAM', render: (row: any) => row.teams?.name || row.team_id || '—' },
                {
                    key: 'user_id', label: 'ASSIGNED USER', render: (row: any) => {
                        const assignedUser = users.find(u => u.id === row.user_id);
                        return assignedUser ? (
                            <span className="text-primary font-medium">{assignedUser.name}</span>
                        ) : (
                            <span className="text-muted-foreground">— Unassigned</span>
                        );
                    }
                },
                {
                    key: 'role', label: 'ROLE', render: (row: any) => (
                        <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            row.role === 'coordinator' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                            {row.role}
                        </span>
                    )
                },
                {
                    key: 'autonomy_level', label: 'AUTONOMY', render: (row: any) => (
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                                {[1, 2, 3, 4, 5].map(lvl => (
                                    <div key={lvl} className={cn(
                                        "w-2 h-2 rounded-full border border-background",
                                        (row.autonomy_level || 1) >= lvl ? "bg-primary" : "bg-muted"
                                    )} />
                                ))}
                            </div>
                            <span className="text-xs font-mono">L${row.autonomy_level || 1}</span>
                        </div>
                    )
                },
                {
                    key: 'is_active', label: 'STATUS', render: (row: any) => (
                        <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            row.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
                        )}>
                            {row.is_active ? '🟢 Active' : '⚫ Inactive'}
                        </span>
                    )
                }
            ];
            default: return [];
        }
    };

    const getFormFields = () => {
        switch (activeTab) {
            case 'companies':
                return [
                    { name: 'name', label: 'Company Name', type: 'text', required: true },
                    { name: 'industry', label: 'Industry', type: 'text' },
                ];
            case 'brands':
                return [
                    { name: 'name', label: 'Brand Name', type: 'text', required: true },
                    { name: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })), required: true },
                    { name: 'color', label: 'Color', type: 'color' }
                ];
            case 'teams':
                return [
                    { name: 'name', label: 'Team Name', type: 'text', required: true },
                    { name: 'brand_id', label: 'Brand', type: 'select', options: brands.map(b => ({ value: b.id, label: b.name })), required: true },
                ];
            case 'users':
                return [
                    { name: 'name', label: 'Full Name', type: 'text', required: true },
                    { name: 'email', label: 'Email', type: 'email', required: true },
                    { name: 'company_id', label: 'Company', type: 'select', options: companies.map(c => ({ value: c.id, label: c.name })), required: true },
                    {
                        name: 'role', label: 'Role', type: 'select', options: [
                            { value: 'user', label: 'User' },
                            { value: 'admin', label: 'Admin' },
                            { value: 'superadmin', label: 'Super Admin' }
                        ], required: true
                    }
                ];
            case 'agents':
                return [
                    { name: 'name', label: 'Agent Name', type: 'text', required: true },
                    { name: 'email', label: 'Email', type: 'email', required: true },
                    { name: 'team_id', label: 'Team', type: 'select', options: teams.map(t => ({ value: t.id, label: t.name })), required: true },
                    {
                        name: 'user_id', label: 'Assigned User', type: 'select', options: [
                            { value: '', label: '— None (Unassigned)' },
                            ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
                        ]
                    },
                    {
                        name: 'role', label: 'Role', type: 'select', options: [
                            { value: 'agent', label: 'Agent' },
                            { value: 'coordinator', label: 'Coordinator' },
                            { value: 'supervisor', label: 'Supervisor' },
                            { value: 'admin', label: 'Admin' }
                        ], required: true
                    },
                    { name: 'autonomy_level', label: 'Autonomy Level (1-5)', type: 'number', required: true, min: 1, max: 5 },
                    { name: 'policies', label: 'Policies (JSON)', type: 'textarea' }
                ];
            default: return [];
        }
    };

    const columns = getColumns();
    const formFields = getFormFields();

    const filteredData = data.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    {isActuallySuperAdmin ? 'System Configuration' : 'Company Management'}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {isActuallySuperAdmin
                        ? 'Manage companies, brands, teams, and agents'
                        : 'Manage your brands, teams, users, and agents'}
                </p>
            </div>

            {authUser && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                    <UserCircle className="w-3 h-3" />
                    <span className="font-semibold text-foreground">{authUser.name || authUser.email}</span>
                    {teamInfo && (
                        <>
                            <span className="opacity-50">/</span>
                            <Building2 className="w-3 h-3" />
                            <span className="font-semibold text-foreground">{teamInfo.brands?.companies?.name || 'Company'}</span>
                            <span className="opacity-50">/</span>
                            <Layers className="w-3 h-3" />
                            <span>{teamInfo.brands?.name || 'Brand'}</span>
                            <span className="opacity-50">/</span>
                            <span>{teamInfo.name}</span>
                        </>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
                {filteredTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            activeTab === tab.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Actions Bar and Data Table - Only show for entity tabs */}
            {activeTab !== 'debug' && activeTab !== 'settings' && activeTab !== 'flows' && activeTab !== 'voice-profiles' && activeTab !== 'vector-store' && (
                <>
                    {/* Actions Bar */}
                    <div className="flex items-center justify-between">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setEditingEntity(null);
                                setSelectedCountries([]);
                                setSelectedCompanyId(isActuallySuperAdmin ? '' : (authUser?.company_id || ''));
                                setSelectedCountryCode('');
                                setShowForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add {activeTab.slice(0, -1)}
                        </button>
                    </div>

                    <EntityTable
                        loading={loading}
                        columns={columns}
                        filteredData={filteredData}
                        activeTab={activeTab}
                        impersonateUser={impersonateUser}
                        isSuperAdmin={isActuallySuperAdmin} // Changed
                        onEdit={(row) => {
                            setEditingEntity(row);
                            if (activeTab === 'companies' && row.countries) {
                                setSelectedCountries(row.countries.map((c: any) => c.country_code));
                            }
                            if (activeTab === 'teams') {
                                const cid = row.brands?.company_id || '';
                                setSelectedCompanyId(cid);
                                setSelectedCountryCode(row.country || '');
                            }
                            if (activeTab === 'brands' || activeTab === 'users') {
                                setSelectedCompanyId(row.company_id || '');
                            }
                            setShowForm(true);
                        }}
                        onDelete={openDeleteModal}
                    />
                </>
            )}

            {/* Flows & Interfaces */}
            {activeTab === 'flows' && (
                <FlowsPage />
            )}

            {/* Voice Profiles */}
            {activeTab === 'voice-profiles' && (
                <SettingsTab
                    view="voice-profiles"
                    isSuperAdmin={isActuallySuperAdmin}
                    isLoading={settingsLoading}
                    error={settingsError}
                    companyId={authUser?.company_id}
                    providerCatalog={providerCatalog}
                    tenantProviderConfig={tenantProviderConfig}
                    tenantVoiceProfiles={tenantVoiceProfiles}
                    onSaveProviderCatalog={handleSaveProviderCatalog}
                    onSaveTenantConfig={handleSaveTenantConfig}
                    onSaveVoiceProfiles={handleSaveVoiceProfiles}
                    onCreateVoiceProfile={handleCreateVoiceProfile}
                    onDeleteVoiceProfile={handleDeleteVoiceProfile}
                />
            )}

            {/* Vector Store Tab */}
            {activeTab === 'vector-store' && (
                <VectorStoreTab />
            )}

            {/* Settings Tab Content */}
            {activeTab === 'status' && (
                <ManagementPage />
            )}

            {activeTab === 'settings' && (
                <SettingsTab
                    view="full"
                    isSuperAdmin={isActuallySuperAdmin}
                    isLoading={settingsLoading}
                    error={settingsError}
                    companyId={authUser?.company_id}
                    providerCatalog={providerCatalog}
                    tenantProviderConfig={tenantProviderConfig}
                    tenantVoiceProfiles={tenantVoiceProfiles}
                    onSaveProviderCatalog={handleSaveProviderCatalog}
                    onSaveTenantConfig={handleSaveTenantConfig}
                    onSaveVoiceProfiles={handleSaveVoiceProfiles}
                    onCreateVoiceProfile={handleCreateVoiceProfile}
                    onDeleteVoiceProfile={handleDeleteVoiceProfile}
                />
            )}

            {/* Debug Tab Content */}
            {activeTab === 'debug' && (
                <DebugTab
                    debugMode={debugMode}
                    handleDebugToggle={handleDebugToggle}
                    modelStatus={modelStatus}
                    modelError={modelError}
                    debugLogs={debugLogs}
                    setDebugLogs={setDebugLogs}
                    addDebugLog={addDebugLog}
                    setModelStatus={setModelStatus}
                />
            )}

            {/* Default state when debug mode is off */}
            {activeTab === 'debug' && !debugMode && (
                <div className="text-center py-12 text-muted-foreground">
                    <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enable debug mode to see model status and logs.</p>
                </div>
            )}

            {/* Modal Form */}
            {showForm && (
                <EntityForm
                    activeTab={activeTab}
                    editingEntity={editingEntity}
                    handleSave={handleSave}
                    onClose={() => {
                        setShowForm(false);
                        setSelectedCountries([]);
                        setSelectedCompanyId('');
                        setSelectedCountryCode('');
                    }}
                    selectedCountries={selectedCountries}
                    setSelectedCountries={setSelectedCountries}
                    availableCountries={availableCountries}
                    companies={companies}
                    brands={brands}
                    teams={teams}
                    selectedCompanyId={selectedCompanyId}
                    setSelectedCompanyId={setSelectedCompanyId}
                    selectedCountryCode={selectedCountryCode}
                    setSelectedCountryCode={setSelectedCountryCode}
                    formFields={formFields}
                    isSuperAdmin={isActuallySuperAdmin}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                targetName={deleteTargetName}
                onCancel={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
