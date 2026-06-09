import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Check, X, Globe, ArrowUp, ArrowDown, Save, Cpu, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

const defaultProviderCatalog = [
    { id: 'vosk', type: 'stt', name: 'Vosk (Local Streaming)', status: 'experimental', is_enabled: true },
    { id: 'whisper', type: 'stt', name: 'Whisper (OpenAI)', status: 'production', is_enabled: true },
    { id: 'deepgram', type: 'stt', name: 'Deepgram', status: 'production', is_enabled: true },
    { id: 'elevenlabs', type: 'tts', name: 'ElevenLabs', status: 'production', is_enabled: true },
    { id: 'openai-tts', type: 'tts', name: 'OpenAI TTS', status: 'production', is_enabled: true },
    { id: 'kokoro', type: 'tts', name: 'Kokoro TTS (Railway)', status: 'experimental', is_enabled: true, metadata: { requires_api_key: false, api_url: 'https://kokoro-api-production-0bfa.up.railway.app' } },
    { id: 'coqui', type: 'tts', name: 'Coqui XTTS-v2', status: 'production', is_enabled: true },
    { id: 'ui-automation', type: 'rpa', name: 'UI Automation', status: 'production', is_enabled: true },
    { id: 'browser-control', type: 'rpa', name: 'Browser Control', status: 'experimental', is_enabled: false },
    { id: 'cloud-brain', type: 'cloud', name: 'Cloud Brain', status: 'production', is_enabled: true, metadata: { api_url: 'https://keledonapi.tuyoisaza.com', ws_url: 'wss://keledonapi.tuyoisaza.com' } },
];

// Default RPA provider config (matching browser defaults)
const defaultRpaChain = {
    chain: ['testing-library-dom', 'native-dom'],
    fallback: true,
    providers: {
        'testing-library-dom': { enabled: true, priority: 1, options: { timeout: 5000 } },
        'native-dom': { enabled: true, priority: 2 },
        'ai-vision': { enabled: false, priority: 99, options: { model: 'gpt-4o' } },
    },
};

const rpaProviderInfo: Record<string, { name: string; description: string }> = {
    'testing-library-dom': { name: 'Testing Library DOM', description: 'Semantic element finding by accessible labels, roles, and text' },
    'playwright-style': { name: 'Playwright-Style Selectors', description: 'Chained selectors, XPath, data-testid, text=, and role= syntax' },
    'native-dom': { name: 'Native DOM', description: 'CSS selectors and text content matching (fallback)' },
    'ai-vision': { name: 'AI Vision (future)', description: 'LLM-powered element finding via screenshots' },
};

interface CatalogEntry {
    id: string;
    type: string;
    name: string;
    status: string;
    is_enabled: boolean;
    metadata?: Record<string, any>;
}

interface LLMProviderOption {
    id: string;
    name: string;
    available: boolean;
}

export default function ManagementProvidersPage() {
    const [catalog, setCatalog] = useState<CatalogEntry[]>(defaultProviderCatalog);
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState('');
    const [rpaConfig, setRpaConfig] = useState(defaultRpaChain);
    const [rpaLoading, setRpaLoading] = useState(false);
    const [ttsConfig, setTTSConfig] = useState({ providerId: 'webspeech', apiKey: '', voiceId: '' });
    const [ttsSaving, setTTSSaving] = useState(false);

    // LLM provider state
    const [llmProviders, setLLMProviders] = useState<LLMProviderOption[]>([]);
    const [selectedLLM, setSelectedLLM] = useState('');
    const [llmSaving, setLLMSaving] = useState(false);
    const [llmLoading, setLLMLoading] = useState(false);

    useEffect(() => {
        fetchCatalog();
        fetchTTSConfig();
        fetchLLMProviders();
        fetchActiveProviders();
    }, []);

    const fetchCatalog = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/api/provider-catalog');
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) setCatalog(data);
            }
        } catch (error) {
            console.error('Failed to fetch catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTTSConfig = async () => {
        try {
            const res = await apiFetch('/api/tts-config');
            if (res.ok) {
                const data = await res.json();
                setTTSConfig({
                    providerId: data.providerId || 'webspeech',
                    apiKey: data.apiKey || '',
                    voiceId: data.voiceId || '',
                });
            }
        } catch (e) {
            console.error('Failed to fetch TTS config', e);
        }
    };

    const saveTTSConfig = async () => {
        setTTSSaving(true);
        try {
            // Save to file-based store (existing endpoint)
            const res1 = await apiFetch('/api/tts-config', {
                method: 'PATCH',
                body: JSON.stringify({
                    providerId: ttsConfig.providerId,
                    apiKey: ttsConfig.apiKey,
                    voiceId: ttsConfig.voiceId,
                }),
            });
            // Also save to DB (persistent across restarts)
            const res2 = await apiFetch('/api/active-providers/tts', {
                method: 'PATCH',
                body: JSON.stringify({
                    providerId: ttsConfig.providerId,
                    apiKey: ttsConfig.apiKey,
                    voiceId: ttsConfig.voiceId,
                }),
            });
            if (res1.ok && res2.ok) {
                toast.success('TTS config saved (persistent)');
            } else {
                toast.error('Failed to save TTS config');
            }
        } catch {
            toast.error('Failed to save TTS config');
        } finally {
            setTTSSaving(false);
        }
    };

    const fetchLLMProviders = async () => {
        setLLMLoading(true);
        try {
            const res = await apiFetch('/api/active-providers/available-llm');
            if (res.ok) {
                const data = await res.json();
                setLLMProviders(data.providers || []);
            }
        } catch (e) {
            console.error('Failed to fetch LLM providers', e);
        } finally {
            setLLMLoading(false);
        }
    };

    const fetchActiveProviders = async () => {
        try {
            const res = await apiFetch('/api/active-providers');
            if (res.ok) {
                const data = await res.json();
                if (data.llmProviderId) {
                    setSelectedLLM(data.llmProviderId);
                } else {
                    // Auto-detect first available
                    const firstAvail = llmProviders.find(p => p.available)?.id || '';
                    if (firstAvail) setSelectedLLM(firstAvail);
                }
                if (data.ttsProviderId && ttsConfig.providerId === 'webspeech') {
                    setTTSConfig(prev => ({
                        ...prev,
                        providerId: data.ttsProviderId,
                        voiceId: data.ttsVoiceId || prev.voiceId,
                    }));
                }
            }
        } catch (e) {
            console.error('Failed to fetch active providers', e);
        }
    };

    const saveLLMConfig = async (providerId: string) => {
        setLLMSaving(true);
        try {
            const res = await apiFetch('/api/active-providers/llm', {
                method: 'PATCH',
                body: JSON.stringify({ providerId }),
            });
            if (res.ok) {
                setSelectedLLM(providerId);
                toast.success(`AI provider set to ${llmProviders.find(p => p.id === providerId)?.name || providerId}`);
            } else {
                const err = await res.text();
                toast.error(`Failed to save: ${err}`);
            }
        } catch {
            toast.error('Failed to save LLM provider selection');
        } finally {
            setLLMSaving(false);
        }
    };

    const loadRpaConfig = async () => {
        if (!deviceId.trim()) {
            toast.error('Enter a device ID first');
            return;
        }
        setRpaLoading(true);
        try {
            const res = await apiFetch(`/api/devices/${encodeURIComponent(deviceId.trim())}/rpa-config`);
            if (res.ok) {
                const data = await res.json();
                setRpaConfig(data);
                toast.success('RPA config loaded');
            } else {
                toast.error('Failed to load — using defaults');
            }
        } catch {
            toast.error('Failed to load RPA config');
        } finally {
            setRpaLoading(false);
        }
    };

    const saveRpaConfig = async () => {
        if (!deviceId.trim()) {
            toast.error('Enter a device ID first');
            return;
        }
        setRpaLoading(true);
        try {
            const res = await apiFetch(`/api/devices/${encodeURIComponent(deviceId.trim())}/rpa-config`, {
                method: 'PUT',
                body: JSON.stringify(rpaConfig),
            });
            if (res.ok) {
                toast.success('RPA provider config saved');
            } else {
                toast.error('Failed to save');
            }
        } catch {
            toast.error('Failed to save RPA config');
        } finally {
            setRpaLoading(false);
        }
    };

    const moveInChain = (index: number, direction: 'up' | 'down') => {
        const chain = [...rpaConfig.chain];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= chain.length) return;
        [chain[index], chain[target]] = [chain[target], chain[index]];
        setRpaConfig({ ...rpaConfig, chain });
    };

    const toggleRpaProvider = (id: string) => {
        const providers = { ...rpaConfig.providers };
        if (providers[id]) {
            providers[id] = { ...providers[id], enabled: !providers[id].enabled };
        } else {
            providers[id] = { enabled: true, priority: rpaConfig.chain.length + 1 };
        }
        // Update chain
        const chain = [...rpaConfig.chain];
        if (providers[id].enabled && !chain.includes(id)) {
            chain.push(id);
        } else if (!providers[id].enabled) {
            const idx = chain.indexOf(id);
            if (idx >= 0) chain.splice(idx, 1);
        }
        setRpaConfig({ ...rpaConfig, chain, providers });
    };

    const toggleFallback = () => {
        setRpaConfig({ ...rpaConfig, fallback: !rpaConfig.fallback });
    };

    const toggleProvider = async (id: string) => {
        const updated = catalog.map(p =>
            p.id === id ? { ...p, is_enabled: !p.is_enabled } : p
        );
        setCatalog(updated);
    };

    const sttProviders = catalog.filter(p => p.type === 'stt');
    const ttsProviders = catalog.filter(p => p.type === 'tts');
    const rpaProviders = catalog.filter(p => p.type === 'rpa');
    const cloudProviders = catalog.filter(p => p.type === 'cloud');

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'production': return 'bg-green-500/20 text-green-400';
            case 'experimental': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const allRpaProviderIds = [...new Set([...rpaConfig.chain, ...Object.keys(rpaConfig.providers), ...Object.keys(rpaProviderInfo)])];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Providers</h1>
                        <p className="text-muted-foreground">Configure STT, TTS, AI (LLM), and RPA providers</p>
                    </div>
                </div>
                <button onClick={fetchCatalog} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Refresh">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* AI / LLM Provider Selection */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI / LLM Provider
                    <button
                        onClick={fetchLLMProviders}
                        className="p-1 hover:bg-muted rounded transition-colors ml-1"
                        title="Refresh available providers"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", llmLoading && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => saveLLMConfig(selectedLLM)}
                        disabled={llmSaving || !selectedLLM}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {llmSaving ? 'Saving...' : 'Save AI Provider'}
                    </button>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Select which AI provider the Brain uses for responses. Only providers with an API key configured in Railway are shown.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {llmProviders.map((provider) => (
                        <div
                            key={provider.id}
                            className={cn(
                                "p-4 rounded-lg border transition-colors",
                                !provider.available && "opacity-40 cursor-not-allowed",
                                selectedLLM === provider.id && provider.available
                                    ? "border-primary bg-primary/10 cursor-pointer"
                                    : provider.available
                                    ? "border-border bg-muted/50 hover:bg-muted cursor-pointer"
                                    : "border-border bg-muted/30"
                            )}
                            onClick={() => {
                                if (provider.available) {
                                    setSelectedLLM(provider.id);
                                } else {
                                    toast.error(`${provider.name} not available — no API key configured`);
                                }
                            }}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium">{provider.name}</span>
                                    {!provider.available && (
                                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                                            No key
                                        </span>
                                    )}
                                </div>
                                {selectedLLM === provider.id && provider.available && (
                                    <Check className="w-5 h-5 text-primary" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {provider.available ? 'Ready' : 'Not configured'}
                            </p>
                        </div>
                    ))}
                    {llmProviders.length === 0 && !llmLoading && (
                        <p className="text-sm text-muted-foreground col-span-full">No LLM providers detected. Configure an API key in Railway environment variables.</p>
                    )}
                    {llmLoading && (
                        <p className="text-sm text-muted-foreground col-span-full">Loading available providers...</p>
                    )}
                </div>
            </div>

            {/* STT Providers */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Speech-to-Text (STT)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sttProviders.map((provider) => (
                        <div key={provider.id} className={cn(
                            "p-4 rounded-lg border transition-colors",
                            provider.is_enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/50"
                        )}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium">{provider.name}</span>
                                    <span className={cn("ml-2 px-2 py-0.5 text-xs rounded", getStatusBadge(provider.status))}>
                                        {provider.status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleProvider(provider.id)}
                                    className={cn(
                                        "p-1 rounded transition-colors",
                                        provider.is_enabled ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {provider.is_enabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">ID: {provider.id}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* TTS Providers */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Text-to-Speech (TTS)
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">DB persisted</span>
                    <button
                        onClick={saveTTSConfig}
                        disabled={ttsSaving}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {ttsSaving ? 'Saving...' : 'Save TTS Config'}
                    </button>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Select TTS provider and configure. Selections now persist in the database across deployments.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ttsProviders.map((provider) => (
                        <div
                            key={provider.id}
                            className={cn(
                                "p-4 rounded-lg border transition-colors cursor-pointer",
                                ttsConfig.providerId === provider.id ? "border-primary bg-primary/10" : "border-border bg-muted/50 hover:bg-muted"
                            )}
                            onClick={() => setTTSConfig(prev => ({ ...prev, providerId: provider.id }))}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium">{provider.name}</span>
                                    <span className={cn("ml-2 px-2 py-0.5 text-xs rounded", getStatusBadge(provider.status))}>
                                        {provider.status}
                                    </span>
                                </div>
                                {ttsConfig.providerId === provider.id && (
                                    <Check className="w-5 h-5 text-primary" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">ID: {provider.id}</p>
                            {ttsConfig.providerId === provider.id && provider.metadata?.requires_api_key !== false && (
                                <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                                    <div>
                                        <label className="text-xs text-muted-foreground">API Key</label>
                                        <input
                                            type="password"
                                            value={ttsConfig.apiKey}
                                            onChange={e => setTTSConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                            placeholder="Enter API key..."
                                            className="w-full mt-1 px-2 py-1.5 text-sm rounded border border-border bg-background focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                    {provider.id === 'elevenlabs' && (
                                        <div>
                                            <label className="text-xs text-muted-foreground">Voice ID (optional)</label>
                                            <input
                                                type="text"
                                                value={ttsConfig.voiceId}
                                                onChange={e => setTTSConfig(prev => ({ ...prev, voiceId: e.target.value }))}
                                                placeholder="pFZP5JQG7iQjIQuC4Bku"
                                                className="w-full mt-1 px-2 py-1.5 text-sm rounded border border-border bg-background focus:border-primary focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            {ttsConfig.providerId === provider.id && provider.id === 'kokoro' && (
                                <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Voice</label>
                                        <select
                                            value={ttsConfig.voiceId || 'ef_dora'}
                                            onChange={e => setTTSConfig(prev => ({ ...prev, voiceId: e.target.value }))}
                                            className="w-full mt-1 px-2 py-1.5 text-sm rounded border border-border bg-background focus:border-primary focus:outline-none"
                                        >
                                            <option value="ef_dora">Dora (Spanish, female)</option>
                                            <option value="em_alex">Alex (Spanish, male)</option>
                                            <option value="em_santa">Santa (Spanish, male)</option>
                                            <option value="af_bella">Bella (English, female)</option>
                                            <option value="am_adam">Adam (English, male)</option>
                                            <option value="af_sky">Sky (English, female)</option>
                                            <option value="af_nova">Nova (English, female)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">API URL</label>
                                        <input
                                            type="text"
                                            value={ttsConfig.apiKey || provider.metadata?.api_url || ''}
                                            onChange={e => setTTSConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                            placeholder="https://kokoro-api-production-0bfa.up.railway.app"
                                            className="w-full mt-1 px-2 py-1.5 text-sm rounded border border-border bg-background focus:border-primary focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Self-hosted Kokoro API on Railway. No API key needed.</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* RPA Providers — Execution Engine */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    RPA Execution Providers
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">NEW</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Configure which provider(s) the browser uses to find elements on pages.
                    Providers are tried in chain order until one succeeds.
                </p>

                {/* Device selector */}
                <div className="flex items-center gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="Device ID (e.g. cc2b59...)"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                        onClick={loadRpaConfig}
                        disabled={rpaLoading}
                        className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                        Load
                    </button>
                    <button
                        onClick={saveRpaConfig}
                        disabled={rpaLoading}
                        className="px-3 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-sm transition-colors flex items-center gap-1"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                </div>

                {/* Provider chain */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Provider Chain (priority order)</label>
                    {rpaConfig.chain.map((id, index) => {
                        const info = rpaProviderInfo[id] || { name: id, description: '' };
                        const cfg = rpaConfig.providers[id] || { enabled: true, priority: index + 1, options: {} };
                        return (
                            <div
                                key={id}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                    cfg.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-60"
                                )}
                            >
                                <span className="text-xs font-mono text-muted-foreground w-6 text-right">
                                    #{index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{info.name}</span>
                                        <span className="text-xs text-muted-foreground font-mono">({id})</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => moveInChain(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-30"
                                        title="Move up in priority"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => moveInChain(index, 'down')}
                                        disabled={index === rpaConfig.chain.length - 1}
                                        className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-30"
                                        title="Move down in priority"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => toggleRpaProvider(id)}
                                        className={cn(
                                            "p-1 rounded transition-colors",
                                            cfg.enabled ? "text-primary" : "text-muted-foreground"
                                        )}
                                        title={cfg.enabled ? 'Disable' : 'Enable'}
                                    >
                                        {cfg.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Available but not in chain */}
                {allRpaProviderIds.filter(id => !rpaConfig.chain.includes(id) || !rpaConfig.providers[id]?.enabled).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Available Providers</label>
                        <div className="flex flex-wrap gap-2">
                            {allRpaProviderIds.filter(id => !rpaConfig.chain.includes(id) || !rpaConfig.providers[id]?.enabled).map(id => {
                                const info = rpaProviderInfo[id] || { name: id, description: '' };
                                return (
                                    <button
                                        key={id}
                                        onClick={() => toggleRpaProvider(id)}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors"
                                    >
                                        + {info.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Options */}
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                    <button
                        onClick={toggleFallback}
                        className={cn(
                            "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                            rpaConfig.fallback
                                ? "border-primary/50 bg-primary/5 text-primary"
                                : "border-border bg-muted/30 text-muted-foreground"
                        )}
                    >
                        {rpaConfig.fallback ? '✓ Fallback enabled' : '✗ Fallback disabled'}
                    </button>
                    <span className="text-xs text-muted-foreground">
                        When enabled, if the first provider fails, try the next in chain
                    </span>
                </div>
            </div>

            {/* Legacy RPA Providers (catalog) */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    RPA Provider Catalog
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Legacy RPA provider readiness (from system catalog)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rpaProviders.map((provider) => (
                        <div key={provider.id} className={cn(
                            "p-4 rounded-lg border transition-colors",
                            provider.is_enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/50"
                        )}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium">{provider.name}</span>
                                    <span className={cn("ml-2 px-2 py-0.5 text-xs rounded", getStatusBadge(provider.status))}>
                                        {provider.status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleProvider(provider.id)}
                                    className={cn(
                                        "p-1 rounded transition-colors",
                                        provider.is_enabled ? "text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    {provider.is_enabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">ID: {provider.id}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cloud Brain */}
            {cloudProviders.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Cloud Brain
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        API and WebSocket URL for the KELEDON Brain service. The frontend uses these to connect to the cloud.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cloudProviders.map((provider) => (
                            <div key={provider.id} className={cn(
                                "p-4 rounded-lg border transition-colors",
                                provider.is_enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/50"
                            )}>
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="font-medium">{provider.name}</span>
                                        <span className={cn("ml-2 px-2 py-0.5 text-xs rounded", getStatusBadge(provider.status))}>
                                            {provider.status}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => toggleProvider(provider.id)}
                                        className={cn(
                                            "p-1 rounded transition-colors",
                                            provider.is_enabled ? "text-primary" : "text-muted-foreground"
                                        )}
                                    >
                                        {provider.is_enabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="space-y-2 mt-3">
                                    <div>
                                        <label className="text-xs text-muted-foreground">API URL</label>
                                        <div className="text-sm font-mono truncate bg-muted px-2 py-1 rounded mt-1">
                                            {provider.metadata?.api_url || 'https://keledonapi.tuyoisaza.com'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">WebSocket URL</label>
                                        <div className="text-sm font-mono truncate bg-muted px-2 py-1 rounded mt-1">
                                            {provider.metadata?.ws_url || 'wss://keledonapi.tuyoisaza.com'}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">ID: {provider.id}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
