import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Brain,
    Building2,
    Loader2,
    Mic,
    MicOff,
    RotateCcw,
    Send,
    Sparkles,
    Tag,
    Volume2,
    VolumeX,
    Phone,
    PhoneOff,
    PhoneIncoming,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/config';
import { apiFetch } from '@/lib/api-fetch';
import {
    brainChat,
    getBrands,
    getCompanies,
    getTeams,
    type BrainChatMessage,
    type Brand,
    type Company,
    type Team,
} from '@/lib/crud-api';
import { io, type Socket } from 'socket.io-client';
import { WEBSOCKET_URL } from '@/lib/config';

import type { ChatLine } from './brain-types';
import { storageKeyFor, readStoredContext, saveStoredContext, AUTOSPEAK_KEY } from './brain-storage';

export default function BrainPage() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [messages, setMessages] = useState<ChatLine[]>([
        {
            id: 'brain-welcome',
            role: 'assistant',
            content:
                'I am KELEDON Brain. Choose a company, brand, and team, then chat with me as that operating context.',
            timestamp: new Date().toISOString(),
        },
    ]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [isListening, setIsListening] = useState(false);
    const [sttLang, setSttLang] = useState(() => {
        try { return localStorage.getItem('keledon_stt_lang') || navigator.language || 'en-US'; }
        catch { return navigator.language || 'en-US'; }
    });
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const listeningRef = useRef(false);
    const reListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ttsFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sttLangRef = useRef(sttLang);
    const lastChunkPlayedRef = useRef(false);
    const reconErrorCountRef = useRef(0);
    const [autoSpeak, setAutoSpeak] = useState(() => {
        try { return localStorage.getItem(AUTOSPEAK_KEY) !== 'false'; } catch { return true; }
    });
    const [conversationMode, setConversationMode] = useState(false);
    const [brainLogs, setBrainLogs] = useState<string[]>([]);
    const BRAIN_LOG_MAX = 50;

    // ── Audio device selection ──
    const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicId, setSelectedMicId] = useState(() => {
        try { return localStorage.getItem('keledon_brain_mic_id') || ''; } catch { return ''; }
    });
    const [selectedSpeakerId, setSelectedSpeakerId] = useState(() => {
        try { return localStorage.getItem('keledon_brain_speaker_id') || ''; } catch { return ''; }
    });
    const [showDeviceSettings, setShowDeviceSettings] = useState(false);

    // Provider status indicators
    const [llmProvider, setLlmProvider] = useState<string | null>(null);
    const [ttsProvider, setTtsProvider] = useState<string | null>(null);
    const [sttProvider, setSttProvider] = useState<string | null>(null);
    const [teamConfigLoading, setTeamConfigLoading] = useState(false);
    // API key presence tracking
    const [llmApiKeySet, setLlmApiKeySet] = useState(false);
    const [ttsApiKeySet, setTtsApiKeySet] = useState(false);
    const [sttKeySet, setSttKeySet] = useState(false);
    const [ttsVoiceId, setTtsVoiceId] = useState<string | null>(null);

    function addLog(msg: string) {
        const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
        console.log('[Brain]', msg);
        setBrainLogs(prev => [entry, ...prev].slice(0, BRAIN_LOG_MAX));
    }

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsAbortRef = useRef<AbortController | null>(null);
    const conversationModeRef = useRef(false);
    const draftRef = useRef(draft);
    const audioPlayingRef = useRef(false);
    const lastBrainReplyRef = useRef('');
    const voiceSocketRef = useRef<Socket | null>(null);
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');
    const [callTimer, setCallTimer] = useState(0);
    const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioQueueRef = useRef<{ data: string; seq: string; format?: string }[]>([]);
    const voiceSessionIdRef = useRef<string | null>(null);
    const listenSocketRef = useRef<Socket | null>(null);
    const listenAudioStreamRef = useRef<MediaStream | null>(null);
    const listenAudioContextRef = useRef<AudioContext | null>(null);
    const listenSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const listenProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const cloudApiBaseRef = useRef<string | null>(null);
    const cloudWsBaseRef = useRef<string | null>(null);

    async function resolveBrainCloudConfig(): Promise<{ apiBase: string; wsBase: string }> {
        if (cloudApiBaseRef.current && cloudWsBaseRef.current) {
            return { apiBase: cloudApiBaseRef.current, wsBase: cloudWsBaseRef.current };
        }
        let apiBase = API_URL || '';
        let wsBase = WEBSOCKET_URL || '';
        try {
            const res = await fetch('/api/cloud-config', { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                const config = await res.json();
                if (config.api_url) apiBase = config.api_url;
                if (config.ws_url) wsBase = config.ws_url;
                if (!apiBase && config.ws_url) apiBase = String(config.ws_url).replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
            }
        } catch (e) {
            addLog(`[v${__APP_VERSION__ || '?'}] cloud-config lookup failed, using fallback: ${e instanceof Error ? e.message : String(e)}`);
        }
        if ((!apiBase || !wsBase) && window.location.hostname === 'keledon.tuyoisaza.com') {
            apiBase = apiBase || 'https://keledonapi.tuyoisaza.com';
            wsBase = wsBase || 'wss://keledonapi.tuyoisaza.com';
        }
        cloudApiBaseRef.current = apiBase;
        cloudWsBaseRef.current = wsBase || window.location.origin.replace(/^http/, 'ws');
        addLog(`[v${__APP_VERSION__ || '?'}] Brain cloud endpoints: api=${cloudApiBaseRef.current || '(same-origin)'} ws=${cloudWsBaseRef.current}`);
        return { apiBase: cloudApiBaseRef.current, wsBase: cloudWsBaseRef.current };
    }

    const selectedCompany = useMemo(
        () => companies.find((c) => c.id === selectedCompanyId),
        [companies, selectedCompanyId],
    );
    const selectedBrand = useMemo(
        () => brands.find((b) => b.id === selectedBrandId),
        [brands, selectedBrandId],
    );
    const selectedTeam = useMemo(
        () => teams.find((t) => t.id === selectedTeamId),
        [teams, selectedTeamId],
    );
    const brandsForCompany = useMemo(
        () => brands.filter((b) => b.companyId === selectedCompanyId),
        [brands, selectedCompanyId],
    );
    const teamsForBrand = useMemo(
        () => teams.filter((t) => t.brandId === selectedBrandId),
        [teams, selectedBrandId],
    );
    const configReady = Boolean(selectedCompany && selectedBrand && selectedTeam);

    // ── Data loading ────────────────────────────────────────────────────

    useEffect(() => {
        const key = storageKeyFor(user?.id);

        async function loadContext() {
            setLoading(true);
            try {
                const [companyList, brandList, teamList] = await Promise.all([
                    getCompanies(),
                    getBrands(),
                    getTeams(),
                ]);
                setCompanies(companyList);
                setBrands(brandList);
                setTeams(teamList);

                const stored = readStoredContext(key);
                // Prefer a company that has brands, fallback to stored → user → first with brands → first
                const firstCompanyWithBrands = companyList.find((c) =>
                    brandList.some((b) => b.companyId === c.id),
                );
                const fallbackCompanyId = firstCompanyWithBrands?.id || companyList[0]?.id || '';
                const initialCompanyId = stored.companyId || user?.companyId || fallbackCompanyId;
                const companyBrands = brandList.filter((b) => b.companyId === initialCompanyId);
                const initialBrandId =
                    stored.brandId && companyBrands.some((b) => b.id === stored.brandId)
                        ? stored.brandId
                        : companyBrands[0]?.id || '';
                const brandTeams = teamList.filter((t) => t.brandId === initialBrandId);
                const initialTeamId =
                    stored.teamId && brandTeams.some((t) => t.id === stored.teamId)
                        ? stored.teamId
                        : brandTeams[0]?.id || '';

                setSelectedCompanyId(initialCompanyId);
                setSelectedBrandId(initialBrandId);
                setSelectedTeamId(initialTeamId);
            } catch (error) {
                console.error('Failed to load Brain context', error);
                toast.error('Failed to load company, brand, and team data');
            } finally {
                setLoading(false);
            }
        }

        if (user) loadContext();
    }, [user]);

    useEffect(() => {
        if (!user || !selectedCompanyId) return;
        const key = storageKeyFor(user.id);
        saveStoredContext(key, {
            companyId: selectedCompanyId,
            brandId: selectedBrandId,
            teamId: selectedTeamId,
        });
    }, [selectedCompanyId, selectedBrandId, selectedTeamId, user]);

    // ── Load provider config for selected team ──

    useEffect(() => {
        if (!selectedTeamId) {
            setLlmProvider(null);
            setTtsProvider(null);
            setSttProvider(null);
            setLlmApiKeySet(false);
            setTtsApiKeySet(false);
            setSttKeySet(false);
            setTtsVoiceId(null);
            return;
        }

        setTeamConfigLoading(true);
        const team = teams.find(t => t.id === selectedTeamId);
        // Optimistic: use the team's stored fields first
        if (team) {
            setLlmProvider((team as any).llmProvider || null);
            setTtsProvider((team as any).ttsProvider || null);
            setSttProvider((team as any).sttProvider || null);
        }

        // Then fetch full config from API for API keys / real values
        apiFetch(`/api/teams/${selectedTeamId}/config`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setLlmProvider(data.llmProvider || null);
                    setTtsProvider(data.ttsProvider || null);
                    setSttProvider(data.sttProvider || null);
                    setTtsVoiceId(data.ttsVoiceId || null);
                    // Detect API key presence per provider
                    const llmKey = data.llmProvider === 'openai' ? data.openaiApiKey
                        : data.llmProvider === 'google' ? data.googleAiApiKey
                        : data.llmProvider === 'anthropic' ? data.anthropicApiKey
                        : null;
                    setLlmApiKeySet(!!llmKey);
                    setTtsApiKeySet(!!(data.ttsApiKey));
                    const sttKey = data.sttProvider === 'deepgram' ? data.deepgramApiKey : null;
                    setSttKeySet(!!sttKey);
                    addLog(`Provider config loaded: LLM=${data.llmProvider || '?'} (key=${!!llmKey}) TTS=${data.ttsProvider || '?'} (key=${!!data.ttsApiKey}) STT=${data.sttProvider || '?'}`);
                } else {
                    addLog('Provider config fetch returned no data (maybe auth issue?)');
                }
            })
            .catch(err => console.error('Failed to load provider config:', err))
            .finally(() => setTeamConfigLoading(false));
    }, [selectedTeamId, teams]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!selectedCompanyId || !brandsForCompany.length) return;
        if (!brandsForCompany.some((b) => b.id === selectedBrandId)) {
            const next = brandsForCompany[0];
            setSelectedBrandId(next.id);
            setSelectedTeamId(teams.filter((t) => t.brandId === next.id)[0]?.id || '');
        }
    }, [brandsForCompany, selectedBrandId, selectedCompanyId, teams]);

    useEffect(() => {
        if (!selectedBrandId || !teamsForBrand.length) return;
        if (!teamsForBrand.some((t) => t.id === selectedTeamId)) {
            setSelectedTeamId(teamsForBrand[0].id);
        }
    }, [selectedBrandId, selectedTeamId, teamsForBrand]);

    // ── Enumerate audio devices on mount ──
    useEffect(() => {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
            setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
        }).catch(() => {});
        // Re-enumerate when devices change
        const handleDeviceChange = () => {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
                setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
            }).catch(() => {});
        };
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }, []);

    // Close device panel on outside click
    useEffect(() => {
        if (!showDeviceSettings) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-device-panel]') && !target.closest('[data-device-btn]')) {
                setShowDeviceSettings(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showDeviceSettings]);

    // Stop everything on unmount
    useEffect(() => {
        addLog(`[v${__APP_VERSION__ || '?'}] BrainPage mounted — web v${__APP_VERSION__ || '?'}`);
        addLog(`[v${__APP_VERSION__ || '?'}]   API_URL=${API_URL} | WEBSOCKET_URL=${WEBSOCKET_URL || '(same origin)'}`);
        return () => {
            addLog(`[v${__APP_VERSION__ || '?'}] BrainPage unmounting — cleanup`);
            recognitionRef.current?.abort();
            ttsAbortRef.current?.abort();
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            disconnectVoiceSocket();
        };
    }, []);

    // ── TTS ─────────────────────────────────────────────────────────────

    function stopSpeaking() {
        ttsAbortRef.current?.abort();
        ttsAbortRef.current = null;
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
    }

    // ── Voice WebSocket ────────────────────────────────────────────────

    async function connectVoiceSocket() {
        if (voiceSocketRef.current?.connected) return;
        const token = sessionStorage.getItem('auth_token');
        const sessionId = `brain_${Date.now()}`;
        voiceSessionIdRef.current = sessionId;
        const { wsBase } = await resolveBrainCloudConfig();
        const fullUrl = `${wsBase}/ws/voice`;
        const appVersion = __APP_VERSION__ || '0.4.6';
        addLog(`[v${appVersion}] Connecting voice WS → ${fullUrl}`);
        addLog(`[v${appVersion}] Session: ${sessionId} | User: ${user?.email || user?.id || 'anon'}`);
        addLog(`[v${appVersion}] Auth token: ${token ? token.substring(0, 12) + '...' : 'MISSING!'}`);
        setCallStatus('connecting');
        const socket = io(fullUrl, {
            auth: {
                token,
                device_id: `brain_${user?.id || 'anon'}`,
                session_id: sessionId,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
        });
        socket.on('connect', () => {
            addLog(`[v${__APP_VERSION__ || '?'}] Voice WS connected: ${socket.id}`);
            setCallStatus('connected');
            // Start call timer
            setCallTimer(0);
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            callTimerRef.current = setInterval(() => {
                setCallTimer((t) => t + 1);
            }, 1000);
            // Send call:start with current context
            socket.emit('call:start', {
                session_id: sessionId,
                call_type: 'brain_conversation',
                context: {
                    companyName: selectedCompany?.name || 'Unspecified Company',
                    brandName: selectedBrand?.name || 'Unspecified Brand',
                    teamName: selectedTeam?.name || 'Unspecified Team',
                    companyId: selectedCompany?.id,
                    brandId: selectedBrand?.id,
                    teamId: selectedTeam?.id,
                },
            });
        });
        socket.on('voice:call_started', (data: any) => {
            addLog(`[v${__APP_VERSION__ || '?'}] Call started: ${data.session_id}`);
        });
        socket.on('voice:brain:thinking', (data: any) => {
            addLog(`[v${__APP_VERSION__ || '?'}] Brain thinking "${data.text?.slice(0, 60)}"`);
        });
        socket.on('voice:brain:reply', (data: any) => {
            addLog(`[v${__APP_VERSION__ || '?'}] Brain reply: ${data.text?.slice(0, 120)} | API v${data.apiVersion || '?'}`);
            setSending(false);
            // Stop listening while brain speaks
            if (listeningRef.current) {
                recognitionRef.current?.stop();
            }
            const replyId = `assistant-${Date.now()}`;
            setMessages(cur => [...cur, {
                id: replyId,
                role: 'assistant',
                content: data.text || '',
                timestamp: new Date().toISOString(),
            }]);
            // Save brain reply text in a ref (synchronous) so TTS fallback
            // can read it even before React state update processes
            lastBrainReplyRef.current = data.text || '';
            // Browser TTS fallback: if no audio chunks arrive in 2s, use SpeechSynthesis
            if (window.speechSynthesis && data.text) {
                if (ttsFallbackTimerRef.current) clearTimeout(ttsFallbackTimerRef.current);
                ttsFallbackTimerRef.current = setTimeout(() => {
                    if (!audioPlayingRef.current && audioQueueRef.current.length === 0) {
                        addLog(`[v${__APP_VERSION__ || '?'}] TTS fallback: using browser SpeechSynthesis`);
                        const utterance = new SpeechSynthesisUtterance(data.text);
                        utterance.lang = sttLangRef.current || 'en-US';
                        utterance.onend = () => {
                            audioPlayingRef.current = false;
                            if (conversationModeRef.current && !listeningRef.current) {
                                setTimeout(() => toggleListening(), 300);
                            }
                        };
                        audioPlayingRef.current = true;
                        window.speechSynthesis.speak(utterance);
                    }
                }, 2000);
            }
        });
        socket.on('voice:audio', (data: { audio: string; sequence: string; format?: string; duration?: number; apiVersion?: string }) => {
            // Cancel TTS fallback timer — backend streaming is working
            if (ttsFallbackTimerRef.current) {
                clearTimeout(ttsFallbackTimerRef.current);
                ttsFallbackTimerRef.current = null;
            }
            if (data.sequence === 'end') {
                addLog('Audio stream end' + (data.duration ? ' dur=' + data.duration.toFixed(1) : '') + ` | API v${data.apiVersion || '?'}`);
                audioPlayingRef.current = false;
                // If no audio chunks were played, use browser SpeechSynthesis fallback
                if (audioQueueRef.current.length === 0 && !lastChunkPlayedRef.current) {
                    addLog(`[v${__APP_VERSION__ || '?'}] No audio from backend — using browser SpeechSynthesis`);
                    const fallbackText = lastBrainReplyRef.current;
                    if (fallbackText && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(fallbackText);
                        utterance.lang = sttLangRef.current || 'en-US';
                        utterance.onend = () => {
                            audioPlayingRef.current = false;
                            if (conversationModeRef.current && !listeningRef.current) {
                                setTimeout(() => toggleListening(), 300);
                            }
                        };
                        audioPlayingRef.current = true;
                        window.speechSynthesis.speak(utterance);
                        return;
                    }
                }
                // Re-listen in conversation mode
                setTimeout(() => {
                    if (conversationModeRef.current && !listeningRef.current) {
                        toggleListening();
                    }
                }, 300);
                return;
            }
            // Clear flag: we received actual audio data from backend
            lastChunkPlayedRef.current = true;
            // Queue the chunk
            audioQueueRef.current.push({ data: data.audio, seq: data.sequence || 'chunk', format: data.format });
            if (!audioPlayingRef.current) {
                playNextAudioChunk();
            }
        });
        socket.on('voice:error', (data: any) => {
            addLog(`[v${__APP_VERSION__ || '?'}] WS ERROR: ${data.error || 'unknown'}`);
            setSending(false);
            audioPlayingRef.current = false;
            audioQueueRef.current = [];
            toast.error('Voice error: ' + (data.error || 'unknown'));
        });
        socket.on('disconnect', (reason: string) => {
            addLog(`[v${__APP_VERSION__ || '?'}] WS DISCONNECTED: ${reason}`);
            addLog(`[v${__APP_VERSION__ || '?'}]   Session: ${voiceSessionIdRef.current || 'none'} | Duration: ${formatCallTime(callTimer)}`);
            // Auto-reconnect for unexpected disconnects (not user-initiated)
            if (reason !== 'io client disconnect' && conversationModeRef.current) {
                addLog(`[v${__APP_VERSION__ || '?'}] → auto-reconnecting in 2s`);
                setTimeout(() => {
                    if (conversationModeRef.current) {
                        disconnectVoiceSocket();
                        void connectVoiceSocket();
                    }
                }, 2000);
                return;
            }
            setCallStatus('disconnected');
            if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
            audioPlayingRef.current = false;
        });
        socket.on('connect_error', (err) => {
            addLog(`[v${__APP_VERSION__ || '?'}] WS CONNECT ERROR: ${err.message}`);
            addLog(`[v${__APP_VERSION__ || '?'}]   Check: CORS? API running? URL=${fullUrl}`);
            setCallStatus('disconnected');
            toast.error('Failed to connect voice channel: ' + err.message);
        });
        voiceSocketRef.current = socket;
    }

    function disconnectVoiceSocket() {
        addLog('Disconnecting voice WS');
        if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
        audioPlayingRef.current = false;
        audioQueueRef.current = [];
        const socket = voiceSocketRef.current;
        if (socket) {
            if (socket.connected) {
                socket.emit('call:end');
            }
            socket.removeAllListeners();
            socket.disconnect();
        }
        voiceSocketRef.current = null;
        voiceSessionIdRef.current = null;
        setCallStatus('idle');
        setCallTimer(0);
    }

    /** Play streaming audio chunks in sequence */
    function playNextAudioChunk() {
        const queue = audioQueueRef.current;
        if (queue.length === 0) {
            audioPlayingRef.current = false;
            return;
        }
        audioPlayingRef.current = true;
        const chunk = queue.shift()!;
        try {
            const binary = atob(chunk.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const isWav = chunk.format === 'wav' || binary.slice(0, 4) === 'RIFF';
            const blob = new Blob([bytes], { type: isWav ? 'audio/wav' : 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            if (audio.setSinkId && selectedSpeakerId) {
                audio.setSinkId(selectedSpeakerId).catch(() => {});
            }
            audio.onended = () => {
                URL.revokeObjectURL(url);
                playNextAudioChunk();
            };
            audio.onerror = () => {
                URL.revokeObjectURL(url);
                playNextAudioChunk();
            };
            void audio.play();
        } catch (e) {
            addLog('Audio chunk play error: ' + e);
            playNextAudioChunk();
        }
    }

    /** Send STT transcript via voice WS */
    function sendVoiceTranscript(text: string) {
        const socket = voiceSocketRef.current;
        if (socket?.connected) {
            addLog('Sending voice transcript: ' + text);
            // Add user message to chat
            const userMsgId = `user-${Date.now()}`;
            setMessages(cur => [...cur, {
                id: userMsgId,
                role: 'user',
                content: text,
                timestamp: new Date().toISOString(),
            }]);
            socket.emit('voice:transcript', { text, is_final: true });
            // Show Brain thinking indicator
            setSending(true);
        } else {
            addLog('Voice WS not connected, falling back to HTTP');
            void handleSend(text);
        }
    }

    function formatCallTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function fallbackSpeak(text: string, messageId: string) {
        if (!window.speechSynthesis) { setSpeakingMessageId(null); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
            setSpeakingMessageId(null);
            if (conversationModeRef.current) {
                setTimeout(() => toggleListening(), 300);
            }
        };
        utterance.onerror = () => setSpeakingMessageId(null);
        setSpeakingMessageId(messageId);
        window.speechSynthesis.speak(utterance);
    }

    async function speakReply(text: string, messageId: string) {
        addLog('speakReply() textLen=' + text.length + ' msgId=' + messageId);
        stopSpeaking();
        const controller = new AbortController();
        ttsAbortRef.current = controller;

        try {
            let blob: Blob | null = null;
            const { apiBase } = await resolveBrainCloudConfig();
            const res = await apiFetch(`${apiBase}/tts/speak`, {
                method: 'POST',
                body: JSON.stringify({ text, teamId: selectedTeamId }),
                signal: controller.signal,
            });

            if (controller.signal.aborted) return;

            if (res.ok) {
                blob = await res.blob();
                addLog('TTS fetch OK status=' + res.status + ' blobSize=' + blob.size);
                if (!controller.signal.aborted && blob.size > 100) {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audioRef.current = audio;
                    if (audio.setSinkId && selectedSpeakerId) {
                        audio.setSinkId(selectedSpeakerId).catch(() => {});
                    }
                    audio.onended = () => {
                        addLog('TTS audio ended');
                        URL.revokeObjectURL(url);
                        setSpeakingMessageId(null);
                        // In conversation mode, re-listen after speaking
                        if (conversationModeRef.current) {
                            addLog('→ re-listen after TTS');
                            setTimeout(() => toggleListening(), 300);
                        }
                    };
                    audio.onerror = (e) => {
                        addLog('TTS audio onerror: ' + e);
                        URL.revokeObjectURL(url);
                        fallbackSpeak(text, messageId);
                    };
                    setSpeakingMessageId(messageId);
                    await audio.play();
                    return;
                }
            }
            if (!controller.signal.aborted) {
                addLog('TTS fallback — res.ok=' + res.ok + ' blobSize=' + (blob?.size ?? 'N/A'));
                fallbackSpeak(text, messageId);
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                addLog('speakReply catch: ' + (err?.message ?? String(err)));
                fallbackSpeak(text, messageId);
            }
        }
    }

    function toggleAutoSpeak() {
        const next = !autoSpeak;
        setAutoSpeak(next);
        try { localStorage.setItem(AUTOSPEAK_KEY, String(next)); } catch { /* ignore */ }
        if (!next) stopSpeaking();
    }

    // ── STT ─────────────────────────────────────────────────────────────

    function floatTo16BitPcmBase64(input: Float32Array, inputSampleRate: number, outputSampleRate = 16000): string {
        const ratio = inputSampleRate / outputSampleRate;
        const outputLength = Math.floor(input.length / ratio);
        const bytes = new Uint8Array(outputLength * 2);
        let offset = 0;
        for (let i = 0; i < outputLength; i++) {
            const idx = Math.floor(i * ratio);
            const s = Math.max(-1, Math.min(1, input[idx] || 0));
            const sample = s < 0 ? s * 0x8000 : s * 0x7fff;
            const intSample = Math.round(sample);
            bytes[offset++] = intSample & 0xff;
            bytes[offset++] = (intSample >> 8) & 0xff;
        }
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    async function startVoskListening(): Promise<void> {
        const appVersion = __APP_VERSION__ || '?';
        addLog(`[v${appVersion}] STT provider=vosk → starting Railway Vosk session`);
        const { apiBase, wsBase } = await resolveBrainCloudConfig();
        const sessionRes = await apiFetch(`${apiBase}/listening-sessions`, {
            method: 'POST',
            body: JSON.stringify({ source: 'brain-call', tabUrl: window.location.href, tabTitle: document.title }),
        });
        if (!sessionRes.ok) {
            const body = await sessionRes.text().catch(() => '');
            throw new Error(`Vosk session create failed ${sessionRes.status}: ${body}`);
        }
        const session = await sessionRes.json();
        const sessionId = session.sessionId;
        const language = (sttLangRef.current || navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
        const listenUrl = `${wsBase}/listen`;
        addLog(`[v${appVersion}] Connecting Vosk WS → ${listenUrl} path=/listen/ws session=${sessionId}`);
        const listenSocket = io(listenUrl, {
            path: '/listen/ws',
            query: { session: sessionId, language, debug: 'false', team_id: selectedTeam?.id || '' },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
        });
        listenSocketRef.current = listenSocket;

        return new Promise<void>((resolve, reject) => {
            const VOSK_FAIL_REASON = 'Vosk module load failed';
            let rejected = false;
            const failSafe = setTimeout(() => {
                if (!rejected && !listenSocket.connected) {
                    rejected = true;
                    reject(new Error('Vosk connection timeout'));
                }
            }, 8000);

            listenSocket.on('connect', async () => {
                addLog(`[v${appVersion}] Vosk WS connected: ${listenSocket.id} | session=${sessionId} | lang=${language}`);
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
                        video: false,
                    });
                    const audioCtx = new AudioContext();
                    const source = audioCtx.createMediaStreamSource(stream);
                    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (event) => {
                        if (!listenSocket.connected || !listeningRef.current) return;
                        const input = event.inputBuffer.getChannelData(0);
                        const payload = floatTo16BitPcmBase64(input, audioCtx.sampleRate, 16000);
                        listenSocket.emit('AUDIO_CHUNK', { payload });
                    };
                    source.connect(processor);
                    processor.connect(audioCtx.destination);
                    listenAudioStreamRef.current = stream;
                    listenAudioContextRef.current = audioCtx;
                    listenSourceRef.current = source;
                    listenProcessorRef.current = processor;
                    listeningRef.current = true;
                    setIsListening(true);
                    clearTimeout(failSafe);
                    if (!rejected) resolve();
                } catch (err) {
                    clearTimeout(failSafe);
                    if (!rejected) {
                        rejected = true;
                        reject(err instanceof Error ? err : new Error(String(err)));
                    }
                }
            });

            listenSocket.on('asr.partial', (data: { text?: string }) => {
                if (data.text) { setDraft(data.text); draftRef.current = data.text; }
            });
            listenSocket.on('asr.final', (data: { text?: string }) => {
                const text = (data.text || '').trim();
                if (!text) return;
                addLog(`[v${appVersion}] Vosk final: "${text}"`);
                setDraft(text); draftRef.current = text;
                if (conversationModeRef.current) {
                    draftRef.current = '';
                    sendVoiceTranscript(text);
                }
            });
            listenSocket.on('session.ended', (data: any) => {
                const reason = data?.reason || 'unknown';
                addLog(`[v${appVersion}] Vosk session ended: ${reason}`);
                clearTimeout(failSafe);
                if (reason.includes('worker_error') && reason.includes(VOSK_FAIL_REASON)) {
                    if (!rejected) {
                        rejected = true;
                        stopVoskListening();
                        reject(new Error(reason));
                    }
                } else {
                    stopVoskListening();
                }
            });
            listenSocket.on('connect_error', (err) => {
                addLog(`[v${appVersion}] Vosk WS connect error: ${err.message}`);
                clearTimeout(failSafe);
                if (!rejected) {
                    rejected = true;
                    reject(err);
                }
            });
        });
    }

    function stopVoskListening(): void {
        listenProcessorRef.current?.disconnect();
        listenSourceRef.current?.disconnect();
        listenAudioContextRef.current?.close().catch(() => undefined);
        listenAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
        if (listenSocketRef.current) {
            if (listenSocketRef.current.connected) listenSocketRef.current.emit('session.stop');
            listenSocketRef.current.removeAllListeners();
            listenSocketRef.current.disconnect();
        }
        listenProcessorRef.current = null;
        listenSourceRef.current = null;
        listenAudioContextRef.current = null;
        listenAudioStreamRef.current = null;
        listenSocketRef.current = null;
        listeningRef.current = false;
        setIsListening(false);
    }

    async function toggleListening() {
        const action = isListening ? 'STOPPING' : 'STARTING';
        addLog(`[v${__APP_VERSION__ || '?'}] 👤 ACTION: ${action} mic listening`);
        // Clear any pending re-listen timers
        if (reListenTimerRef.current) {
            clearTimeout(reListenTimerRef.current);
            reListenTimerRef.current = null;
        }

        if (listeningRef.current) {
            addLog('→ stopping STT');
            if (listenSocketRef.current) {
                stopVoskListening();
            } else {
                listeningRef.current = false;
                recognitionRef.current?.stop();
                setIsListening(false);
            }
            return;
        }

        if (sttProvider === 'vosk') {
            try {
                await startVoskListening();
                return;
            } catch (error) {
                addLog(`[v${__APP_VERSION__ || '?'}] Vosk unavailable, falling back to browser SpeechRecognition: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            toast.error('Speech recognition not supported in this browser (try Chrome or Edge)');
            return;
        }

        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = sttLangRef.current || navigator.language || 'en-US';

        recognition.onstart = () => {
            addLog(`[v${__APP_VERSION__ || '?'}] STT: lang=${recognition.lang}, continuous=${recognition.continuous}, interim=${recognition.interimResults}`);
            addLog('recognition started (continuous)');
            // Interruption: if Brain is speaking, cut it off
            if (speakingMessageId) {
                addLog('→ interruption! stopping TTS');
                stopSpeaking();
            }
            listeningRef.current = true;
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (final) {
                setDraft(final); draftRef.current = final; addLog('STT final: "' + final.trimEnd() + '"');
                // Reset silence timer — auto-submit after 1.2s of silence
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    if (conversationModeRef.current && draftRef.current?.trim()) {
                        addLog('→ auto-submit (silence timer)');
                        const text = draftRef.current;
                        draftRef.current = '';
                        if (voiceSocketRef.current?.connected) {
                            sendVoiceTranscript(text);
                        } else {
                            void handleSend(text);
                        }
                    }
                }, 1200);
            } else if (interim) {
                setDraft(interim); draftRef.current = interim;
            }
        };

        recognition.onend = () => {
            addLog('recognition onend, draftRef=' + (draftRef.current ? '"' + draftRef.current.trimEnd() + '"' : '(empty)'));
            listeningRef.current = false;
            setIsListening(false);
            // Reset error counter on successful ended recognition (not error-triggered)
            reconErrorCountRef.current = 0;
            // In continuous mode, restart if we're still in conversation mode
            if (conversationModeRef.current && recognitionRef.current === recognition) {
                addLog('→ restarting recognition in 300ms');
                reListenTimerRef.current = setTimeout(() => {
                    if (conversationModeRef.current && !listeningRef.current) {
                        toggleListening();
                    }
                }, 300);
            }
        };

        recognition.onerror = (event: any) => {
            addLog('recognition error: ' + event.error);
            reconErrorCountRef.current++;
            listeningRef.current = false;
            setIsListening(false);
            // Don't show toast for transient errors
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                toast.error('Microphone error: ' + event.error);
            }
            // Restart on transient errors in conversation mode (max 3 consecutive)
            if (conversationModeRef.current && event.error !== 'aborted' && recognitionRef.current === recognition) {
                if (reconErrorCountRef.current >= 3) {
                    addLog('→ too many recognition errors, giving up');
                    toast.error('Microphone keeps failing — check your mic and refresh');
                    reconErrorCountRef.current = 0;
                    return;
                }
                reListenTimerRef.current = setTimeout(() => {
                    if (conversationModeRef.current && !listeningRef.current) {
                        toggleListening();
                    }
                }, 500);
            }
        };

        listeningRef.current = true;
        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) { addLog('recognition start error: ' + e); listeningRef.current = false; }
    }

    function toggleConversationMode() {
        const action = !conversationMode ? 'ENTERING' : 'EXITING';
        addLog(`[v${__APP_VERSION__ || '?'}] 👤 ACTION: ${action} call mode`);
        addLog(`[v${__APP_VERSION__ || '?'}]   Context: ${selectedCompany?.name || '-'} / ${selectedBrand?.name || '-'} / ${selectedTeam?.name || '-'}`);
        if (conversationMode) {
            // Exiting conversation mode
            addLog('→ exiting conv mode');
            setConversationMode(false);
            conversationModeRef.current = false;
            if (isListening) {
                recognitionRef.current?.stop();
                setIsListening(false);
            }
            stopSpeaking();
            disconnectVoiceSocket();
            setAutoSpeak(true);
        } else {
            // Entering conversation mode
            addLog('→ entering conv mode');
            setConversationMode(true);
            conversationModeRef.current = true;
            setAutoSpeak(true);
            // Connect voice WebSocket
            void connectVoiceSocket();
            // Start listening if not already
            if (!isListening) {
                // Small delay so state settles, then start mic
                setTimeout(() => toggleListening(), 100);
            }
        }
    }

    // ── Provider Test Functions ──

    const [testingLLM, setTestingLLM] = useState(false);
    const [testingTTS, setTestingTTS] = useState(false);
    const [testingSTT, setTestingSTT] = useState(false);

    async function testLLMProvider() {
        if (!selectedTeamId || testingLLM) return;
        setTestingLLM(true);
        const testMsg = 'Reply with exactly one word: WORKING';
        const tid = selectedTeam?.id || selectedTeamId || '(none)';
        addLog(`[TEST] LLM: sending to ${llmProvider || '?'} teamId=${tid}...`);
        try {
            const response = await brainChat({
                message: testMsg,
                history: [],
                companyId: selectedCompany?.id,
                companyName: selectedCompany?.name,
                brandId: selectedBrand?.id,
                brandName: selectedBrand?.name,
                teamId: tid,
                teamName: selectedTeam?.name,
                language: 'en',
            });
            const reply = (response.reply || '').trim();
            addLog(`[TEST] LLM: response (${reply.length} chars): "${reply.substring(0, 120)}"`);
            if (reply.toLowerCase().includes('working')) {
                addLog(`[TEST] LLM: ✅ reply contains "WORKING" - Gemini is responding`);
            } else if (reply.startsWith('I understand')) {
                addLog(`[TEST] LLM: ❌ FALLBACK detected - LLM provider resolved to 'none'`);
            } else {
                addLog(`[TEST] LLM: ⚠️ response received but unexpected content`);
            }
        } catch (err) {
            addLog(`[TEST] LLM: ❌ ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setTestingLLM(false);
        }
    }

    async function testTTSProvider() {
        if (!selectedTeamId || testingTTS) return;
        setTestingTTS(true);
        addLog(`[TEST] TTS: testing ${ttsProvider || '?'}...`);
        try {
            const { apiBase } = await resolveBrainCloudConfig();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await apiFetch(`${apiBase}/tts/speak`, {
                method: 'POST',
                body: JSON.stringify({ text: 'Hello, this is a TTS test.', teamId: selectedTeamId }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.ok) {
                const blob = await res.blob();
                addLog(`[TEST] TTS: ✅ HTTP ${res.status} blob=${blob.size} bytes`);
                if (blob.size > 200) addLog(`[TEST] TTS: ✅ audio content received`);
                else addLog(`[TEST] TTS: ⚠️ blob small (${blob.size} bytes), may be empty audio`);
            } else {
                const text = await res.text().catch(() => '');
                addLog(`[TEST] TTS: ❌ HTTP ${res.status}: ${text.substring(0, 300)}`);
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                addLog(`[TEST] TTS: ❌ timeout (8s) - server did not respond`);
            } else {
                addLog(`[TEST] TTS: ❌ ${err instanceof Error ? err.message : String(err)}`);
            }
        } finally {
            setTestingTTS(false);
        }
    }

    async function testSTTProvider() {
        if (!selectedTeamId || testingSTT) return;
        setTestingSTT(true);
        addLog(`[TEST] STT: testing ${sttProvider || '?'}...`);
        try {
            if (sttProvider === 'vosk') {
                const { apiBase } = await resolveBrainCloudConfig();
                const res = await apiFetch(`${apiBase}/listening-sessions`, {
                    method: 'POST',
                    body: JSON.stringify({ source: 'brain-test', tabUrl: window.location.href, tabTitle: document.title }),
                });
                if (res.ok) {
                    const data = await res.json();
                    addLog(`[TEST] STT: ✅ Vosk session created: ${data.sessionId}`);
                } else {
                    const text = await res.text().catch(() => '');
                    addLog(`[TEST] STT: ❌ Vosk session failed HTTP ${res.status}: ${text.substring(0, 300)}`);
                }
            } else if (sttProvider === 'webspeech') {
                const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SR) addLog(`[TEST] STT: ✅ Web Speech API available`);
                else addLog(`[TEST] STT: ❌ Web Speech API not available in this browser`);
            } else if (sttProvider) {
                addLog(`[TEST] STT: ⚠️ no automated test for ${sttProvider}`);
            } else {
                addLog(`[TEST] STT: ❌ no STT provider configured`);
            }
        } catch (err) {
            addLog(`[TEST] STT: ❌ ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setTestingSTT(false);
        }
    }

    // ── Chat ─────────────────────────────────────────────────────────────

    function handleCompanyChange(companyId: string) {
        setSelectedCompanyId(companyId);
        const next = brands.filter((b) => b.companyId === companyId)[0];
        setSelectedBrandId(next?.id || '');
        setSelectedTeamId(teams.filter((t) => t.brandId === next?.id)[0]?.id || '');
    }

    function handleBrandChange(brandId: string) {
        setSelectedBrandId(brandId);
        setSelectedTeamId(teams.filter((t) => t.brandId === brandId)[0]?.id || '');
    }

    async function handleSend(overrideText?: string) {
        const trimmed = (overrideText ?? draft).trim();
        addLog('handleSend() trimmed="' + trimmed + '" sending=' + sending + ' configReady=' + configReady + ' override=' + (overrideText ? 'yes' : 'no'));
        if (!trimmed || sending) return;
        if (!configReady) {
            toast.error('Select a company, brand, and team first');
            return;
        }

        // Stop listening before sending
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }

        const userMessage: ChatLine = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            timestamp: new Date().toISOString(),
        };

        const nextHistory: BrainChatMessage[] = [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
        }));

        setMessages((cur) => [...cur, userMessage]);
        setDraft('');
        setSending(true);

        try {
            const response = await brainChat({
                message: trimmed,
                history: nextHistory.slice(-12),
                companyId: selectedCompany?.id,
                companyName: selectedCompany?.name,
                brandId: selectedBrand?.id,
                brandName: selectedBrand?.name,
                teamId: selectedTeam?.id,
                teamName: selectedTeam?.name,
                language: user?.role ? 'en' : undefined,
            });
            addLog('brainChat OK, replyLen=' + (response.reply?.length ?? 0) + ' autoSpeak=' + autoSpeak);

            const replyId = `assistant-${Date.now()}`;
            setMessages((cur) => [
                ...cur,
                {
                    id: replyId,
                    role: 'assistant',
                    content: response.reply,
                    timestamp: new Date().toISOString(),
                },
            ]);

            if (autoSpeak) {
                void speakReply(response.reply, replyId);
            }
        } catch (error) {
            addLog('brainChat ERROR: ' + (error instanceof Error ? error.message : String(error)));
            console.error('Brain chat failed', error);
            toast.error('Could not reach the Brain right now');
            setMessages((cur) => [
                ...cur,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: 'assistant',
                    content: 'I could not reach the Brain service. Check the cloud API and try again.',
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    function resetChat() {
        stopSpeaking();
        setMessages([
            {
                id: `brain-reset-${Date.now()}`,
                role: 'assistant',
                content:
                    'Brain context ready. Send me a message and I will answer as the selected company, brand, and team.',
                timestamp: new Date().toISOString(),
            },
        ]);
    }

    const contextSummary = [
        selectedCompany?.name ?? 'No company selected',
        selectedBrand?.name ?? 'No brand selected',
        selectedTeam?.name ?? 'No team selected',
    ].join(' • ');

    // ── Render ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                        <Brain className="h-3.5 w-3.5" />
                        Brand Brain
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Brain</h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Configure the company, brand, and team context, then chat with KELEDON Brain — by text or voice.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm space-y-3">
                    <div>
                        <div className="flex items-center gap-2 text-foreground">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Live context
                        </div>
                        <p className="mt-1 max-w-sm text-muted-foreground">{contextSummary}</p>
                    </div>
                    {/* Provider status indicators */}

                    {/* Helper to render a provider row with name + key status + test button */}
                    {(() => {
                        const providerRow = (
                            icon: React.ReactNode,
                            label: string,
                            providerName: string | null,
                            keySet: boolean,
                            keyLabel: string,
                            badgeClass: string,
                            onTest?: () => void,
                            testing?: boolean,
                        ) => (
                            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/30 text-xs">
                                <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    {icon}
                                    {label}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClass}`}>
                                        {providerName || 'none'}
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                                            keySet
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}
                                        title={keySet ? `${keyLabel} configured` : `${keyLabel} not configured`}
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${keySet ? 'bg-green-400' : 'bg-red-400'}`} />
                                        {keySet ? keyLabel : 'no key'}
                                    </span>
                                    {onTest && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onTest(); }}
                                            disabled={testing}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                                testing
                                                    ? 'bg-muted/30 text-muted-foreground border-border cursor-wait'
                                                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 border-border'
                                            }`}
                                            title={`Test ${label} provider`}
                                        >
                                            {testing ? (
                                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                            ) : (
                                                'test'
                                            )}
                                        </button>
                                    )}
                                </span>
                            </div>
                        );
                        return (
                            <div className="space-y-1 pt-2 border-t border-border">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Provider Configuration</span>
                                    <a
                                        href="/management/providers"
                                        className="text-[10px] text-primary hover:underline"
                                        onClick={(e) => { e.preventDefault(); window.open('/management/providers', '_blank'); }}
                                    >
                                        Edit in Management →
                                    </a>
                                </div>
                                {teamConfigLoading ? (
                                    <div className="flex items-center justify-center py-2">
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    </div>
                                ) : selectedTeamId ? (
                                    <div className="space-y-1">
                                        {providerRow(
                                            <Brain className="h-3 w-3 text-primary" />, 'LLM',
                                            llmProvider === 'openai' ? 'GPT-4o' :
                                            llmProvider === 'google' ? 'Gemini' :
                                            llmProvider === 'anthropic' ? 'Claude' :
                                            llmProvider || 'none',
                                            llmApiKeySet, 'key',
                                            llmProvider ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/60 text-muted-foreground border border-border',
                                            testLLMProvider, testingLLM
                                        )}
                                        {providerRow(
                                            <Volume2 className="h-3 w-3 text-blue-400" />, 'TTS',
                                            ttsProvider || 'none', ttsApiKeySet, 'key',
                                            ttsProvider ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-muted/60 text-muted-foreground border border-border',
                                            testTTSProvider, testingTTS
                                        )}
                                        {providerRow(
                                            <Mic className="h-3 w-3 text-green-400" />, 'STT',
                                            sttProvider === 'vosk' ? 'Vosk' :
                                            sttProvider === 'deepgram' ? 'Deepgram' :
                                            sttProvider === 'webspeech' ? 'Web Speech' :
                                            sttProvider || 'none', sttKeySet, 'key',
                                            sttProvider ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-muted/60 text-muted-foreground border border-border',
                                            testSTTProvider, testingSTT
                                        )}
                                        {ttsVoiceId && (
                                            <div className="flex items-center justify-between px-2 py-1 text-[10px] text-muted-foreground">
                                                <span>Voice ID</span>
                                                <code className="px-1 py-0.5 rounded bg-muted/50 font-mono">{ttsVoiceId}</code>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 text-[10px] text-muted-foreground">Select a team to see provider config</div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                {/* ── Context panel ── */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h2 className="font-semibold text-foreground">Context configuration</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading companies, brands, and teams...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block space-y-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Company
                                </span>
                                <select
                                    value={selectedCompanyId}
                                    onChange={(e) => handleCompanyChange(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                                >
                                    <option value="">Select company</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block space-y-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Brand
                                </span>
                                <select
                                    value={selectedBrandId}
                                    onChange={(e) => handleBrandChange(e.target.value)}
                                    disabled={!selectedCompanyId}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value="">Select brand</option>
                                    {brandsForCompany.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block space-y-2">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Team
                                </span>
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    disabled={!selectedBrandId}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value="">Select team</option>
                                    {teamsForBrand.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </label>

                            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 text-foreground">
                                    <Tag className="h-4 w-4" />
                                    Brain identity
                                </div>
                                <p className="mt-2">
                                    The chat will use the selected company, brand, and team as the brand frame of reference.
                                </p>
                                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                                    {configReady ? 'Ready to chat' : 'Please complete all selections'}
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── Chat panel ── */}
                <section className="flex min-h-[720px] flex-col rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                        <div>
                            <h2 className="font-semibold text-foreground">Brain chat</h2>
                            <p className="text-sm text-muted-foreground">
                                Talk to the brain as the selected brand context.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Auto-speak toggle */}
                            <button
                                type="button"
                                onClick={toggleAutoSpeak}
                                title={autoSpeak ? 'Auto-speak on — click to mute' : 'Auto-speak off — click to enable'}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                                    autoSpeak
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                <span className="hidden sm:inline">{autoSpeak ? 'Speaking' : 'Muted'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={resetChat}
                                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reset
                            </button>

                            {/* Conversation mode toggle */}
                            <button
                                type="button"
                                onClick={toggleConversationMode}
                                title={conversationMode ? 'Exit call mode' : 'Call — hands-free conversation'}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                                    conversationMode
                                        ? 'border-green-500/60 bg-green-500/10 text-green-500'
                                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {conversationMode ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                                <span className="hidden sm:inline">
                                    {conversationMode
                                        ? (callStatus === 'connecting' ? 'Connecting...'
                                            : callStatus === 'connected' ? formatCallTime(callTimer)
                                            : 'On Call')
                                        : 'Call'}
                                </span>
                            </button>

                            {/* Audio device settings */}
                            <div className="relative">
                                <button
                                    type="button"
                                    data-device-btn
                                    onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                                    title="Select microphone and speaker"
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                                        showDeviceSettings
                                            ? 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                                            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    <Mic className="h-4 w-4" />
                                    <span className="hidden sm:inline">Devices</span>
                                </button>
                                {showDeviceSettings && (
                                    <div data-device-panel className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
                                        <div className="space-y-3 text-sm">
                                            <label className="block space-y-1">
                                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Microphone</span>
                                                <select
                                                    value={selectedMicId}
                                                    onChange={(e) => {
                                                        setSelectedMicId(e.target.value);
                                                        try { localStorage.setItem('keledon_brain_mic_id', e.target.value); } catch {}
                                                    }}
                                                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                                                >
                                                    <option value="">System default</option>
                                                    {audioInputDevices.map((d) => (
                                                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 8)}…`}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="block space-y-1">
                                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Speaker</span>
                                                <select
                                                    value={selectedSpeakerId}
                                                    onChange={(e) => {
                                                        setSelectedSpeakerId(e.target.value);
                                                        try { localStorage.setItem('keledon_brain_speaker_id', e.target.value); } catch {}
                                                    }}
                                                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                                                >
                                                    <option value="">System default</option>
                                                    {audioOutputDevices.map((d) => (
                                                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 8)}…`}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <p className="text-[11px] text-muted-foreground">Speaker selection works in Chrome/Edge when using TTS or voice call audio.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Test TTS */}
                            <button
                                type="button"
                                onClick={async () => {
                                    addLog('Test TTS button clicked');
                                    const msg = 'Hello, this is a test of the audio system.';
                                    // Call speakReply directly with test text
                                    const testId = 'test-tts-' + Date.now();
                                    setMessages(cur => [...cur, {
                                        id: testId,
                                        role: 'assistant',
                                        content: '🔊 Test: ' + msg,
                                        timestamp: new Date().toISOString(),
                                    }]);
                                    await speakReply(msg, testId);
                                }}
                                title="Test TTS audio"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <Volume2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Test Audio</span>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    'flex',
                                    message.role === 'user' ? 'justify-end' : 'justify-start',
                                )}
                            >
                                <div
                                    className={cn(
                                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'border border-border bg-muted/40 text-foreground',
                                    )}
                                >
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                    <div className={cn(
                                        'mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wide',
                                        message.role === 'user'
                                            ? 'text-primary-foreground/70'
                                            : 'text-muted-foreground',
                                    )}>
                                        <span>
                                            {new Date(message.timestamp).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        {/* Speaking indicator */}
                                        {speakingMessageId === message.id && (
                                            <span className="flex items-center gap-0.5">
                                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Typing indicator while sending */}
                        {sending && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm shadow-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="border-t border-border p-5">
                        <label className="block space-y-2">
                            <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <span>{conversationMode ? 'Call with Brain' : 'Message'}</span>
                                {callStatus === 'connected' && (
                                    <span className="flex items-center gap-1.5 text-green-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                        {formatCallTime(callTimer)}
                                    </span>
                                )}
                                {callStatus === 'connecting' && (
                                    <span className="flex items-center gap-1.5 text-yellow-400">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Connecting
                                    </span>
                                )}
                            </span>
                            {conversationMode ? (
                                <div className={cn(
                                    'flex flex-col items-center justify-center rounded-2xl border-2 px-4 py-6 text-sm transition-colors',
                                    callStatus === 'connecting' && 'border-yellow-400/40 bg-yellow-500/5',
                                    callStatus === 'connected' && isListening && 'border-red-400/60 bg-red-500/5',
                                    callStatus === 'connected' && !isListening && 'border-green-400/40 bg-green-500/5',
                                    callStatus === 'disconnected' && 'border-muted bg-muted/20',
                                )}>
                                    {callStatus === 'connecting' && (
                                        <div className="text-center">
                                            <PhoneIncoming className="mx-auto h-10 w-10 text-yellow-400 animate-pulse" />
                                            <p className="mt-3 text-base font-medium text-yellow-400">Calling KELEDON Brain...</p>
                                            <p className="mt-1 text-muted-foreground">Establishing secure voice channel</p>
                                        </div>
                                    )}
                                    {callStatus === 'connected' && (
                                        <div className="w-full text-center">
                                            {/* Large status area */}
                                            <div className="mb-4">
                                                {isListening ? (
                                                    <>
                                                        <Mic className="mx-auto h-12 w-12 text-red-400 animate-pulse" />
                                                        <p className="mt-3 text-lg font-bold text-red-400">You're speaking</p>
                                                        {draft && (
                                                            <p className="mt-2 max-w-md mx-auto text-sm text-foreground/80 italic">
                                                                "{draft}"
                                                            </p>
                                                        )}
                                                    </>
                                                ) : sending ? (
                                                    <>
                                                        <Loader2 className="mx-auto h-12 w-12 text-blue-400 animate-spin" />
                                                        <p className="mt-3 text-lg font-bold text-blue-400">Brain is thinking...</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Volume2 className="mx-auto h-12 w-12 text-green-500 animate-pulse" />
                                                        <p className="mt-3 text-lg font-bold text-green-500">Brain is speaking</p>
                                                    </>
                                                )}
                                            </div>
                                            {/* Call timer */}
                                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 font-mono text-sm">
                                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                                Connected · {formatCallTime(callTimer)}
                                            </div>
                                            {/* End Call button */}
                                            <div className="mt-4 flex justify-center gap-3">
                                                {isListening && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            recognitionRef.current?.stop();
                                                            setIsListening(false);
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/40 px-4 py-2 text-sm text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                                                    >
                                                        <MicOff className="h-4 w-4" />
                                                        Mute
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={toggleConversationMode}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors shadow-lg"
                                                >
                                                    <PhoneOff className="h-4 w-4" />
                                                    End Call
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {callStatus === 'disconnected' && (
                                        <div className="text-center">
                                            <PhoneOff className="mx-auto h-10 w-10 text-muted-foreground" />
                                            <p className="mt-3 text-base font-medium text-muted-foreground">Call ended</p>
                                            <p className="mt-1 text-muted-foreground">Duration: {formatCallTime(callTimer)}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <textarea
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void handleSend();
                                        }
                                    }}
                                    placeholder={
                                        isListening
                                            ? 'Listening — speak now...'
                                            : 'Ask Brain what the brand should do, say, or explain...'
                                    }
                                    rows={4}
                                    className={cn(
                                        'w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary',
                                        isListening ? 'border-red-400/60' : 'border-border',
                                    )}
                                />
                            )}
                        </label>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                                {configReady
                                    ? conversationMode
                                        ? 'Brain will answer and re-listen automatically. Tap Call again to exit.'
                                        : 'Brain will answer using the selected company, brand, and team.'
                                    : 'Select all context fields before sending.'}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* STT Language selector */}
                                <select
                                    value={sttLang}
                                    onChange={(e) => {
                                        const lang = e.target.value;
                                        setSttLang(lang);
                                        sttLangRef.current = lang;
                                        try { localStorage.setItem('keledon_stt_lang', lang); } catch {}
                                        // Recreate recognition with new language if currently listening
                                        if (listeningRef.current) {
                                            recognitionRef.current?.stop();
                                            setTimeout(() => toggleListening(), 100);
                                        }
                                    }}
                                    title="Speech recognition language"
                                    className="rounded-xl border border-border bg-background px-2 py-2.5 text-xs outline-none transition-colors focus:border-primary"
                                >
                                    <option value="en-US">English</option>
                                    <option value="es-MX">Español</option>
                                    <option value="pt-BR">Português</option>
                                    <option value="fr-FR">Français</option>
                                    <option value="de-DE">Deutsch</option>
                                    <option value="it-IT">Italiano</option>
                                    <option value="ja-JP">日本語</option>
                                </select>
                                {/* Mic button */}
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    title={isListening ? 'Stop listening' : 'Speak to Brain'}
                                    className={cn(
                                        'inline-flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                                        isListening
                                            ? 'animate-pulse border-red-400/60 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </button>

                                {/* Send button — hidden in conversation mode */}
                                {!conversationMode && (
                                    <button
                                        type="button"
                                        onClick={() => void handleSend()}
                                        disabled={sending || !draft.trim() || !configReady}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {sending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        Send to Brain
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Debug Logs ─────────────────────────────────────────────── */}
                <details className="mt-4 rounded-lg border border-border">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
                        <span>Brain Logs ({brainLogs.length})</span>
                        <span className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(brainLogs.join('\n'));
                                    toast.success('Logs copied to clipboard');
                                }}
                                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
                            >
                                Copy
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBrainLogs([]);
                                }}
                                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
                            >
                                Clear
                            </button>
                        </span>
                    </summary>
                    <pre className="max-h-48 overflow-auto px-4 pb-3 text-xs text-muted-foreground">
                        {brainLogs.length === 0 ? (
                            <span className="italic">No logs yet</span>
                        ) : (
                            brainLogs.map((l, i) => (
                                <div key={i} className="py-0.5 leading-relaxed">{l}</div>
                            ))
                        )}
                    </pre>
                </details>
            </div>
        </div>
    );
}
