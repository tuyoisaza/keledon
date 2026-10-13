import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/config';
import { AUTOSPEAK_KEY } from '@/lib/brain-chat-storage';

export function useBrainVoiceOutput() {
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [autoSpeak, setAutoSpeak] = useState(() => {
        try { return localStorage.getItem(AUTOSPEAK_KEY) !== 'false'; } catch { return true; }
    });
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsAbortRef = useRef<AbortController | null>(null);

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
        } catch (err: unknown) {
            if (!(err instanceof DOMException && err.name === 'AbortError')) fallbackSpeak(text, messageId);
        }
    }

    function toggleAutoSpeak() {
        const next = !autoSpeak;
        setAutoSpeak(next);
        try { localStorage.setItem(AUTOSPEAK_KEY, String(next)); } catch { /* ignore */ }
        if (!next) stopSpeaking();
    }

    useEffect(() => () => {
        ttsAbortRef.current?.abort();
        audioRef.current?.pause();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, []);

    return { autoSpeak, speakingMessageId, speakReply, stopSpeaking, toggleAutoSpeak };
}
