import { apiFetch } from '@/lib/api-fetch';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AUTOSPEAK_KEY } from './brain-storage';
import type { Socket } from 'socket.io-client';
import type { ChatLine } from './brain-types';

type CreateBrainVoiceOutputScope = {
  audioQueueRef: RefObject<{ data: string; seq: string; format?: string | undefined; }[]>;
  audioPlayingRef: RefObject<boolean>;
  addLog: (msg: string) => void;
  playAudioBytes: (bytes: Uint8Array<ArrayBufferLike>, mimeType: string, label: string, onEnded: () => void, onFailed: () => void) => Promise<void>;
  voiceSocketRef: RefObject<Socket | null>;
  lastChunkPlayedRef: RefObject<boolean>;
  setMessages: Dispatch<SetStateAction<ChatLine[]>>;
  setSending: Dispatch<SetStateAction<boolean>>;
  handleSend: (overrideText?: string | undefined) => Promise<void>;
  setSpeakingMessageId: Dispatch<SetStateAction<string | null>>;
  conversationModeRef: RefObject<boolean>;
  toggleListening: () => Promise<void>;
  stopSpeaking: () => void;
  ttsAbortRef: RefObject<AbortController | null>;
  resolveBrainCloudConfig: () => Promise<{ apiBase: string; wsBase: string; }>;
  selectedTeamId: string;
  autoSpeak: boolean;
  setAutoSpeak: Dispatch<SetStateAction<boolean>>;
};

export function createBrainVoiceOutput(scope: CreateBrainVoiceOutputScope) {
function playNextAudioChunk() {
    const queue = scope.audioQueueRef.current;
    if (queue.length === 0) {
      scope.audioPlayingRef.current = false;
      return;
    }
    scope.audioPlayingRef.current = true;
    const chunk = queue.shift()!;
    try {
      const binary = atob(chunk.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const isWav = chunk.format === "wav" || binary.slice(0, 4) === "RIFF";
      scope.addLog(
        `[VOICE] Backend audio chunk received seq=${chunk.seq} format=${isWav ? "wav" : "mpeg"} bytes=${bytes.length}`,
      );
      void scope.playAudioBytes(
        bytes,
        isWav ? "audio/wav" : "audio/mpeg",
        "VOICE",
        () => playNextAudioChunk(),
        () => playNextAudioChunk(),
      );
    } catch (e) {
      scope.addLog("Audio chunk play error: " + e);
      playNextAudioChunk();
    }
  }

function sendVoiceTranscript(text: string) {
    const socket = scope.voiceSocketRef.current;
    if (socket?.connected) {
      scope.addLog("Sending voice transcript: " + text);
      scope.lastChunkPlayedRef.current = false;
      scope.audioQueueRef.current = [];
      // Add user message to chat
      const userMsgId = `user-${Date.now()}`;
      scope.setMessages((cur) => [
        ...cur,
        {
          id: userMsgId,
          role: "user",
          content: text,
          timestamp: new Date().toISOString(),
        },
      ]);
      socket.emit("voice:transcript", { text, is_final: true });
      // Show Brain thinking indicator
      scope.setSending(true);
    } else {
      scope.addLog("Voice WS not connected, falling back to HTTP");
      void scope.handleSend(text);
    }
  }

function formatCallTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

function fallbackSpeak(text: string, messageId: string) {
    if (!window.speechSynthesis) {
      scope.setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      scope.setSpeakingMessageId(null);
      if (scope.conversationModeRef.current) {
        setTimeout(() => scope.toggleListening(), 300);
      }
    };
    utterance.onerror = () => scope.setSpeakingMessageId(null);
    scope.setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }

async function speakReply(text: string, messageId: string) {
    scope.addLog("speakReply() textLen=" + text.length + " msgId=" + messageId);
    scope.stopSpeaking();
    const controller = new AbortController();
    scope.ttsAbortRef.current = controller;

    try {
      let blob: Blob | null = null;
      const res = await apiFetch("/tts/speak", {
        method: "POST",
        body: JSON.stringify({ text, teamId: scope.selectedTeamId }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "audio/wav";
        const arrayBuffer = await res.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        blob = new Blob([bytes], {
          type: contentType.includes("audio/") ? contentType : "audio/wav",
        });
        scope.addLog(
          "TTS fetch OK status=" +
            res.status +
            " contentType=" +
            blob.type +
            " blobSize=" +
            blob.size,
        );
        if (!controller.signal.aborted && blob.size > 100) {
          scope.setSpeakingMessageId(messageId);
          await scope.playAudioBytes(
            bytes,
            blob.type || "audio/wav",
            "TTS",
            () => {
              scope.setSpeakingMessageId(null);
              if (scope.conversationModeRef.current) {
                scope.addLog("→ re-listen after TTS");
                setTimeout(() => scope.toggleListening(), 300);
              }
            },
            () => fallbackSpeak(text, messageId),
          );
          return;
        }
      }
      if (!controller.signal.aborted) {
        scope.addLog(
          "TTS fallback — res.ok=" +
            res.ok +
            " blobSize=" +
            (blob?.size ?? "N/A"),
        );
        fallbackSpeak(text, messageId);
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        scope.addLog("speakReply catch: " + (err instanceof Error ? err.message : String(err)));
        fallbackSpeak(text, messageId);
      }
    }
  }

function toggleAutoSpeak() {
    const next = !scope.autoSpeak;
    scope.setAutoSpeak(next);
    try {
      localStorage.setItem(AUTOSPEAK_KEY, String(next));
    } catch {
      /* ignore */
    }
    if (!next) scope.stopSpeaking();
  }

  return { playNextAudioChunk, sendVoiceTranscript, formatCallTime, speakReply, toggleAutoSpeak };
}
