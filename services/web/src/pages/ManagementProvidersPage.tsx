import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Check, X, Globe, ArrowUp, ArrowDown, Save, Cpu, Brain, Eye, EyeOff, Mic, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/context/AuthContext';

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

// All RPA provider IDs used in chain management
const allRpaProviderIds = Object.keys(rpaProviderInfo);

// STT provider options
const sttProviderOptions = [
    { id: 'vosk', name: 'Vosk (Local)', description: 'Local STT via Vosk server' },
    { id: 'deepgram', name: 'Deepgram', description: 'Cloud STT via Deepgram API' },
    { id: 'webspeech', name: 'Web Speech API', description: 'Browser-native speech recognition' },
];

// LLM options (only OpenAI + Gemini per user request)
const llmOptions = [
    { id: 'openai', name: 'OpenAI (GPT-4o)', icon: '🤖' },
    { id: 'google', name: 'Google Gemini 2.5 Pro', icon: '🔮' },
];

export default function ManagementProvidersPage() {
    const { user } = useAuth();
    const teamId = user?.teamId || user?.team_id || '';

    const [catalog, setCatalog] = useState<CatalogEntry[]>(defaultProviderCatalog);
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState('');
    const [rpaConfig, setRpaConfig] = useState(defaultRpaChain);
    const [rpaLoading, setRpaLoading] = useState(false);

    // TTS config
    const [ttsConfig, setTTSConfig] = useState({ providerId: 'webspeech', apiKey: '', voiceId: '' });
    const [ttsSaving, setTTSSaving] = useState(false);

    // STT config
    const [sttProvider, setSttProvider] = useState('vosk');
    const [deepgramApiKey, setDeepgramApiKey] = useState('');
    const [deepgramKeyMasked, setDeepgramKeyMasked] = useState(true);
    const [sttSaving, setSttSaving] = useState(false);

    // LLM / AI provider config
    const [llmProvider, setLlmProvider] = useState('openai');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [openaiKeyMasked, setOpenaiKeyMasked] = useState(true);
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [googleKeyMasked, setGoogleKeyMasked] = useState(true);
    const [llmSaving, setLlmSaving] = useState(false);
    const [llmLoading, setLlmLoading] = useState(false);

    useEffect(() => {
        fetchCatalog();
        fetchTTSConfig();
        if (teamId) {
            fetchTeamConfig();
        }
    }, [teamId]);

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
            const res = await apiFetch('/api/tts-config', {
                method: 'PATCH',
                body: JSON.stringify({
                    providerId: ttsConfig.providerId,
                    apiKey: ttsConfig.apiKey,
                    voiceId: ttsConfig.voiceId,
                }),
            });
            // Also persist to DB via team config
            let dbOk = true;
            if (teamId) {
                const dbRes = await apiFetch(`/api/teams/${teamId}/config`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        ttsProvider: ttsConfig.providerId,
                        ttsVoiceId: ttsConfig.voiceId,
                        ttsApiKey: ttsConfig.apiKey,
                    }),
                });
                dbOk = dbRes.ok;
            }
            if (res.ok) {
                toast.success('TTS config saved' + (teamId && dbOk ? ' ✓ DB' : ''));
            } else {
                toast.error('Failed to save TTS config');
            }
        } catch {
            toast.error('Failed to save TTS config');
        } finally {
            setTTSSaving(false);
        }
    };

    // ── Team config (load all persisted provider configs from DB) ──

    const fetchTeamConfig = async () => {
        if (!teamId) return;
        setLlmLoading(true);
        try {
            const res = await apiFetch(`/api/teams/${teamId}/config`);
            if (res.ok) {
                const data = await res.json();

                // STT provider
                if (data.sttProvider) setSttProvider(data.sttProvider);

                // TTS provider
                if (data.ttsProvider) {
                    setTTSConfig(prev => ({
                        ...prev,
                        providerId: data.ttsProvider || prev.providerId,
                        voiceId: data.ttsVoiceId || prev.voiceId,
                        apiKey: data.ttsApiKey || prev.apiKey,
                    }));
                }

                // LLM provider
                if (data.llmProvider) setLlmProvider(data.llmProvider);

                // API keys (masked — show only that they exist)
                if (data.openaiApiKey) {
                    setOpenaiApiKey(data.openaiApiKey);
                    setOpenaiKeyMasked(true);
                }
                if (data.googleAiApiKey) {
                    setGoogleApiKey(data.googleAiApiKey);
                    setGoogleKeyMasked(true);
                }
                if (data.deepgramApiKey) {
                    setDeepgramApiKey(data.deepgramApiKey);
                    setDeepgramKeyMasked(true);
                }
            }
        } catch (e) {
            console.error('Failed to fetch team config', e);
        } finally {
            setLlmLoading(false);
        }
    };

    // ── LLM / AI Provider ──

    const saveLLMProvider = async () => {
        if (!teamId) {
            toast.error('No team ID found — cannot save');
            return;
        }
        setLlmSaving(true);
        try {
            const payload: Record<string, string> = {
                llmProvider: llmProvider,
            };
            // Only include API keys if the user entered something
            if (openaiApiKey && !openaiKeyMasked) payload.openaiApiKey = openaiApiKey;
            if (googleApiKey && !googleKeyMasked) payload.googleAiApiKey = googleApiKey;

            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(`AI provider saved: ${llmProvider === 'openai' ? 'OpenAI' : 'Gemini'}`);
                // Mask keys after save
                if (openaiApiKey) setOpenaiKeyMasked(true);
                if (googleApiKey) setGoogleKeyMasked(true);
            } else {
                toast.error('Failed to save AI provider');
            }
        } catch {
            toast.error('Failed to save AI provider');
        } finally {
            setLlmSaving(false);
        }
    };

    // ── STT Provider ──

    const saveSTTProvider = async () => {
        if (!teamId) {
            toast.error('No team ID found — cannot save');
            return;
        }
        setSttSaving(true);
        try {
            const payload: Record<string, string> = {
                sttProvider: sttProvider,
            };
            // Include Deepgram key only if user entered a new one
            if (deepgramApiKey && !deepgramKeyMasked) payload.deepgramApiKey = deepgramApiKey;

            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(`STT provider saved: ${sttProvider}`);
                if (deepgramApiKey) setDeepgramKeyMasked(true);
            } else {
                toast.error('Failed to save STT provider');
            }
        } catch {
            toast.error('Failed to save STT provider');
        } finally {
            setSttSaving(false);
        }
    };

    // ── RPA ──

    const loadRpaConfig = async () => {
        if (!deviceId.trim()) return;
        setRpaLoading(true);
        try {
            const res = await apiFetch(`/api/browser/${deviceId}/rpa-config`);
            if (res.ok) {
                const data = await res.json();
                setRpaConfig({
                    chain: data.chain || defaultRpaChain.chain,
                    fallback: data.fallback ?? defaultRpaChain.fallback,
                    providers: { ...defaultRpaChain.providers, ...data.providers },
                });
                toast.success('RPA config loaded');
            } else {
                toast.error('Failed to load RPA config');
            }
        } catch {
            toast.error('Failed to load RPA config');
        } finally {
            setRpaLoading(false);
        }
    };

    const saveRpaConfig = async () => {
        if (!deviceId.trim()) return;
        setRpaLoading(true);
        try {
            const res = await apiFetch(`/api/browser/${deviceId}/rpa-config`, {
                method: 'PATCH',
                body: JSON.stringify(rpaConfig),
            });
            if (res.ok) {
                toast.success('RPA config saved');
            } else {
                toast.error('Failed to save RPA config');
            }
        } catch {
            toast.error('Failed to save RPA config');
        } finally {
            setRpaLoading(false);
        }
    };

    const moveInChain = (index: number, dir: 'up' | 'down') => {
        const chain = [...rpaConfig.chain];
        const target = dir === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= chain.length) return;
        [chain[index], chain[target]] = [chain[target], chain[index]];
        setRpaConfig(prev => ({ ...prev, chain }));
    };

    const toggleRpaProvider = (id: string) => {
        setRpaConfig(prev => {
            const providers = { ...prev.providers };
            if (!providers[id]) {
                providers[id] = { enabled: true, priority: prev.chain.length + 1, options: {} };
                return { ...prev, chain: [...prev.chain, id], providers };
            }
            const enabled = !providers[id].enabled;
            providers[id] = { ...providers[id], enabled };
            if (enabled) {
                return { ...prev, chain: [...prev.chain, id], providers };
            }
            return { ...prev, chain: prev.chain.filter(c => c !== id), providers };
        });
    };

    const toggleFallback = () => {
        setRpaConfig(prev => ({ ...prev, fallback: !prev.fallback }));
    };

    const sttProviderName = (id: string) => sttProviderOptions.find(o => o.id === id)?.name || id;
    const llmProviderName = (id: string) => llmOptions.find(o => o.id === id)?.name || id;

    // ── Render ──

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <Settings className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Management — Providers</h1>
            </div>

            {/* ────────── STT Provider ────────── */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Speech-to-Text Provider
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">DB PERSISTED</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Select which engine transcribes voice. Vosk runs locally, Deepgram is cloud-based, 
                    Web Speech API uses the browser's built-in speech recognition.
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    {sttProviderOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setSttProvider(opt.id)}
                            disabled={!teamId}
                            className={cn(
                                "px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left",
                                sttProvider === opt.id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/30",
                            )}
                        >
                            <div className="font-medium">{opt.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{opt.description}</div>
                        </button>
                    ))}
                </div>

                {/* Deepgram API key (only shown when Deepgram selected) */}
                {sttProvider === 'deepgram' && (
                    <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Deepgram API Key</label>
                        <div className="flex items-center gap-2">
                            <input
                                type={deepgramKeyMasked && deepgramApiKey ? 'password' : 'text'}
                                value={deepgramApiKey}
                                onChange={e => { setDeepgramApiKey(e.target.value); setDeepgramKeyMasked(false); }}
                                placeholder="Enter Deepgram API key..."
                                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                            />
                            <button
                                onClick={() => setDeepgramKeyMasked(!deepgramKeyMasked)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                title={deepgramKeyMasked ? 'Show key' : 'Hide key'}
                            >
                                {deepgramKeyMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {deepgramApiKey && deepgramKeyMasked && (
                            <p className="text-xs text-green-400 mt-1">✓ Key saved (hidden)</p>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button
                        onClick={saveSTTProvider}
                        disabled={sttSaving || !teamId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {sttSaving ? 'Saving...' : 'Save STT Provider'}
                    </button>
                    {!teamId && (
                        <span className="text-xs text-amber-400">Sign in to save selection</span>
                    )}
                    {sttProvider && teamId && (
                        <span className="text-xs text-muted-foreground">
                            Active: <span className="font-mono text-foreground">{sttProviderName(sttProvider)}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* ────────── TTS Configuration ────────── */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    TTS Configuration
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">DB PERSISTED</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Configure which voice engine speaks the Brain's responses.
                </p>
                <div className="flex flex-wrap gap-3 mb-4">
                    {catalog.filter(p => p.type === 'tts').map(p => (
                        <button
                            key={p.id}
                            onClick={() => setTTSConfig(prev => ({ ...prev, providerId: p.id }))}
                            className={cn(
                                "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                                ttsConfig.providerId === p.id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/30",
                            )}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            API Key / Endpoint
                        </label>
                        <input
                            type="text"
                            value={ttsConfig.apiKey}
                            onChange={e => setTTSConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="API key or endpoint URL (if required)"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                            Voice ID
                        </label>
                        <input
                            type="text"
                            value={ttsConfig.voiceId}
                            onChange={e => setTTSConfig(prev => ({ ...prev, voiceId: e.target.value }))}
                            placeholder="Voice ID (e.g. ef_dora for Kokoro)"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={saveTTSConfig}
                        disabled={ttsSaving}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {ttsSaving ? 'Saving...' : 'Save TTS Config'}
                    </button>
                    {ttsConfig.providerId && (
                        <span className="text-xs text-muted-foreground">
                            Active: <span className="font-mono text-foreground">{ttsConfig.providerId}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* ────────── AI / LLM Provider ────────── */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI / LLM Provider
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">DB PERSISTED</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Select which AI engine powers the Brain. Enter your API keys below — they will be saved
                    to the database and hidden once stored.
                </p>

                {/* OpenAI */}
                <div className={cn(
                    "mb-3 p-4 rounded-lg border transition-all",
                    llmProvider === 'openai'
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/30"
                )}>
                    <label className="flex items-center gap-3 cursor-pointer" onClick={() => setLlmProvider('openai')}>
                        <input
                            type="radio"
                            name="llm-provider"
                            checked={llmProvider === 'openai'}
                            onChange={() => setLlmProvider('openai')}
                            className="accent-primary"
                        />
                        <div>
                            <span className="font-medium text-sm">🤖 OpenAI (GPT-4o)</span>
                            {openaiApiKey && openaiKeyMasked && (
                                <span className="ml-2 text-xs text-green-400">✓ Configured</span>
                            )}
                        </div>
                    </label>
                    {llmProvider === 'openai' && (
                        <div className="mt-3 ml-6">
                            <div className="flex items-center gap-2">
                                <input
                                    type={openaiKeyMasked && openaiApiKey ? 'password' : 'text'}
                                    value={openaiApiKey}
                                    onChange={e => { setOpenaiApiKey(e.target.value); setOpenaiKeyMasked(false); }}
                                    placeholder="sk-..."
                                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                                />
                                <button
                                    onClick={() => setOpenaiKeyMasked(!openaiKeyMasked)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title={openaiKeyMasked ? 'Show key' : 'Hide key'}
                                >
                                    {openaiKeyMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {openaiApiKey && openaiKeyMasked && (
                                <p className="text-xs text-green-400 mt-1">✓ Key saved (hidden)</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Gemini */}
                <div className={cn(
                    "mb-4 p-4 rounded-lg border transition-all",
                    llmProvider === 'google'
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/30"
                )}>
                    <label className="flex items-center gap-3 cursor-pointer" onClick={() => setLlmProvider('google')}>
                        <input
                            type="radio"
                            name="llm-provider"
                            checked={llmProvider === 'google'}
                            onChange={() => setLlmProvider('google')}
                            className="accent-primary"
                        />
                        <div>
                            <span className="font-medium text-sm">🔮 Google Gemini 2.5 Pro</span>
                            {googleApiKey && googleKeyMasked && (
                                <span className="ml-2 text-xs text-green-400">✓ Configured</span>
                            )}
                        </div>
                    </label>
                    {llmProvider === 'google' && (
                        <div className="mt-3 ml-6">
                            <div className="flex items-center gap-2">
                                <input
                                    type={googleKeyMasked && googleApiKey ? 'password' : 'text'}
                                    value={googleApiKey}
                                    onChange={e => { setGoogleApiKey(e.target.value); setGoogleKeyMasked(false); }}
                                    placeholder="AIza..."
                                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                                />
                                <button
                                    onClick={() => setGoogleKeyMasked(!googleKeyMasked)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title={googleKeyMasked ? 'Show key' : 'Hide key'}
                                >
                                    {googleKeyMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {googleApiKey && googleKeyMasked && (
                                <p className="text-xs text-green-400 mt-1">✓ Key saved (hidden)</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={saveLLMProvider}
                        disabled={llmSaving || !teamId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {llmSaving ? 'Saving...' : 'Save AI Provider'}
                    </button>
                    {!teamId && (
                        <span className="text-xs text-amber-400">Sign in to save selection</span>
                    )}
                    {llmProvider && teamId && (
                        <span className="text-xs text-muted-foreground">
                            Active: <span className="font-mono text-foreground">{llmProviderName(llmProvider)}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* ────────── RPA Providers ────────── */}
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
                    {catalog
                        .filter(p => p.type === 'rpa' || p.type === 'cloud')
                        .map(p => (
                            <div
                                key={p.id}
                                className={cn(
                                    "rounded-xl border p-4 transition-colors",
                                    p.is_enabled
                                        ? "border-border bg-card"
                                        : "border-border/50 bg-muted/30 opacity-60"
                                )}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <span className={cn(
                                        "px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded",
                                        p.status === 'production'
                                            ? "bg-green-500/20 text-green-400"
                                            : p.status === 'experimental'
                                                ? "bg-yellow-500/20 text-yellow-400"
                                                : "bg-muted text-muted-foreground"
                                    )}>
                                        {p.status}
                                    </span>
                                </div>
                                <p className="text-sm font-medium">{p.name}</p>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {p.is_enabled ? (
                                        <span className="text-green-400">✓ Connected</span>
                                    ) : (
                                        <span className="text-muted-foreground">— Not connected</span>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
