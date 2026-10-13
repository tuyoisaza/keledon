import { useTranslation } from '@/context/I18nContext';
import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Cpu as _Cpu, Brain, Eye, EyeOff, Mic, Volume2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/context/AuthContext';
import { getTeams, type Team } from '@/lib/crud-api';

const sttProviderOptions = [
    { id: 'vosk', nameKey: 'providers.stt.vosk', descriptionKey: 'providers.stt.voskDescription' },
    { id: 'deepgram', nameKey: 'providers.stt.deepgram', descriptionKey: 'providers.stt.deepgramDescription' },
    { id: 'speaches', nameKey: 'providers.stt.speaches', descriptionKey: 'providers.stt.speachesDescription' },
    { id: 'webspeech', nameKey: 'providers.stt.webspeech', descriptionKey: 'providers.stt.webspeechDescription' },
];

const ttsProviderOptions = [
    { id: 'elevenlabs', nameKey: 'providers.tts.elevenlabs', descriptionKey: 'providers.tts.elevenlabsDescription', needsKey: true },
    { id: 'openai-tts', nameKey: 'providers.tts.openai', descriptionKey: 'providers.tts.openaiDescription', needsKey: true },
    { id: 'speaches', nameKey: 'providers.tts.speaches', descriptionKey: 'providers.tts.speachesDescription', needsKey: false },
    { id: 'kokoro', nameKey: 'providers.tts.kokoro', descriptionKey: 'providers.tts.kokoroDescription', needsKey: false },
    { id: 'coqui', nameKey: 'providers.tts.coqui', descriptionKey: 'providers.tts.coquiDescription', needsKey: false },
    { id: 'webspeech', nameKey: 'providers.tts.webspeech', descriptionKey: 'providers.tts.webspeechDescription', needsKey: false },
];

const llmOptions = [
    { id: 'openai', nameKey: 'providers.llm.openai', icon: '🤖' },
    { id: 'google', nameKey: 'providers.llm.google', icon: '🔮' },
];

export default function ManagementProvidersPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [teamId, setTeamId] = useState<string>('');
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        loadTeamId();
    }, [user]);

    const loadTeamId = async () => {
        // Fetch teams for the dropdown first so users with an auth-context team still see/select all teams
        let allTeams: Array<Team & { _id?: string }> = [];
        try {
            const res = await apiFetch('/api/teams');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    allTeams = data;
                    setTeams(data);
                }
            }
        } catch {
            // ignore; CRUD fallback below still runs
        }

        // Fallback to CRUD API client if the REST team list route is unavailable or returns no rows.
        if (allTeams.length === 0) {
            try {
                const data = await getTeams();
                allTeams = data;
                setTeams(data);
            } catch {
                // ignore; auth-context team fallback below still runs
            }
        }

        // 1) Prefer auth context team if present
        const authTeamId = user?.teamId || user?.team_id;
        if (authTeamId) {
            setTeamId(authTeamId);
            return;
        }

        // 2) Fallback: first available team
        if (allTeams.length > 0) {
            setTeamId(allTeams[0].id || allTeams[0]._id || '');
            return;
        }

        setTeamId('');
    };

    // ── STT ──
    const [sttProvider, setSttProvider] = useState('vosk');
    const [deepgramApiKey, setDeepgramApiKey] = useState('');
    const [deepgramKeyMasked, setDeepgramKeyMasked] = useState(true);
    const [speachesApiUrl, setSpeachesApiUrl] = useState('https://speaches-production-c63f.up.railway.app');
    const [speachesApiKey, setSpeachesApiKey] = useState('');
    const [sttSaving, setSttSaving] = useState(false);

    // ── TTS ──
    const [ttsProvider, setTtsProvider] = useState('');
    const [ttsApiKey, setTtsApiKey] = useState('');
    const [ttsVoiceId, setTtsVoiceId] = useState('');
    const [ttsSaving, setTtsSaving] = useState(false);

    // ── AI / LLM ──
    const [llmProvider, setLlmProvider] = useState('google');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [openaiKeyMasked, setOpenaiKeyMasked] = useState(true);
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [googleKeyMasked, setGoogleKeyMasked] = useState(true);
    const [llmSaving, setLlmSaving] = useState(false);

    const [loading, setLoading] = useState(true);
    const configRequest = useRef(0);
    const selectedTeam = useRef(teamId);
    const [storedKeys, setStoredKeys] = useState<Record<string, boolean>>({});

    useEffect(() => {
        selectedTeam.current = teamId;
        if (!teamId) {
            setLoading(false);
            return;
        }
        loadConfigs();
    }, [teamId]);

    const loadConfigs = async () => {
        if (selectedTeam.current !== teamId) return;
        const request = ++configRequest.current;
        setLoading(true);
        setDeepgramApiKey(''); setSpeachesApiKey(''); setTtsApiKey('');
        setOpenaiApiKey(''); setGoogleApiKey(''); setStoredKeys({});
        try {
            const res = await apiFetch('/api/teams/' + teamId + '/config');
            if (!res.ok) throw new Error('Configuration unavailable');
            const d = await res.json();
            if (request !== configRequest.current || selectedTeam.current !== teamId) return;
            setStoredKeys({
                deepgram: d.deepgramConfig?.hasApiKey === true || d.deepgramApiKeySet === true,
                speaches: d.speachesApiKeySet === true,
                tts: d.ttsApiKeySet === true,
                openai: d.openaiApiKeySet === true,
                google: d.googleAiApiKeySet === true,
            });
            setSttProvider(d.sttProvider || 'vosk');
            setSpeachesApiUrl(d.speachesApiUrl || '');
            setTtsProvider(d.ttsProvider || '');
            setTtsVoiceId(d.ttsVoiceId || '');
            setLlmProvider(d.llmProvider || 'google');
            setDeepgramKeyMasked(true); setOpenaiKeyMasked(true); setGoogleKeyMasked(true);
        } catch {
            if (request === configRequest.current && selectedTeam.current === teamId) toast.error(t('providers.loadFailed'));
        } finally {
            if (request === configRequest.current && selectedTeam.current === teamId) setLoading(false);
        }
    };

    const saveSTT = async () => {
        if (!teamId) return toast.error(t('providers.noTeamSelected'));
        setSttSaving(true);
        try {
            const payload: Record<string, string> = { sttProvider };
            if (deepgramApiKey.trim()) payload.deepgramApiKey = deepgramApiKey.trim();
            if (sttProvider === 'speaches') {
                payload.speachesApiUrl = speachesApiUrl;
                if (speachesApiKey.trim()) payload.speachesApiKey = speachesApiKey.trim();
            }
            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(t('providers.saved').replace('{provider}', sttName(sttProvider)));
                await loadConfigs();
            } else toast.error(t('providers.saveFailed'));
        } catch { toast.error(t('providers.saveFailed')) }
        finally { setSttSaving(false) }
    };

    const saveTTS = async () => {
        if (!teamId) return toast.error(t('providers.noTeamSelected'));
        setTtsSaving(true);
        try {
            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify({
                    ttsProvider,
                    ...(ttsApiKey.trim() ? { ttsApiKey: ttsApiKey.trim() } : {}),
                    ttsVoiceId,
                }),
            });
            if (res.ok) { toast.success(t('providers.saved').replace('{provider}', ttsName(ttsProvider))); await loadConfigs(); }
            else toast.error(t('providers.saveFailed'));
        } catch { toast.error(t('providers.saveFailed')) }
        finally { setTtsSaving(false) }
    };

    const saveLLM = async () => {
        if (!teamId) return toast.error(t('providers.noTeamSelected'));
        setLlmSaving(true);
        try {
            const payload: Record<string, string> = { llmProvider };
            if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();
            if (googleApiKey.trim()) payload.googleAiApiKey = googleApiKey.trim();
            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(t('providers.saved').replace('{provider}', llmName(llmProvider)));
                await loadConfigs();
            } else toast.error(t('providers.saveFailed'));
        } catch { toast.error(t('providers.saveFailed')) }
        finally { setLlmSaving(false) }
    };

    // ── Helpers ──

    const sttName = (id: string) => { const option = sttProviderOptions.find(o => o.id === id); return option ? t(option.nameKey) : id; };
    const ttsName = (id: string) => { const option = ttsProviderOptions.find(o => o.id === id); return option ? t(option.nameKey) : id; };
    const llmName = (id: string) => { const option = llmOptions.find(o => o.id === id); return option ? t(option.nameKey) : id; };

    const providerCard = (
        id: string,
        label: string,
        sublabel: string | null,
        active: boolean,
        onClick: () => void,
    ) => (
        <button
            key={id}
            onClick={onClick}
            className={cn(
                'px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left flex-1 min-w-[160px]',
                active
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border bg-muted/40 text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/60',
            )}
        >
            <div className="font-medium text-[15px]">{label}</div>
            {sublabel && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{sublabel}</div>}
        </button>
    );

    const inputWithToggle = (
        value: string,
        masked: boolean,
        onChange: (v: string) => void,
        onToggle: () => void,
        placeholder: string,
        hasSavedValue: boolean,
    ) => (
        <div className="flex items-center gap-2">
            <input
                type={masked && hasSavedValue ? 'password' : 'text'}
                value={value}
                onChange={e => { onChange(e.target.value); if (masked && hasSavedValue) onToggle(); }}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
            />
            <button
                onClick={onToggle}
                className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                title={masked ? t('providers.showKey') : t('providers.hideKey')}
            >
                {masked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );

    // ── Render ──

    return (
        <div className="space-y-8 p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6" />
                    <h1 className="text-2xl font-bold">{t('providers.title')}</h1>
                </div>
                {teamId && teams.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <select
                            value={teamId}
                            onChange={(e) => { selectedTeam.current = e.target.value; setTeamId(e.target.value); }}
                            className="bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary max-w-[200px]"
                            title={t('providers.selectTeam')}
                        >
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name || t.id.slice(0, 12) + '…'}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : teamId ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {t('providers.team')}: <span className="font-mono text-foreground">{teamId.slice(0, 12)}…</span>
                    </span>
                ) : null}
            </div>

            {!teamId && !loading && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">
                    {t('providers.noTeamHelp')}
                </div>
            )}

            {loading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">{t('providers.loading')}</div>
            ) : (

            <>
            {/* ═══════════════ STT ═══════════════ */}
            <section className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-base">
                    <Mic className="w-5 h-5" />
                    {t('providers.sttTitle')}
                    <span className="ml-auto px-2 py-0.5 text-[10px] rounded bg-green-500/15 text-green-400 font-normal tracking-wider">{t('providers.database')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    {t('providers.sttHelp')} {sttProvider && teamId && (
                        <span className="text-foreground/60">{t('providers.currently')}: <span className="font-mono text-foreground">{sttName(sttProvider)}</span></span>
                    )}
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    {sttProviderOptions.map(opt =>
                        providerCard(
                            opt.id,
                            t(opt.nameKey),
                            t(opt.descriptionKey),
                            sttProvider === opt.id,
                            () => setSttProvider(opt.id),
                        )
                    )}
                </div>

                {/* Deepgram expanded config */}
                {sttProvider === 'deepgram' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">{t('providers.deepgramKey')}</label>
                        {inputWithToggle(
                            deepgramApiKey,
                            deepgramKeyMasked,
                            v => { setDeepgramApiKey(v); setDeepgramKeyMasked(false); },
                            () => setDeepgramKeyMasked(!deepgramKeyMasked),
                            t('providers.enterDeepgramKey'),
                            storedKeys.deepgram === true,
                        )}
                        {storedKeys.deepgram && !deepgramApiKey && (
                            <p className="text-[11px] text-green-400/80">✓ {t('providers.keySaved')}</p>
                        )}
                    </div>
                )}

                {/* Speaches expanded config */}
                {sttProvider === 'speaches' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">{t('providers.speachesUrl')}</label>
                        <input
                            type="text"
                            value={speachesApiUrl}
                            onChange={e => setSpeachesApiUrl(e.target.value)}
                            placeholder={t('providers.speachesUrlPlaceholder')}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                        />
                        <label className="block text-xs font-medium text-muted-foreground">{t('providers.apiKey')} {storedKeys.speaches ? `(${t('providers.savedLabel')})` : t('providers.speachesKeyOptional')}</label>
                        <input
                            type="text"
                            value={speachesApiKey}
                            onChange={e => setSpeachesApiKey(e.target.value)}
                            placeholder={t('providers.speachesKeyPlaceholder')}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                        />
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button onClick={saveSTT} disabled={sttSaving || !teamId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {sttSaving ? t('providers.saving') : t('providers.save')}
                    </button>
                    {!teamId && <span className="text-xs text-amber-400">{t('providers.signInToSave')}</span>}
                </div>
            </section>

            {/* ═══════════════ TTS ═══════════════ */}
            <section className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-base">
                    <Volume2 className="w-5 h-5" />
                    {t('providers.ttsTitle')}
                    <span className="ml-auto px-2 py-0.5 text-[10px] rounded bg-green-500/15 text-green-400 font-normal tracking-wider">{t('providers.database')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    {t('providers.ttsHelp')} {ttsProvider && teamId && (
                        <span className="text-foreground/60">{t('providers.currently')}: <span className="font-mono text-foreground">{ttsName(ttsProvider)}</span></span>
                    )}
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    {ttsProviderOptions.map(opt =>
                        providerCard(
                            opt.id,
                            t(opt.nameKey),
                            t(opt.descriptionKey),
                            ttsProvider === opt.id,
                            () => setTtsProvider(opt.id),
                        )
                    )}
                </div>

                {/* TTS expanded config */}
                {ttsProvider && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('providers.apiKeyEndpoint')}</label>
                                <input type="password" autoComplete="new-password" value={ttsApiKey}
                                    onChange={e => setTtsApiKey(e.target.value)}
                                    placeholder={storedKeys.tts ? t('providers.savedPlaceholder') : t('providers.apiKeyEndpointPlaceholder')}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('providers.voiceId')}</label>
                                <input type="text" value={ttsVoiceId}
                                    onChange={e => setTtsVoiceId(e.target.value)}
                                    placeholder={ttsProvider === 'kokoro' ? t('providers.kokoroVoices') : t('providers.voiceIdPlaceholder')}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button onClick={saveTTS} disabled={ttsSaving || !teamId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {ttsSaving ? t('providers.saving') : t('providers.save')}
                    </button>
                    {!teamId && <span className="text-xs text-amber-400">{t('providers.signInToSave')}</span>}
                </div>
            </section>

            {/* ═══════════════ AI / LLM ═══════════════ */}
            <section className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-base">
                    <Brain className="w-5 h-5" />
                    {t('providers.llmTitle')}
                    <span className="ml-auto px-2 py-0.5 text-[10px] rounded bg-green-500/15 text-green-400 font-normal tracking-wider">{t('providers.database')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    {t('providers.llmHelp')} {llmProvider && teamId && (
                        <span className="text-foreground/60">{t('providers.currently')}: <span className="font-mono text-foreground">{llmName(llmProvider)}</span></span>
                    )}
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    {llmOptions.map(opt =>
                        providerCard(
                            opt.id,
                            `${opt.icon} ${t(opt.nameKey)}`,
                            llmProvider === opt.id
                                ? (opt.id === 'openai' ? (storedKeys.openai ? `✓ ${t('providers.configured')}` : t('providers.noKeyYet')) : (storedKeys.google ? `✓ ${t('providers.configured')}` : t('providers.noKeyYet')))
                                : (opt.id === 'openai' ? (storedKeys.openai ? `✓ ${t('providers.keyOnFile')}` : t('providers.noKey')) : (storedKeys.google ? `✓ ${t('providers.keyOnFile')}` : t('providers.noKey'))),
                            llmProvider === opt.id,
                            () => setLlmProvider(opt.id),
                        )
                    )}
                </div>

                {/* LLM expanded config */}
                {llmProvider === 'openai' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">{t('providers.openaiKey')}</label>
                        {inputWithToggle(
                            openaiApiKey,
                            openaiKeyMasked,
                            v => { setOpenaiApiKey(v); setOpenaiKeyMasked(false); },
                            () => setOpenaiKeyMasked(!openaiKeyMasked),
                            t('providers.openaiKeyPlaceholder'),
                            storedKeys.openai === true,
                        )}
                        {storedKeys.openai && !openaiApiKey
                            ? <p className="text-[11px] text-green-400/80">✓ {t('providers.keySaved')}</p>
                            : <p className="text-[11px] text-muted-foreground/60">{t('providers.openaiKeyMissing')}</p>
                        }
                    </div>
                )}

                {llmProvider === 'google' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">{t('providers.googleKey')}</label>
                        {inputWithToggle(
                            googleApiKey,
                            googleKeyMasked,
                            v => { setGoogleApiKey(v); setGoogleKeyMasked(false); },
                            () => setGoogleKeyMasked(!googleKeyMasked),
                            t('providers.googleKeyPlaceholder'),
                            storedKeys.google === true,
                        )}
                        {storedKeys.google && !googleApiKey
                            ? <p className="text-[11px] text-green-400/80">✓ {t('providers.keySaved')}</p>
                            : <p className="text-[11px] text-muted-foreground/60">{t('providers.googleKeyMissing')}</p>
                        }
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button onClick={saveLLM} disabled={llmSaving || !teamId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {llmSaving ? t('providers.saving') : t('providers.save')}
                    </button>
                    {!teamId && <span className="text-xs text-amber-400">{t('providers.signInToSave')}</span>}
                </div>
            </section>
            </>)}
        </div>
    );
}
