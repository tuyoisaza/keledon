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
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/config';
import {
    brainChat,
    getBrands,
    getCompanies,
    getTeams,
    type Brand,
    type Company,
    type Team,
} from '@/lib/crud-api';

import type { ChatLine } from './brain-types';
import { storageKeyFor, readStoredContext, saveStoredContext, AUTOSPEAK_KEY } from './brain-storage';

export function useBrainChat() {
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

    // Voice state
    const [isListening, setIsListening] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [autoSpeak, setAutoSpeak] = useState(() => {
        try { return localStorage.getItem(AUTOSPEAK_KEY) !== 'false'; } catch { return true; }
    });

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsAbortRef = useRef<AbortController | null>(null);

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

    // Stop everything on unmount
    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            ttsAbortRef.current?.abort();
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
            if (window.speechSynthesis) window.speechSynthesis.cancel();
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

    function fallbackSpeak(text: string, messageId: string) {
        if (!window.speechSynthesis) { setSpeakingMessageId(null); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        setSpeakingMessageId(messageId);
        window.speechSynthesis.speak(utterance);
    }

    async function speakReply(text: string, messageId: string) {
        stopSpeaking();
        const controller = new AbortController();
        ttsAbortRef.current = controller;

        try {
            const res = await fetch(`${API_URL}/tts/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: controller.signal,
            });

            if (controller.signal.aborted) return;

            if (res.ok) {
                const blob = await res.blob();
                if (!controller.signal.aborted && blob.size > 100) {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audioRef.current = audio;
                    audio.onended = () => { URL.revokeObjectURL(url); setSpeakingMessageId(null); };
                    audio.onerror = () => { URL.revokeObjectURL(url); fallbackSpeak(text, messageId); };
                    setSpeakingMessageId(messageId);
                    await audio.play();
                    return;
                }
            }
            if (!controller.signal.aborted) fallbackSpeak(text, messageId);
        } catch (err: any) {
            if (err?.name !== 'AbortError') fallbackSpeak(text, messageId);
        }
    }

    function toggleAutoSpeak() {
        const next = !autoSpeak;
        setAutoSpeak(next);
        try { localStorage.setItem(AUTOSPEAK_KEY, String(next)); } catch { /* ignore */ }
        if (!next) stopSpeaking();
    }

    // ── STT ─────────────────────────────────────────────────────────────

    function toggleListening() {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            toast.error('Speech recognition not supported in this browser (try Chrome or Edge)');
            return;
        }

        const recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);

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
            if (final) setDraft(final);
            else if (interim) setDraft(interim);
        };

        recognition.onend = () => setIsListening(false);

        recognition.onerror = (event: any) => {
            setIsListening(false);
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                toast.error(`Microphone error: ${event.error}`);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
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

    async function handleSend() {
        const trimmed = draft.trim();
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
  return {
    companies,
    brands,
    teams,
    selectedCompanyId,
    selectedBrandId,
    selectedTeamId,
    messages,
    draft,
    loading,
    sending,
    isListening,
    speakingMessageId,
    autoSpeak,
    messagesEndRef,
    recognitionRef,
    audioRef,
    setDraft,
    handleSend,
    handleCompanyChange,
    handleBrandChange,
    speakReply,
    setAutoSpeak,
    setMessages,
  };
}
