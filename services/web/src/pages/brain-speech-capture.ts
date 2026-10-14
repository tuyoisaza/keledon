import { apiFetch } from '@/lib/api-fetch';
import { io, type Socket } from 'socket.io-client';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Team } from '@/lib/crud-api';

type CreateBrainSpeechCaptureScope = {
  sttLangRef: RefObject<string>;
  addLog: (msg: string) => void;
  resolveBrainCloudConfig: () => Promise<{ apiBase: string; wsBase: string; }>;
  selectedTeam: Team | undefined;
  listenSocketRef: RefObject<Socket | null>;
  selectedMicId: string;
  listeningRef: RefObject<boolean>;
  listenAudioStreamRef: RefObject<MediaStream | null>;
  listenAudioContextRef: RefObject<AudioContext | null>;
  listenSourceRef: RefObject<MediaStreamAudioSourceNode | null>;
  listenProcessorRef: RefObject<ScriptProcessorNode | null>;
  setIsListening: Dispatch<SetStateAction<boolean>>;
  setDraft: Dispatch<SetStateAction<string>>;
  draftRef: RefObject<string>;
  conversationModeRef: RefObject<boolean>;
  sendVoiceTranscript: (text: string) => void;
  provisionalRecognitionRef: RefObject<any>;
  provisionalTextRef: RefObject<string>;
  speachesStopTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  speachesVadProcessorRef: RefObject<ScriptProcessorNode | null>;
  speachesVadSourceRef: RefObject<MediaStreamAudioSourceNode | null>;
  speachesVadContextRef: RefObject<AudioContext | null>;
  mediaRecorderRef: RefObject<MediaRecorder | null>;
  speachesPcmSampleRateRef: RefObject<number>;
  speachesPcmChunksRef: RefObject<Float32Array[]>;
  speachesHeardSpeechRef: RefObject<boolean>;
  stopSpeachesListening: () => void;
};

export function createBrainSpeechCapture(scope: CreateBrainSpeechCaptureScope) {
function getSpeachesTranscriptionLanguage(): "es" | "en" {
    const lang = (
      scope.sttLangRef.current ||
      navigator.language ||
      "en"
    ).toLowerCase();
    return lang.startsWith("es") ? "es" : "en";
  }

function getSpeachesTranscriptionModel(language: "es" | "en"): string {
    // Legacy behavior used Systran/faster-distil-whisper-small.en for every turn.
    // Keep that fast English-only model for English, but let the API proxy map
    // whisper-1 + language=es to the installed multilingual model.
    return language === "en"
      ? "Systran/faster-distil-whisper-small.en"
      : "whisper-1";
  }

function appendSpeachesTranscriptionFields(formData: FormData): {
    language: "es" | "en";
    model: string;
  } {
    const language = getSpeachesTranscriptionLanguage();
    const model = getSpeachesTranscriptionModel(language);
    formData.append("model", model);
    formData.append("response_format", "json");
    formData.append("language", language);
    return { language, model };
  }

function floatTo16BitPcmBase64(
    input: Float32Array,
    inputSampleRate: number,
    outputSampleRate = 16000,
  ): string {
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
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

function makePcmWavBlob(
    chunks: Float32Array[],
    inputSampleRate: number,
    outputSampleRate = 16000,
  ): Blob {
    const totalInputSamples = chunks.reduce(
      (sum, chunk) => sum + chunk.length,
      0,
    );
    const merged = new Float32Array(totalInputSamples);
    let mergeOffset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, mergeOffset);
      mergeOffset += chunk.length;
    }
    const ratio = inputSampleRate / outputSampleRate;
    const sampleCount = Math.floor(merged.length / ratio);
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);
    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++)
        view.setUint8(offset + i, value.charCodeAt(i));
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, outputSampleRate, true);
    view.setUint32(28, outputSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, sampleCount * 2, true);
    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.floor(i * ratio);
      const s = Math.max(-1, Math.min(1, merged[idx] || 0));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

async function startVoskListening(): Promise<void> {
    const appVersion = __APP_VERSION__ || "?";
    scope.addLog(
      `[v${appVersion}] STT provider=vosk → starting Railway Vosk session`,
    );
    const { apiBase, wsBase } = await scope.resolveBrainCloudConfig();
    const sessionRes = await apiFetch(`${apiBase}/listening-sessions`, {
      method: "POST",
      body: JSON.stringify({
        source: "brain-call",
        tabUrl: window.location.href,
        tabTitle: document.title,
      }),
    });
    if (!sessionRes.ok) {
      const body = await sessionRes.text().catch(() => "");
      throw new Error(
        `Vosk session create failed ${sessionRes.status}: ${body}`,
      );
    }
    const session = await sessionRes.json();
    const sessionId = session.sessionId;
    const language = (scope.sttLangRef.current || navigator.language || "en")
      .toLowerCase()
      .startsWith("es")
      ? "es"
      : "en";
    const listenUrl = `${wsBase}/listen`;
    scope.addLog(
      `[v${appVersion}] Connecting Vosk WS → ${listenUrl} path=/listen/ws`,
    );
    const listenSocket = io(listenUrl, {
      path: "/listen/ws",
      query: {
        session: sessionId,
        language,
        debug: "false",
        team_id: scope.selectedTeam?.id || "",
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });
    scope.listenSocketRef.current = listenSocket;

    return new Promise<void>((resolve, reject) => {
      const VOSK_FAIL_REASON = "Vosk module load failed";
      let rejected = false;
      const failSafe = setTimeout(() => {
        if (!rejected && !listenSocket.connected) {
          rejected = true;
          reject(new Error("Vosk connection timeout"));
        }
      }, 8000);

      listenSocket.on("connect", async () => {
        scope.addLog(
          `[v${appVersion}] Vosk WS connected: ${listenSocket.id} | lang=${language}`,
        );
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: scope.selectedMicId
              ? { deviceId: { exact: scope.selectedMicId } }
              : true,
            video: false,
          });
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (event) => {
            if (!listenSocket.connected || !scope.listeningRef.current) return;
            const input = event.inputBuffer.getChannelData(0);
            const payload = floatTo16BitPcmBase64(
              input,
              audioCtx.sampleRate,
              16000,
            );
            listenSocket.emit("AUDIO_CHUNK", { payload });
          };
          source.connect(processor);
          processor.connect(audioCtx.destination);
          scope.listenAudioStreamRef.current = stream;
          scope.listenAudioContextRef.current = audioCtx;
          scope.listenSourceRef.current = source;
          scope.listenProcessorRef.current = processor;
          scope.listeningRef.current = true;
          scope.setIsListening(true);
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

      listenSocket.on("asr.partial", (data: { text?: string }) => {
        if (data.text) {
          scope.setDraft(data.text);
          scope.draftRef.current = data.text;
        }
      });
      listenSocket.on("asr.final", (data: { text?: string }) => {
        const text = (data.text || "").trim();
        if (!text) return;
        scope.addLog(`[v${appVersion}] Vosk final: "${text}"`);
        scope.setDraft(text);
        scope.draftRef.current = text;
        if (scope.conversationModeRef.current) {
          scope.draftRef.current = "";
          scope.sendVoiceTranscript(text);
        }
      });
      listenSocket.on("session.ended", (data: any) => {
        const reason = data?.reason || "unknown";
        scope.addLog(`[v${appVersion}] Vosk session ended: ${reason}`);
        clearTimeout(failSafe);
        if (
          reason.includes("worker_error") &&
          reason.includes(VOSK_FAIL_REASON)
        ) {
          if (!rejected) {
            rejected = true;
            stopVoskListening();
            reject(new Error(reason));
          }
        } else {
          stopVoskListening();
        }
      });
      listenSocket.on("connect_error", (err) => {
        scope.addLog(`[v${appVersion}] Vosk WS connect error: ${err.message}`);
        clearTimeout(failSafe);
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      });
    });
  }

function stopVoskListening(): void {
    scope.listenProcessorRef.current?.disconnect();
    scope.listenSourceRef.current?.disconnect();
    scope.listenAudioContextRef.current?.close().catch(() => undefined);
    scope.listenAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (scope.listenSocketRef.current) {
      if (scope.listenSocketRef.current.connected)
        scope.listenSocketRef.current.emit("session.stop");
      scope.listenSocketRef.current.removeAllListeners();
      scope.listenSocketRef.current.disconnect();
    }
    scope.listenProcessorRef.current = null;
    scope.listenSourceRef.current = null;
    scope.listenAudioContextRef.current = null;
    scope.listenAudioStreamRef.current = null;
    scope.listenSocketRef.current = null;
    scope.listeningRef.current = false;
    scope.setIsListening(false);
  }

function stopSpeachesProvisionalRecognition() {
    const provisional = scope.provisionalRecognitionRef.current;
    scope.provisionalRecognitionRef.current = null;
    if (provisional) {
      try {
        provisional.onresult = null;
        provisional.onerror = null;
        provisional.onend = null;
        provisional.stop();
      } catch {
        /* ignore */
      }
    }
  }

function startSpeachesProvisionalRecognition() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      scope.addLog("[STT] Provisional transcript unavailable in this browser");
      return;
    }
    try {
      const provisional = new SR();
      provisional.continuous = true;
      provisional.interimResults = true;
      provisional.lang = scope.sttLangRef.current || navigator.language || "en-US";
      provisional.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) final += transcript;
          else interim += transcript;
        }
        const text = (final || interim).trim();
        if (text) {
          scope.provisionalTextRef.current = text;
          scope.setDraft(text);
          scope.draftRef.current = text;
        }
      };
      provisional.onerror = (event: any) =>
        scope.addLog(
          "[STT] Provisional transcript ended: " + (event?.error || "unknown"),
        );
      provisional.onend = () => {
        if (
          scope.listeningRef.current &&
          scope.provisionalRecognitionRef.current === provisional
        ) {
          try {
            provisional.start();
          } catch {
            /* ignore */
          }
        }
      };
      scope.provisionalRecognitionRef.current = provisional;
      provisional.start();
      scope.addLog(
        "[STT] Provisional transcript: ON (Speaches final remains source of truth)",
      );
    } catch (err) {
      scope.addLog(
        "[STT] Provisional transcript start failed: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

function cleanupSpeachesVad() {
    if (scope.speachesStopTimerRef.current) {
      clearTimeout(scope.speachesStopTimerRef.current);
      scope.speachesStopTimerRef.current = null;
    }
    scope.speachesVadProcessorRef.current?.disconnect();
    scope.speachesVadSourceRef.current?.disconnect();
    scope.speachesVadContextRef.current?.close().catch(() => undefined);
    scope.speachesVadProcessorRef.current = null;
    scope.speachesVadSourceRef.current = null;
    scope.speachesVadContextRef.current = null;
    stopSpeachesProvisionalRecognition();
  }

function startSpeachesVad(stream: MediaStream) {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      let heardSpeech = false;
      let silenceMs = 0;
      let elapsedMs = 0;
      let lastLevelLog = 0;
      const minListenMs = 900;
      const maxListenMs = 30000;
      const silenceStopMs = 1500;
      const threshold = 0.018;

      processor.onaudioprocess = (event) => {
        if (
          !scope.listeningRef.current ||
          scope.mediaRecorderRef.current?.state !== "recording"
        )
          return;
        const input = event.inputBuffer.getChannelData(0);
        scope.speachesPcmSampleRateRef.current = audioCtx.sampleRate;
        scope.speachesPcmChunksRef.current.push(new Float32Array(input));
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / Math.max(1, input.length));
        const frameMs = (input.length / audioCtx.sampleRate) * 1000;
        elapsedMs += frameMs;
        if (rms > threshold) {
          heardSpeech = true;
          scope.speachesHeardSpeechRef.current = true;
          silenceMs = 0;
        } else if (heardSpeech) {
          silenceMs += frameMs;
        }
        if (elapsedMs - lastLevelLog > 1200) {
          lastLevelLog = elapsedMs;
          scope.addLog(
            `[STT] Speaches listening… level=${rms.toFixed(3)} heard=${heardSpeech ? "yes" : "no"}`,
          );
        }
        if (
          heardSpeech &&
          elapsedMs > minListenMs &&
          silenceMs >= silenceStopMs
        ) {
          scope.addLog(
            `[STT] Speaches VAD: ${Math.round(silenceMs)}ms silence → transcribe now`,
          );
          scope.stopSpeachesListening();
        } else if (elapsedMs >= maxListenMs) {
          scope.addLog(
            "[STT] Speaches VAD: max turn length reached → transcribe now",
          );
          scope.stopSpeachesListening();
        }
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
      scope.speachesVadContextRef.current = audioCtx;
      scope.speachesVadSourceRef.current = source;
      scope.speachesVadProcessorRef.current = processor;
      scope.speachesStopTimerRef.current = setTimeout(() => {
        if (
          scope.listeningRef.current &&
          scope.mediaRecorderRef.current?.state === "recording"
        ) {
          scope.addLog("[STT] Speaches VAD: safety stop → transcribe now");
          scope.stopSpeachesListening();
        }
      }, maxListenMs + 1500);
    } catch (err) {
      scope.addLog(
        "[STT] Speaches VAD unavailable: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  return { appendSpeachesTranscriptionFields, makePcmWavBlob, startVoskListening, stopVoskListening, startSpeachesProvisionalRecognition, cleanupSpeachesVad, startSpeachesVad };
}
