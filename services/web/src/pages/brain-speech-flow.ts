import { apiFetch } from '@/lib/api-fetch';
import { toast } from 'sonner';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';

type CreateBrainSpeechFlowScope = {
  addLog: (msg: string) => void;
  selectedMicId: string;
  mediaStreamRef: RefObject<MediaStream | null>;
  audioChunksRef: RefObject<Blob[]>;
  speachesPcmChunksRef: RefObject<Float32Array[]>;
  speachesPcmSampleRateRef: RefObject<number>;
  peerConnectionRef: RefObject<RTCPeerConnection | null>;
  webrtcMicSenderRef: RefObject<RTCRtpSender | null>;
  setTransportStatus: Dispatch<SetStateAction<{ mode: "webrtc" | "ws-fallback" | "disconnected" | "initializing"; iceState?: string | undefined; peerState?: string | undefined; detail?: string | undefined; }>>;
  provisionalTextRef: RefObject<string>;
  speachesHeardSpeechRef: RefObject<boolean>;
  speachesFastSentRef: RefObject<boolean>;
  mediaRecorderRef: RefObject<MediaRecorder | null>;
  cleanupSpeachesVad: () => void;
  listeningRef: RefObject<boolean>;
  setIsListening: Dispatch<SetStateAction<boolean>>;
  conversationModeRef: RefObject<boolean>;
  sending: boolean;
  setDraft: Dispatch<SetStateAction<string>>;
  draftRef: RefObject<string>;
  voiceSocketRef: RefObject<Socket | null>;
  sendVoiceTranscript: (text: string) => void;
  handleSend: (overrideText?: string | undefined) => Promise<void>;
  makePcmWavBlob: (chunks: Float32Array[], inputSampleRate: number, outputSampleRate?: number) => Blob;
  selectedTeamId: string;
  appendSpeachesTranscriptionFields: (formData: FormData) => { language: "es" | "en"; model: string; };
  postPlaybackEchoGuardUntilRef: RefObject<number>;
  startSpeachesProvisionalRecognition: () => void;
  startSpeachesVad: (stream: MediaStream) => void;
  speakingMessageId: string | null;
  stopSpeaking: () => void;
  isListening: boolean;
  reListenTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  listenSocketRef: RefObject<Socket | null>;
  stopVoskListening: () => void;
  recognitionRef: RefObject<any>;
  sttProvider: string | null;
  startVoskListening: () => Promise<void>;
  sttLangRef: RefObject<string>;
  silenceTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  reconErrorCountRef: RefObject<number>;
};

export function createBrainSpeechFlow(scope: CreateBrainSpeechFlowScope) {
async function startSpeachesListening() {
    const appVersion = __APP_VERSION__ || "?";
    scope.addLog(
      `[v${appVersion}] STT provider=speaches → starting fast turn capture via Speaches`,
    );
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: scope.selectedMicId ? { deviceId: { exact: scope.selectedMicId } } : true,
      });
      scope.mediaStreamRef.current = stream;
      scope.audioChunksRef.current = [];
      scope.speachesPcmChunksRef.current = [];
      scope.speachesPcmSampleRateRef.current = 16000;

      // Attach mic track to the pre-negotiated WebRTC audio sender when possible.
      const micTrack = stream.getAudioTracks()[0];
      const pc = scope.peerConnectionRef.current;
      const sender = scope.webrtcMicSenderRef.current;
      if (
        micTrack &&
        pc &&
        sender &&
        pc.connectionState !== "failed" &&
        pc.connectionState !== "closed"
      ) {
        await sender.replaceTrack(micTrack);
        scope.addLog(
          `[WebRTC] mic track attached via replaceTrack; ICE=${pc.iceConnectionState} peer=${pc.connectionState}`,
        );
        scope.setTransportStatus((prev) => ({
          ...prev,
          mode: pc.connectionState === "connected" ? "webrtc" : "initializing",
          iceState: pc.iceConnectionState,
          peerState: pc.connectionState,
          detail: "Mic track attached to negotiated WebRTC sender",
        }));
      } else {
        scope.addLog(
          "[VOICE] Audio capture path: WS fallback/recorder path active for this turn",
        );
      }
      scope.provisionalTextRef.current = "";
      scope.speachesHeardSpeechRef.current = false;
      scope.speachesFastSentRef.current = false;

      const recorder = new MediaRecorder(stream);
      scope.mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) scope.audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        scope.cleanupSpeachesVad();
        const activeSender = scope.webrtcMicSenderRef.current;
        if (activeSender) {
          void activeSender.replaceTrack(null).catch((err) => {
            scope.addLog(
              `[WebRTC] mic track detach failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        }
        const provisional = scope.provisionalTextRef.current.trim();
        const heardSpeech = scope.speachesHeardSpeechRef.current;
        if (!heardSpeech && !provisional) {
          scope.addLog("[STT] Speaches: no speech detected — skipping transcription");
          stream.getTracks().forEach((t) => t.stop());
          scope.listeningRef.current = false;
          scope.setIsListening(false);
          if (scope.conversationModeRef.current) {
            setTimeout(() => {
              if (
                scope.conversationModeRef.current &&
                !scope.listeningRef.current &&
                !scope.sending
              )
                toggleListening();
            }, 300);
          }
          return;
        }
        if (
          scope.conversationModeRef.current &&
          provisional &&
          !scope.speachesFastSentRef.current
        ) {
          scope.speachesFastSentRef.current = true;
          scope.setDraft(provisional);
          scope.draftRef.current = provisional;
          scope.addLog(
            `[VOICE] Fast path: sending provisional transcript to Brain now: "${provisional.substring(0, 80)}${provisional.length > 80 ? "..." : ""}"`,
          );
          if (scope.voiceSocketRef.current?.connected)
            scope.sendVoiceTranscript(provisional);
          else void scope.handleSend(provisional);
        }
        scope.addLog(
          `[STT] Speaches: audio captured, transcribing final${provisional ? ` (provisional="${provisional.substring(0, 80)}${provisional.length > 80 ? "..." : ""}")` : ""}...`,
        );
        const wavBlob = scope.makePcmWavBlob(
          scope.speachesPcmChunksRef.current,
          scope.speachesPcmSampleRateRef.current,
          16000,
        );
        scope.addLog(
          `[STT] Speaches: sending WAV PCM ${wavBlob.size} bytes @16kHz to transcription proxy`,
        );

        // Fetch Speaches config from the API
        try {
          const cfgRes = await apiFetch(`/api/teams/${scope.selectedTeamId}/config`);
          const cfg = cfgRes.ok ? await cfgRes.json() : {};
          const _apiUrl =
            cfg.speachesApiUrl ||
            "https://speaches-production-c63f.up.railway.app";
          const _apiKey = cfg.speachesApiKey || "";
          scope.addLog(
            `[STT] Speaches proxy config resolved url=${String(_apiUrl).replace(/\/+$/, "")} key=${_apiKey ? "yes" : "no"}`,
          );

          const formData = new FormData();
          formData.append("file", wavBlob, "recording.wav");
          const sttRequest = scope.appendSpeachesTranscriptionFields(formData);
          scope.addLog(
            `[STT] Speaches final request lang=${sttRequest.language} model=${sttRequest.model}`,
          );

          const res = await apiFetch(
            `/api/teams/${scope.selectedTeamId}/speaches/transcriptions`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (res.ok) {
            const data = await res.json();
            const text = (data.text || "").trim();
            scope.addLog(
              `[TEST] STT: ✅ Speaches final transcript: "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`,
            );
            if (text) {
              const normalizedTextForNoise = text
                .toLowerCase()
                .replace(/[^a-záéíóúñü¿¡\s]/gi, "")
                .replace(/\s+/g, " ")
                .trim();
              const postPlaybackEcho =
                Date.now() < scope.postPlaybackEchoGuardUntilRef.current;
              const lowInfoFinalOnly =
                !provisional &&
                (normalizedTextForNoise.length < 6 ||
                  ["so", "yeah", "ok", "okay", "uh", "um", "eh", "ah"].includes(
                    normalizedTextForNoise,
                  ));
              if (
                lowInfoFinalOnly ||
                (postPlaybackEcho &&
                  !provisional &&
                  normalizedTextForNoise.split(" ").length <= 2)
              ) {
                scope.addLog(
                  `[STT] Speaches final looks like playback echo/noise; skipping auto-send (final="${text.substring(0, 80)}")`,
                );
                stream.getTracks().forEach((t) => t.stop());
                scope.listeningRef.current = false;
                scope.setIsListening(false);
                return;
              }
              scope.setDraft(text);
              scope.draftRef.current = text;
              if (scope.speachesFastSentRef.current) {
                const normalizedFinal = text
                  .toLowerCase()
                  .replace(/\s+/g, " ")
                  .trim();
                const normalizedProvisional = provisional
                  .toLowerCase()
                  .replace(/\s+/g, " ")
                  .trim();
                if (
                  normalizedFinal &&
                  normalizedFinal !== normalizedProvisional
                ) {
                  scope.addLog(
                    `[STT] Speaches final differed from fast provisional; not re-sending this turn (final="${text.substring(0, 80)}${text.length > 80 ? "..." : ""}")`,
                  );
                } else {
                  scope.addLog("[STT] Speaches final confirmed fast provisional");
                }
              } else {
                scope.addLog("[VOICE] Thinking… sending final transcript to Brain");
                if (scope.voiceSocketRef.current?.connected) {
                  scope.sendVoiceTranscript(text);
                } else if (scope.conversationModeRef.current) {
                  // Auto-submit in conversation mode
                  scope.addLog("→ auto-submit (speaches)");
                  scope.handleSend(text);
                }
              }
            }
          } else {
            const err = await res.text().catch(() => "");
            scope.addLog(
              `[TEST] STT: ❌ Speaches HTTP ${res.status}: ${err.substring(0, 200)}`,
            );
          }
        } catch (err) {
          scope.addLog(
            `[TEST] STT: ❌ Speaches error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        // Stop the stream tracks
        stream.getTracks().forEach((t) => t.stop());
        scope.listeningRef.current = false;
        scope.setIsListening(false);
      };

      recorder.start(250); // collect short chunks so VAD stop submits quickly
      scope.listeningRef.current = true;
      scope.setIsListening(true);
      scope.startSpeachesProvisionalRecognition();
      scope.startSpeachesVad(stream);
      scope.addLog(
        `[v${appVersion}] Speaches: listening with VAD (silence≈1500ms, max≈30s)...`,
      );

      // Interruption: if Brain is speaking, cut it off
      if (scope.speakingMessageId) {
        scope.addLog("→ interruption! stopping TTS");
        scope.stopSpeaking();
        // Notify backend so it can stop TTS at the source too
        scope.voiceSocketRef.current?.emit("voice:interrupt");
      }
    } catch (err) {
      scope.addLog(
        `[v${appVersion}] Speaches: ❌ could not start: ${err instanceof Error ? err.message : String(err)}`,
      );
      toast.error("Could not start mic for Speaches");
      scope.listeningRef.current = false;
      scope.setIsListening(false);
    }
  }

function stopSpeachesListening() {
    scope.cleanupSpeachesVad();
    if (
      scope.mediaRecorderRef.current &&
      scope.mediaRecorderRef.current.state !== "inactive"
    ) {
      scope.mediaRecorderRef.current.stop();
    }
    scope.mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    scope.mediaStreamRef.current = null;
  }

async function toggleListening() {
    const action = scope.isListening ? "STOPPING" : "STARTING";
    scope.addLog(`[v${__APP_VERSION__ || "?"}] 👤 ACTION: ${action} mic listening`);
    // Clear any pending re-listen timers
    if (scope.reListenTimerRef.current) {
      clearTimeout(scope.reListenTimerRef.current);
      scope.reListenTimerRef.current = null;
    }

    if (scope.listeningRef.current) {
      scope.addLog("→ stopping STT");
      if (scope.listenSocketRef.current) {
        scope.stopVoskListening();
      } else if (
        scope.mediaRecorderRef.current &&
        scope.mediaRecorderRef.current.state !== "inactive"
      ) {
        stopSpeachesListening();
      } else {
        scope.listeningRef.current = false;
        scope.recognitionRef.current?.stop();
        scope.setIsListening(false);
      }
      return;
    }

    if (scope.sttProvider === "speaches") {
      await startSpeachesListening();
      return;
    }

    if (scope.sttProvider === "vosk") {
      try {
        await scope.startVoskListening();
        return;
      } catch (error) {
        scope.addLog(
          `[v${__APP_VERSION__ || "?"}] Vosk unavailable, falling back to browser SpeechRecognition: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error(
        "Speech recognition not supported in this browser (try Chrome or Edge)",
      );
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = scope.sttLangRef.current || navigator.language || "en-US";

    recognition.onstart = () => {
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}] STT: lang=${recognition.lang}, continuous=${recognition.continuous}, interim=${recognition.interimResults}`,
      );
      scope.addLog("recognition started (continuous)");
      // Interruption: if Brain is speaking, cut it off
      if (scope.speakingMessageId) {
        scope.addLog("→ interruption! stopping TTS");
        scope.stopSpeaking();
        // Notify backend so it can stop TTS at the source too
        scope.voiceSocketRef.current?.emit("voice:interrupt");
      }
      scope.listeningRef.current = true;
      scope.setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        scope.setDraft(final);
        scope.draftRef.current = final;
        scope.addLog('STT final: "' + final.trimEnd() + '"');
        // Reset silence timer — auto-submit after 1.2s of silence
        if (scope.silenceTimerRef.current) clearTimeout(scope.silenceTimerRef.current);
        scope.silenceTimerRef.current = setTimeout(() => {
          if (scope.conversationModeRef.current && scope.draftRef.current?.trim()) {
            scope.addLog("→ auto-submit (silence timer)");
            const text = scope.draftRef.current;
            scope.draftRef.current = "";
            if (scope.voiceSocketRef.current?.connected) {
              scope.sendVoiceTranscript(text);
            } else {
              void scope.handleSend(text);
            }
          }
        }, 1200);
      } else if (interim) {
        scope.setDraft(interim);
        scope.draftRef.current = interim;
      }
    };

    recognition.onend = () => {
      scope.addLog(
        "recognition onend, draftRef=" +
          (scope.draftRef.current
            ? '"' + scope.draftRef.current.trimEnd() + '"'
            : "(empty)"),
      );
      scope.listeningRef.current = false;
      scope.setIsListening(false);
      // Reset error counter on successful ended recognition (not error-triggered)
      scope.reconErrorCountRef.current = 0;
      // In continuous mode, restart if we're still in conversation mode
      if (
        scope.conversationModeRef.current &&
        scope.recognitionRef.current === recognition
      ) {
        scope.addLog("→ restarting recognition in 300ms");
        scope.reListenTimerRef.current = setTimeout(() => {
          if (scope.conversationModeRef.current && !scope.listeningRef.current) {
            toggleListening();
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      scope.addLog("recognition error: " + event.error);
      scope.reconErrorCountRef.current++;
      scope.listeningRef.current = false;
      scope.setIsListening(false);
      // Don't show toast for transient errors
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error("Microphone error: " + event.error);
      }
      // Restart on transient errors in conversation mode (max 3 consecutive)
      if (
        scope.conversationModeRef.current &&
        event.error !== "aborted" &&
        scope.recognitionRef.current === recognition
      ) {
        if (scope.reconErrorCountRef.current >= 3) {
          scope.addLog("→ too many recognition errors, giving up");
          toast.error("Microphone keeps failing — check your mic and refresh");
          scope.reconErrorCountRef.current = 0;
          return;
        }
        scope.reListenTimerRef.current = setTimeout(() => {
          if (scope.conversationModeRef.current && !scope.listeningRef.current) {
            toggleListening();
          }
        }, 500);
      }
    };

    scope.listeningRef.current = true;
    scope.recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      scope.addLog("recognition start error: " + e);
      scope.listeningRef.current = false;
    }
  }

  return { startSpeachesListening, stopSpeachesListening, toggleListening };
}
