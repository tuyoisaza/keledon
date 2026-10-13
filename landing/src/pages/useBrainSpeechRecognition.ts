import { useRef } from 'react';
import { toast } from 'sonner';
import type { Dispatch, SetStateAction } from 'react';

type SpeechRecognitionResultEvent = {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRecognitionErrorEvent = { error: string };

type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
};

export function useBrainSpeechRecognition(
    isListening: boolean,
    setIsListening: Dispatch<SetStateAction<boolean>>,
    setDraft: Dispatch<SetStateAction<string>>,
) {
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

    function toggleListening() {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const browserWindow = window as typeof window & {
            SpeechRecognition?: new () => SpeechRecognitionLike;
            webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        };
        const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Speech recognition not supported in this browser (try Chrome or Edge)');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            if (final) setDraft(final);
            else if (interim) setDraft(interim);
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            setIsListening(false);
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                toast.error(`Microphone error: ${event.error}`);
            }
        };
        recognitionRef.current = recognition;
        recognition.start();
    }

    return { recognitionRef, toggleListening };
}
