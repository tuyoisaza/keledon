import { useState, useEffect } from 'react';
import { Settings, Save, Cpu, Brain, Eye, EyeOff, Mic, Volume2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { useAuth } from '@/context/AuthContext';
import { getTeams, type Team } from '@/lib/crud-api';

const sttProviderOptions = [
    { id: 'vosk', name: 'Vosk (Local)', description: 'Local STT via Vosk server' },
    { id: 'deepgram', name: 'Deepgram', description: 'Cloud STT via Deepgram API' },
    { id: 'speaches', name: 'Speaches (Whisper)', description: 'OpenAI-compatible Whisper STT on Railway (no API key needed if public)' },
    { id: 'webspeech', name: 'Web Speech API', description: 'Browser-native speech recognition' },
];

const ttsProviderOptions = [
    { id: 'elevenlabs', name: 'ElevenLabs', description: 'Cloud TTS via ElevenLabs API', needsKey: true },
    { id: 'openai-tts', name: 'OpenAI TTS', description: 'Cloud TTS via OpenAI API', needsKey: true },
    { id: 'kokoro', name: 'Kokoro TTS', description: 'Self-hosted on Railway (no API key needed)', needsKey: false },
    { id: 'coqui', name: 'Coqui XTTS-v2', description: 'Local Coqui XTTS-v2', needsKey: false },
    { id: 'webspeech', name: 'Browser Speech', description: 'Browser-native speech synthesis', needsKey: false },
];

const llmOptions = [
    { id: 'openai', name: 'OpenAI (GPT-4o)', icon: '🤖' },
    { id: 'google', name: 'Google Gemini 2.5 Pro', icon: '🔮' },
];

export default function ManagementProvidersPage() {
    const { user } = useAuth();
    const [teamId, setTeamId] = useState<string>('');
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        loadTeamId();
    }, [user]);

    const loadTeamId = async () => {
        // Fetch all available teams
        try {
            const allTeams = await getTeams();
            setTeams(allTeams);
        } catch { /* ignore */ }

        // 1) Try from auth context
        if (user?.teamId || user?.team_id) {
            setTeamId(user.teamId || user.team_id || '');
            return;
        }
        // 2) Fallback: fetch first available team
        try {
            const allTeams = await getTeams();
            if (Array.isArray(allTeams) && allTeams.length > 0) {
                setTeamId(allTeams[0].id || allTeams[0]._id || '');
                return;
            }
        } catch {
            // ignore
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

    useEffect(() => {
        if (!teamId) {
            setLoading(false);
            return;
        }
        loadConfigs();
    }, [teamId]);

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/teams/${teamId}/config`);
            if (res.ok) {
                const d = await res.json();

                // STT
                if (d.sttProvider) setSttProvider(d.sttProvider);
                if (d.deepgramApiKey) {
                    setDeepgramApiKey(d.deepgramApiKey);
                    setDeepgramKeyMasked(true);
                }
                if (d.speachesApiUrl) setSpeachesApiUrl(d.speachesApiUrl);
                if (d.speachesApiKey) {
                    setSpeachesApiKey(d.speachesApiKey);
                }

                // TTS
                if (d.ttsProvider) setTtsProvider(d.ttsProvider);
                if (d.ttsApiKey) setTtsApiKey(d.ttsApiKey);
                if (d.ttsVoiceId) setTtsVoiceId(d.ttsVoiceId);

                // LLM
                if (d.llmProvider) setLlmProvider(d.llmProvider);
                if (d.openaiApiKey) {
                    setOpenaiApiKey(d.openaiApiKey);
                    setOpenaiKeyMasked(true);
                }
                if (d.googleAiApiKey) {
                    setGoogleApiKey(d.googleAiApiKey);
                    setGoogleKeyMasked(true);
                }
            }
        } catch (e) {
            console.error('Failed to load configs', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Save handlers ──

    const saveSTT = async () => {
        if (!teamId) return toast.error('No team selected');
        setSttSaving(true);
        try {
            const payload: Record<string, string> = { sttProvider };
            if (deepgramApiKey && !deepgramKeyMasked) payload.deepgramApiKey = deepgramApiKey;
            if (sttProvider === 'speaches') {
                payload.speachesApiUrl = speachesApiUrl;
                payload.speachesApiKey = speachesApiKey;
            }
            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(`STT provider saved: ${sttProvider}`);
                if (deepgramApiKey) setDeepgramKeyMasked(true);
            } else toast.error('Failed to save STT provider');
        } catch { toast.error('Failed to save STT provider') }
        finally { setSttSaving(false) }
    };

    const saveTTS = async () => {
        if (!teamId) return toast.error('No team selected');
        setTtsSaving(true);
        try {
            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify({
                    ttsProvider,
                    ttsApiKey,
                    ttsVoiceId,
                }),
            });
            if (res.ok) toast.success(`TTS provider saved: ${ttsProvider}`);
            else toast.error('Failed to save TTS provider');
        } catch { toast.error('Failed to save TTS provider') }
        finally { setTtsSaving(false) }
    };

    const saveLLM = async () => {
        if (!teamId) return toast.error('No team selected');
        setLlmSaving(true);
        try {
            const payload: Record<string, string> = { llmProvider };
            if (openaiApiKey && !openaiKeyMasked) payload.openaiApiKey = openaiApiKey;
            if (googleApiKey && !googleKeyMasked) payload.googleAiApiKey = googleApiKey;
            const res = await apiFetch(`/api/teams/${teamId}/config`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(`AI provider saved: ${llmProvider === 'openai' ? 'OpenAI' : 'Gemini'}`);
                if (openaiApiKey) setOpenaiKeyMasked(true);
                if (googleApiKey) setGoogleKeyMasked(true);
            } else toast.error('Failed to save AI provider');
        } catch { toast.error('Failed to save AI provider') }
        finally { setLlmSaving(false) }
    };

    // ── Helpers ──

    const sttName = (id: string) => sttProviderOptions.find(o => o.id === id)?.name || id;
    const ttsName = (id: string) => ttsProviderOptions.find(o => o.id === id)?.name || id;
    const llmName = (id: string) => llmOptions.find(o => o.id === id)?.name || id;

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
                title={masked ? 'Show key' : 'Hide key'}
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
                    <h1 className="text-2xl font-bold">Management — Providers</h1>
                </div>
                {teamId && teams.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <select
                            value={teamId}
                            onChange={(e) => { setTeamId(e.target.value); }}
                            className="bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary max-w-[200px]"
                            title="Select team to configure"
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
                        Team: <span className="font-mono text-foreground">{teamId.slice(0, 12)}…</span>
                    </span>
                ) : null}
            </div>

            {!teamId && !loading && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-400">
                    No team selected. Make sure you have a team assigned to your account to save provider configurations.
                </div>
            )}

            {loading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading configuration…</div>
            ) : (

            <>
            {/* ═══════════════ STT ═══════════════ */}
            <section className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-base">
                    <Mic className="w-5 h-5" />
                    Speech-to-Text
                    <span className="ml-auto px-2 py-0.5 text-[10px] rounded bg-green-500/15 text-green-400 font-normal tracking-wider">DB</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Select which engine transcribes voice. {sttProvider && teamId && (
                        <span className="text-foreground/60">Currently: <span className="font-mono text-foreground">{sttName(sttProvider)}</span></span>
                    )}
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    {sttProviderOptions.map(opt =>
                        providerCard(
                            opt.id,
                            opt.name,
                            opt.description,
                            sttProvider === opt.id,
                            () => setSttProvider(opt.id),
                        )
                    )}
                </div>

                {/* Deepgram expanded config */}
                {sttProvider === 'deepgram' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">Deepgram API Key</label>
                        {inputWithToggle(
                            deepgramApiKey,
                            deepgramKeyMasked,
                            v => { setDeepgramApiKey(v); setDeepgramKeyMasked(false); },
                            () => setDeepgramKeyMasked(!deepgramKeyMasked),
                            'Enter Deepgram API key',
                            !!deepgramApiKey,
                        )}
                        {deepgramApiKey && deepgramKeyMasked && (
                            <p className="text-[11px] text-green-400/80">✓ Key saved in DB</p>
                        )}
                    </div>
                )}

                {/* Speaches expanded config */}
                {sttProvider === 'speaches' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">Speaches Server URL</label>
                        <input
                            type="text"
                            value={speachesApiUrl}
                            onChange={e => setSpeachesApiUrl(e.target.value)}
                            placeholder="https://speaches-production-c63f.up.railway.app"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                        />
                        <label className="block text-xs font-medium text-muted-foreground">API Key {speachesApiKey ? '(saved)' : '(optional — set via SPEACHES_API_KEY env var on Railway)'}</label>
                        <input
                            type="text"
                            value={speachesApiKey}
                            onChange={e => setSpeachesApiKey(e.target.value)}
                            placeholder="Speaches API key if configured"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                        />
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button onClick={saveSTT} disabled={sttSaving || !teamId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {sttSaving ? 'Saving…' : 'Save'}
                    </button>
                    {!teamId && <span className="text-xs text-amber-400">Sign in to save</span>}
                </div>
            </section>

            {/* ═══════════════ TTS ═══════════════ */}
            <section className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-base">
                    <Volume2 className="w-5 h-5" />
                    Text-to-Speech
                    <span className="ml-auto px-2 py-0.5 text-[10px] rounded bg-green-500/15 text-green-400 font-normal tracking-wider">DB</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Choose the voice engine for the Brain's responses. {ttsProvider && teamId && (
                        <span className="text-foreground/60">Currently: <span className="font-mono text-foreground">{ttsName(ttsProvider)}</span></span>
                    )}
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    {ttsProviderOptions.map(opt =>
                        providerCard(
                            opt.id,
                            opt.name,
                            opt.description,
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
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">API Key / Endpoint</label>
                                <input type="text" value={ttsApiKey}
                                    onChange={e => setTtsApiKey(e.target.value)}
                                    placeholder="API key or endpoint URL (if required)"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Voice ID</label>
                                <input type="text" value={ttsVoiceId}
                                    onChange={e => setTtsVoiceId(e.target.value)}
                                    placeholder={ttsProvider === 'kokoro' ? 'ef_dora, em_alex, em_santa…' : 'Voice ID (if required)'}
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
                        {ttsSaving ? 'Saving…' : 'Save'}
                    </button>
                    {!teamId && <span className="text-xs text-amber-400">Sign in to save</span>}
                </div>
            </section>

            {/* ═══════════════ AI / LLM ═══════════════ */}
            <section className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold mb-1 flex items-center gap-2 text-base">
                    <Brain className="w-5 h-5" />
                    AI / LLM
                    <span className="ml-auto px-2 py-0.5 text-[10px] rounded bg-green-500/15 text-green-400 font-normal tracking-wider">DB</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Select which AI powers the Brain. {llmProvider && teamId && (
                        <span className="text-foreground/60">Currently: <span className="font-mono text-foreground">{llmName(llmProvider)}</span></span>
                    )}
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    {llmOptions.map(opt =>
                        providerCard(
                            opt.id,
                            `${opt.icon} ${opt.name}`,
                            llmProvider === opt.id
                                ? (opt.id === 'openai' ? (openaiApiKey ? '✓ Configured' : 'No key yet') : (googleApiKey ? '✓ Configured' : 'No key yet'))
                                : (opt.id === 'openai' ? (openaiApiKey ? '✓ Key on file' : 'No key') : (googleApiKey ? '✓ Key on file' : 'No key')),
                            llmProvider === opt.id,
                            () => setLlmProvider(opt.id),
                        )
                    )}
                </div>

                {/* LLM expanded config */}
                {llmProvider === 'openai' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">OpenAI API Key</label>
                        {inputWithToggle(
                            openaiApiKey,
                            openaiKeyMasked,
                            v => { setOpenaiApiKey(v); setOpenaiKeyMasked(false); },
                            () => setOpenaiKeyMasked(!openaiKeyMasked),
                            'sk-… (enter your OpenAI API key)',
                            !!openaiApiKey,
                        )}
                        {openaiApiKey && openaiKeyMasked
                            ? <p className="text-[11px] text-green-400/80">✓ Key saved in DB</p>
                            : <p className="text-[11px] text-muted-foreground/60">No OpenAI key stored</p>
                        }
                    </div>
                )}

                {llmProvider === 'google' && (
                    <div className="mb-5 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                        <label className="block text-xs font-medium text-muted-foreground">Google Gemini API Key</label>
                        {inputWithToggle(
                            googleApiKey,
                            googleKeyMasked,
                            v => { setGoogleApiKey(v); setGoogleKeyMasked(false); },
                            () => setGoogleKeyMasked(!googleKeyMasked),
                            'AIza… (enter your Gemini API key)',
                            !!googleApiKey,
                        )}
                        {googleApiKey && googleKeyMasked
                            ? <p className="text-[11px] text-green-400/80">✓ Key saved in DB</p>
                            : <p className="text-[11px] text-muted-foreground/60">No Gemini key stored</p>
                        }
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <button onClick={saveLLM} disabled={llmSaving || !teamId}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {llmSaving ? 'Saving…' : 'Save'}
                    </button>
                    {!teamId && <span className="text-xs text-amber-400">Sign in to save</span>}
                </div>
            </section>
            </>)}
        </div>
    );
}
