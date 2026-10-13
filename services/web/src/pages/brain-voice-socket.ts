import { toast } from 'sonner';
import { io, type Socket } from 'socket.io-client';
import { executeRpaSteps, type RpaStep } from '@/lib/rpa-engine';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { User } from '@/context/AuthContext';
import type { Brand, Company, Team } from '@/lib/crud-api';
import type { ChatLine } from './brain-types';

type CreateBrainVoiceSocketScope = {
  voiceSocketRef: RefObject<Socket | null>;
  voiceSessionIdRef: RefObject<string | null>;
  resolveBrainCloudConfig: () => Promise<{ apiBase: string; wsBase: string; }>;
  addLog: (msg: string) => void;
  user: User | null;
  setCallStatus: Dispatch<SetStateAction<"idle" | "connecting" | "connected" | "disconnected">>;
  setCallTimer: Dispatch<SetStateAction<number>>;
  callTimerRef: RefObject<ReturnType<typeof setInterval> | null>;
  selectedCompany: Company | undefined;
  selectedBrand: Brand | undefined;
  selectedTeam: Team | undefined;
  sttLangRef: RefObject<string>;
  fetchPipelineStatus: (sessionId: string) => Promise<void>;
  setTransportStatus: Dispatch<SetStateAction<{ mode: "disconnected" | "webrtc" | "ws-fallback" | "initializing"; iceState?: string | undefined; peerState?: string | undefined; detail?: string | undefined; }>>;
  pipelinePollRef: RefObject<ReturnType<typeof setInterval> | null>;
  setSending: Dispatch<SetStateAction<boolean>>;
  listeningRef: RefObject<boolean>;
  recognitionRef: RefObject<any>;
  setMessages: Dispatch<SetStateAction<ChatLine[]>>;
  lastBrainReplyRef: RefObject<string>;
  ttsFallbackTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  greetingSpeechActiveRef: RefObject<boolean>;
  audioPlayingRef: RefObject<boolean>;
  conversationModeRef: RefObject<boolean>;
  toggleListening: () => Promise<void>;
  audioQueueRef: RefObject<{ data: string; seq: string; format?: string | undefined; }[]>;
  lastChunkPlayedRef: RefObject<boolean>;
  playNextAudioChunk: () => void;
  formatCallTime: (seconds: number) => string;
  callTimer: number;
  setPipelineStatus: Dispatch<SetStateAction<{ stt: { id: string; health: string; name: string; detail?: string } | null; tts: { id: string; health: string; name: string; detail?: string } | null; llm: { id: string; health: string; name: string; detail?: string } | null; vadEnabled: boolean; bargeInEnabled: boolean } | null>>;
  peerConnectionRef: RefObject<RTCPeerConnection | null>;
  webrtcMicSenderRef: RefObject<RTCRtpSender | null>;
  webrtcConnectedRef: RefObject<boolean>;
};

export function createBrainVoiceSocket(scope: CreateBrainVoiceSocketScope) {
async function connectVoiceSocket() {
    if (scope.voiceSocketRef.current?.connected) return;
    const token = sessionStorage.getItem("auth_token");
    const sessionId = `brain_${Date.now()}`;
    scope.voiceSessionIdRef.current = sessionId;
    const { wsBase } = await scope.resolveBrainCloudConfig();
    const fullUrl = `${wsBase}/ws/voice`;
    const appVersion = __APP_VERSION__ || "0.4.6";
    scope.addLog(`[v${appVersion}] Connecting voice WS → ${fullUrl}`);
    scope.addLog(
      `[v${appVersion}] Session: ${sessionId} | User: ${scope.user?.email || scope.user?.id || "anon"}`,
    );
    scope.addLog(
      `[v${appVersion}] Auth token: ${token ? token.substring(0, 12) + "..." : "MISSING!"}`,
    );
    scope.setCallStatus("connecting");
    const socket = io(fullUrl, {
      auth: {
        token,
        device_id: `brain_${scope.user?.id || "anon"}`,
        session_id: sessionId,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });
    socket.on("connect", () => {
      scope.addLog(`[v${__APP_VERSION__ || "?"}] Voice WS connected: ${socket.id}`);
      scope.setCallStatus("connected");
      // Start call timer
      scope.setCallTimer(0);
      if (scope.callTimerRef.current) clearInterval(scope.callTimerRef.current);
      scope.callTimerRef.current = setInterval(() => {
        scope.setCallTimer((t) => t + 1);
      }, 1000);
      // Send call:start with current context
      socket.emit("call:start", {
        session_id: sessionId,
        call_type: "brain_conversation",
        context: {
          companyName: scope.selectedCompany?.name || "Unspecified Company",
          brandName: scope.selectedBrand?.name || "Unspecified Brand",
          teamName: scope.selectedTeam?.name || "Unspecified Team",
          companyId: scope.selectedCompany?.id,
          brandId: scope.selectedBrand?.id,
          teamId: scope.selectedTeam?.id,
          language: scope.sttLangRef.current || "en-US",
        },
      });
      // Fetch live pipeline provider status once on connect
      void scope.fetchPipelineStatus(sessionId);
      // Try WebRTC peer connection (fallback to WS audio if fails)
      scope.setTransportStatus({
        mode: "initializing",
        detail: "Negotiating WebRTC offer/answer",
      });
      scope.addLog(
        "[VOICE] Transport negotiation: attempting WebRTC; will fall back to WS audio if unavailable",
      );
      void setupWebRtc().then((ok) => {
        if (ok) {
          scope.addLog(
            "[VOICE] WebRTC SDP negotiation complete; waiting for ICE/peer connected before selecting media channel",
          );
        } else {
          scope.setTransportStatus({
            mode: "ws-fallback",
            detail: "WebRTC unavailable; using existing WS audio path",
          });
          scope.addLog("[VOICE] Transport selected: WS fallback audio path");
        }
      });
      // Poll provider status every 10s during session
      if (scope.pipelinePollRef.current) clearInterval(scope.pipelinePollRef.current);
      scope.pipelinePollRef.current = setInterval(() => {
        const sid = scope.voiceSessionIdRef.current;
        if (sid) void scope.fetchPipelineStatus(sid);
      }, 10_000);
    });
    socket.on("voice:call_started", (data: any) => {
      scope.addLog(`[v${__APP_VERSION__ || "?"}] Call started: ${data.session_id}`);
    });
    socket.on("voice:brain:thinking", (data: any) => {
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}] Brain thinking "${data.text?.slice(0, 60)}"`,
      );
    });
    socket.on("voice:brain:reply", (data: any) => {
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}] Brain reply: ${data.text?.slice(0, 120)} | API v${data.apiVersion || "?"}`,
      );
      scope.setSending(false);
      // Stop listening while brain speaks
      if (scope.listeningRef.current) {
        scope.recognitionRef.current?.stop();
      }
      const replyId = `assistant-${Date.now()}`;
      scope.setMessages((cur) => [
        ...cur,
        {
          id: replyId,
          role: "assistant",
          content: data.text || "",
          timestamp: new Date().toISOString(),
        },
      ]);
      // Save brain reply text in a ref (synchronous) so TTS fallback
      // can read it even before React state update processes
      scope.lastBrainReplyRef.current = data.text || "";
      // ── Greeting: use browser SpeechSynthesis instantly, skip Speaches ──
      if (data.source === "greeting") {
        if (scope.ttsFallbackTimerRef.current)
          clearTimeout(scope.ttsFallbackTimerRef.current);
        const text = data.text || "";
        if (text && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = scope.sttLangRef.current || "es-MX";
          utterance.rate = 1.1;
          scope.greetingSpeechActiveRef.current = true;
          utterance.onend = () => {
            scope.greetingSpeechActiveRef.current = false;
            scope.audioPlayingRef.current = false;
            if (scope.conversationModeRef.current && !scope.listeningRef.current) {
              setTimeout(() => scope.toggleListening(), 300);
            }
          };
          scope.audioPlayingRef.current = true;
          window.speechSynthesis.speak(utterance);
          scope.addLog(
            `[v${__APP_VERSION__ || "?"}] Greeting: instant SpeechSynthesis (source=greeting)`,
          );
        }
        return; // Don't set timer or queue Speaches for greeting
      }
      // ── Brain reply: wait for Speaches TTS (no SpeechSynthesis fallback) ──
      // The greeting already provides instant feedback.
      // For subsequent replies, wait for Speaches to maintain a single consistent voice.
      // If Speaches fails completely, the no-audio fallback in voice:audio:end handles it.
      if (scope.ttsFallbackTimerRef.current)
        clearTimeout(scope.ttsFallbackTimerRef.current);
      // Also clean up the audio reference from progressive enhancement
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
        scope.audioPlayingRef.current = false;
      }
    });
    socket.on(
      "voice:audio",
      (data: {
        audio?: string;
        sequence: string;
        format?: string;
        duration?: number;
        apiVersion?: string;
        voice?: string;
        language?: string;
        ttsElapsedMs?: number;
      }) => {
        // Cancel TTS fallback timer — backend streaming is working
        if (scope.ttsFallbackTimerRef.current) {
          clearTimeout(scope.ttsFallbackTimerRef.current);
          scope.ttsFallbackTimerRef.current = null;
        }
        // Cancel browser SpeechSynthesis if active — premium Speaches audio arrived
        if (data.audio && window.speechSynthesis?.speaking) {
          scope.addLog(
            "[VOICE] Speaches audio ready — switching from browser SpeechSynthesis to premium voice",
          );
          window.speechSynthesis.cancel();
          scope.audioPlayingRef.current = false; // Allow queued premium audio to play
        }
        if (data.sequence === "end") {
          // If greeting was handled by SpeechSynthesis, ignore Speaches end event
          if (scope.greetingSpeechActiveRef.current) return;
          scope.addLog(
            "Audio stream end" +
              (data.duration ? " dur=" + data.duration.toFixed(1) : "") +
              (data.voice || data.language || data.ttsElapsedMs
                ? ` voice=${data.voice || "?"} lang=${data.language || "?"} tts=${data.ttsElapsedMs ?? "?"}ms`
                : "") +
              ` | API v${data.apiVersion || "?"}`,
          );
          scope.audioPlayingRef.current = false;
          // If no audio chunks were played, use browser SpeechSynthesis fallback
          if (
            scope.audioQueueRef.current.length === 0 &&
            !scope.lastChunkPlayedRef.current
          ) {
            // Don't restart if the progressive enhancement timer already started it
            if (scope.audioPlayingRef.current) return;
            scope.addLog(
              `[v${__APP_VERSION__ || "?"}] No audio from backend — using browser SpeechSynthesis`,
            );
            const fallbackText = scope.lastBrainReplyRef.current;
            if (fallbackText && window.speechSynthesis) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(fallbackText);
              utterance.lang = scope.sttLangRef.current || "en-US";
              utterance.onend = () => {
                scope.audioPlayingRef.current = false;
                if (scope.conversationModeRef.current && !scope.listeningRef.current) {
                  setTimeout(() => scope.toggleListening(), 300);
                }
              };
              scope.audioPlayingRef.current = true;
              window.speechSynthesis.speak(utterance);
              return;
            }
          }
          // Re-listen in conversation mode
          setTimeout(() => {
            if (scope.conversationModeRef.current && !scope.listeningRef.current) {
              scope.toggleListening();
            }
          }, 300);
          return;
        }
        if (!data.audio) {
          scope.addLog("[VOICE] Backend audio chunk missing payload — skipping");
          return;
        }
        // If greeting already handled by SpeechSynthesis, skip Speaches audio
        if (scope.greetingSpeechActiveRef.current) {
          scope.addLog(
            "[VOICE] Greeting already spoken by SpeechSynthesis — skipping Speaches audio chunk",
          );
          return;
        }
        // Clear flag: we received actual audio data from backend
        scope.lastChunkPlayedRef.current = true;
        // Queue the chunk
        scope.audioQueueRef.current.push({
          data: data.audio,
          seq: data.sequence || "chunk",
          format: data.format,
        });
        if (!scope.audioPlayingRef.current) {
          scope.playNextAudioChunk();
        }
      },
    );
    socket.on("voice:error", (data: any) => {
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}] WS ERROR: ${data.error || "unknown"}`,
      );
      scope.setSending(false);
      scope.audioPlayingRef.current = false;
      scope.audioQueueRef.current = [];
      toast.error("Voice error: " + (data.error || "unknown"));
    });
    socket.on("voice:interrupted", () => {
      scope.addLog(`[v${__APP_VERSION__ || "?"}] WS: TTS interrupted (server ack)`);
      scope.audioPlayingRef.current = false;
      scope.setSending(false);
    });
    socket.on("voice:call_ended", (data: any) => {
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}] Call ended: ${data.reason || "unknown reason"} | session=${data.session_id || "?"}`,
      );
      scope.audioPlayingRef.current = false;
      scope.audioQueueRef.current = [];
      scope.lastChunkPlayedRef.current = false;
      scope.greetingSpeechActiveRef.current = false;
      scope.setSending(false);
    });
    socket.on("voice:rpa:steps", async (data: { steps: RpaStep[] }) => {
      if (!data.steps?.length) return;
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}] RPA: executing ${data.steps.length} steps`,
      );
      try {
        const result = await executeRpaSteps(data.steps);
        const okCount = result.results.filter((r) => r.success).length;
        scope.addLog(
          `[v${__APP_VERSION__ || "?"}] RPA: ${okCount}/${result.results.length} OK`,
        );
        // Send result back to gateway
        scope.voiceSocketRef.current?.emit("voice:rpa:result", result);
      } catch (err) {
        scope.addLog(
          `[v${__APP_VERSION__ || "?"}] RPA: error — ${err instanceof Error ? err.message : String(err)}`,
        );
        scope.voiceSocketRef.current?.emit("voice:rpa:result", {
          success: false,
          results: [
            {
              step_index: 0,
              action: "error",
              success: false,
              error: String(err),
            },
          ],
        });
      }
    });
    socket.on("disconnect", (reason: string) => {
      scope.addLog(`[v${__APP_VERSION__ || "?"}] WS DISCONNECTED: ${reason}`);
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}]   Session: ${scope.voiceSessionIdRef.current || "none"} | Duration: ${scope.formatCallTime(scope.callTimer)}`,
      );
      if (scope.pipelinePollRef.current) {
        clearInterval(scope.pipelinePollRef.current);
        scope.pipelinePollRef.current = null;
      }
      scope.setPipelineStatus(null);
      scope.setTransportStatus({
        mode: "disconnected",
        detail: `WS disconnected: ${reason}`,
      });
      // Auto-reconnect for unexpected disconnects (not user-initiated)
      if (reason !== "io client disconnect" && scope.conversationModeRef.current) {
        scope.addLog(`[v${__APP_VERSION__ || "?"}] → auto-reconnecting in 2s`);
        setTimeout(() => {
          if (scope.conversationModeRef.current) {
            disconnectVoiceSocket();
            void connectVoiceSocket();
          }
        }, 2000);
        return;
      }
      scope.setCallStatus("disconnected");
      if (scope.callTimerRef.current) {
        clearInterval(scope.callTimerRef.current);
        scope.callTimerRef.current = null;
      }
      scope.audioPlayingRef.current = false;
    });
    socket.on("connect_error", (err) => {
      scope.addLog(`[v${__APP_VERSION__ || "?"}] WS CONNECT ERROR: ${err.message}`);
      scope.addLog(
        `[v${__APP_VERSION__ || "?"}]   Check: CORS? API running? URL=${fullUrl}`,
      );
      scope.setCallStatus("disconnected");
      toast.error("Failed to connect voice channel: " + err.message);
    });
    scope.voiceSocketRef.current = socket;
  }

async function setupWebRtc(): Promise<boolean> {
    const socket = scope.voiceSocketRef.current;
    if (!socket?.connected) {
      scope.setTransportStatus({
        mode: "ws-fallback",
        detail:
          "WS connected but signaling socket was not ready for WebRTC setup",
      });
      scope.addLog("[WebRTC] signaling socket not ready — using WS fallback");
      return false;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      scope.peerConnectionRef.current = pc;
      const audioTransceiver = pc.addTransceiver("audio", {
        direction: "sendrecv",
      });
      scope.webrtcMicSenderRef.current = audioTransceiver.sender;
      scope.addLog("[WebRTC] audio transceiver reserved before SDP offer");

      // Log ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        scope.addLog(`[WebRTC] ICE state: ${pc.iceConnectionState}`);
        scope.setTransportStatus((prev) => ({
          ...prev,
          iceState: pc.iceConnectionState,
          detail: `ICE ${pc.iceConnectionState}; peer ${pc.connectionState}`,
        }));
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          scope.webrtcConnectedRef.current = false;
          scope.setTransportStatus({
            mode: "ws-fallback",
            iceState: pc.iceConnectionState,
            peerState: pc.connectionState,
            detail: `WebRTC ICE ${pc.iceConnectionState}; WS audio remains available`,
          });
          scope.addLog(
            `[VOICE] Transport fallback active: ICE ${pc.iceConnectionState}, continuing over WS audio`,
          );
        }
      };
      pc.onconnectionstatechange = () => {
        scope.addLog(`[WebRTC] connection state: ${pc.connectionState}`);
        scope.setTransportStatus((prev) => ({
          ...prev,
          peerState: pc.connectionState,
          detail: `ICE ${pc.iceConnectionState}; peer ${pc.connectionState}`,
        }));
        if (pc.connectionState === "connected") {
          scope.webrtcConnectedRef.current = true;
          scope.setTransportStatus({
            mode: "webrtc",
            iceState: pc.iceConnectionState,
            peerState: pc.connectionState,
            detail: "WebRTC media channel connected",
          });
          scope.addLog("[VOICE] Transport selected: WebRTC media channel");
        }
        if (pc.connectionState === "failed") {
          scope.webrtcConnectedRef.current = false;
          scope.setTransportStatus({
            mode: "ws-fallback",
            iceState: pc.iceConnectionState,
            peerState: pc.connectionState,
            detail: "WebRTC peer failed; WS audio fallback active",
          });
          scope.addLog(
            "[VOICE] Transport fallback active: WebRTC peer failed, continuing over WS audio",
          );
        }
      };

      // Send ICE candidates to server
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit("webrtc:ice-candidate", {
            candidate: ev.candidate.toJSON(),
          });
        }
      };

      // Create offer after reserving the audio transceiver so later replaceTrack() does not need renegotiation.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer and wait for answer
      const response = await socket.emitWithAck("webrtc:offer", {
        sdp: { type: offer.type, sdp: offer.sdp! },
        session_id: scope.voiceSessionIdRef.current,
      });

      if (response.error) {
        scope.addLog(`[WebRTC] offer rejected: ${response.error}`);
        scope.setTransportStatus({
          mode: "ws-fallback",
          detail: `Offer rejected: ${response.error}`,
        });
        pc.close();
        scope.peerConnectionRef.current = null;
        return false;
      }

      // Set remote description from server's answer
      await pc.setRemoteDescription(new RTCSessionDescription(response.sdp));
      scope.setTransportStatus({
        mode: "initializing",
        iceState: pc.iceConnectionState,
        peerState: pc.connectionState,
        detail: "SDP answer accepted; waiting for ICE/peer connected",
      });
      scope.addLog(
        `[WebRTC] SDP answer accepted — ICE=${pc.iceConnectionState} peer=${pc.connectionState}`,
      );
      return true;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      scope.addLog(`[WebRTC] setup error: ${detail}`);
      scope.setTransportStatus({
        mode: "ws-fallback",
        detail: `Setup error: ${detail}`,
      });
      scope.webrtcConnectedRef.current = false;
      return false;
    }
  }

function disconnectVoiceSocket() {
    scope.addLog("Disconnecting voice WS");
    // Close WebRTC peer connection
    if (scope.peerConnectionRef.current) {
      scope.peerConnectionRef.current.close();
      scope.peerConnectionRef.current = null;
      scope.webrtcMicSenderRef.current = null;
      scope.webrtcConnectedRef.current = false;
      scope.setTransportStatus({
        mode: "disconnected",
        detail: "Call disconnected; WebRTC peer closed",
      });
      scope.addLog("[VOICE] Transport disconnected: WebRTC peer closed");
    }
    if (scope.callTimerRef.current) {
      clearInterval(scope.callTimerRef.current);
      scope.callTimerRef.current = null;
    }
    if (scope.pipelinePollRef.current) {
      clearInterval(scope.pipelinePollRef.current);
      scope.pipelinePollRef.current = null;
    }
    scope.setPipelineStatus(null);
    scope.audioPlayingRef.current = false;
    scope.audioQueueRef.current = [];
    const socket = scope.voiceSocketRef.current;
    if (socket) {
      if (socket.connected) {
        socket.emit("call:end");
      }
      socket.removeAllListeners();
      socket.disconnect();
    }
    scope.voiceSocketRef.current = null;
    scope.voiceSessionIdRef.current = null;
    scope.setCallStatus("idle");
    scope.setCallTimer(0);
  }

  return { connectVoiceSocket, disconnectVoiceSocket };
}
