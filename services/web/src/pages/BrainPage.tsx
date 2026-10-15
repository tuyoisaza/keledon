import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBrainContextData } from "./useBrainContextData";
import { useBrainProviderConfig } from "./useBrainProviderConfig";
import { useBrainAudioDevices } from "./useBrainAudioDevices";
import { API_URL } from "@/lib/config";
import type { Socket } from "socket.io-client";
import { WEBSOCKET_URL } from "@/lib/config";
import { useBrainCloudStatus, type BrainPipelineStatus } from "./useBrainCloudStatus";

import type { ChatLine } from "./brain-types";
import { createBrainChatActions } from "./brain-chat-actions";
import { createBrainProviderTests } from "./brain-provider-tests";
import { createBrainVoiceOutput } from "./brain-voice-output";
import { createBrainVoiceSocket } from "./brain-voice-socket";
import { createBrainSpeechFlow } from "./brain-speech-flow";
import { createBrainSpeechCapture } from "./brain-speech-capture";
import { createBrainAudioController } from "./brain-audio-controller";
import { useBrainLogs } from "./useBrainLogs";
import { BrainProviderPanel } from './BrainProviderPanel';
import { BrainContextPanel } from './BrainContextPanel';
import { BrainConversationPanel } from './BrainConversationPanel';
import { BrainLogsPanel } from './BrainLogsPanel';
import { AUTOSPEAK_KEY } from "./brain-storage";

export default function BrainPage() {
  const { user } = useAuth();
  const { audioInputDevices, audioOutputDevices, selectedMicId, setSelectedMicId, selectedSpeakerId, setSelectedSpeakerId, showDeviceSettings, setShowDeviceSettings } = useBrainAudioDevices();
  const { companies, selectedCompanyId, selectedBrandId, selectedTeamId, setSelectedTeamId, selectedCompany, selectedBrand, selectedTeam, brandsForCompany, teamsForBrand, configReady, loading, handleCompanyChange, handleBrandChange } = useBrainContextData(user);
  const [messages, setMessages] = useState<ChatLine[]>([
    {
      id: "brain-welcome",
      role: "assistant",
      content:
        "I am KELEDON Brain. Choose a company, brand, and team, then chat with me as that operating context.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [sttLang, setSttLang] = useState(() => {
    try {
      return (
        localStorage.getItem("keledon_stt_lang") ||
        navigator.language ||
        "en-US"
      );
    } catch {
      return navigator.language || "en-US";
    }
  });
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );
  const listeningRef = useRef(false);
  const reListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const greetingSpeechActiveRef = useRef(false);
  const sttLangRef = useRef(sttLang);
  function updateSttLang(language: string) {
    sttLangRef.current = language;
    setSttLang(language);
  }
  const lastChunkPlayedRef = useRef(false);
  const reconErrorCountRef = useRef(0);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      return localStorage.getItem(AUTOSPEAK_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [conversationMode, setConversationMode] = useState(false);
  const { brainLogs, setBrainLogs, addLog } = useBrainLogs();

  // Live pipeline status (from API /api/voice-provider/status/:sessionId)
  const [pipelineStatus, setPipelineStatus] = useState<BrainPipelineStatus | null>(null);
  const pipelinePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [transportStatus, setTransportStatus] = useState<{
    mode: "webrtc" | "ws-fallback" | "disconnected" | "initializing";
    iceState?: string;
    peerState?: string;
    detail?: string;
  }>({ mode: "disconnected", detail: "No active call" });

  const { resolveBrainCloudConfig, fetchPipelineStatus } = useBrainCloudStatus(addLog, setPipelineStatus);

  const { llmProvider, ttsProvider, sttProvider, teamConfigLoading, setConfigRefreshKey, llmApiKeySet, ttsApiKeySet, sttKeySet, ttsVoiceId } = useBrainProviderConfig({
    selectedTeamId, addLog,
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // Web Speech API is not part of the project's DOM type definitions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const conversationModeRef = useRef(false);
  const draftRef = useRef(draft);
  const audioPlayingRef = useRef(false);
  const lastBrainReplyRef = useRef("");
  const voiceSocketRef = useRef<Socket | null>(null);
  const [callStatus, setCallStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected"
  >("idle");
  const [callTimer, setCallTimer] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioQueueRef = useRef<
    { data: string; seq: string; format?: string }[]
  >([]);
  const webAudioContextRef = useRef<AudioContext | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bargeInStreamRef = useRef<MediaStream | null>(null);
  const bargeInContextRef = useRef<AudioContext | null>(null);
  const bargeInProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const bargeInActiveRef = useRef(false);
  const ttsPlaybackActiveRef = useRef(false);
  const postPlaybackEchoGuardUntilRef = useRef(0);
  const voiceSessionIdRef = useRef<string | null>(null);
  const listenSocketRef = useRef<Socket | null>(null);
  const listenAudioStreamRef = useRef<MediaStream | null>(null);
  const listenAudioContextRef = useRef<AudioContext | null>(null);
  const listenSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const listenProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const speachesVadContextRef = useRef<AudioContext | null>(null);
  const speachesVadSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const speachesVadProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const speachesPcmChunksRef = useRef<Float32Array[]>([]);
  const speachesPcmSampleRateRef = useRef(16000);
  const speachesStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // The provisional Web Speech recognizer is supplied by the browser at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provisionalRecognitionRef = useRef<any>(null);
  const provisionalTextRef = useRef("");
  const speachesHeardSpeechRef = useRef(false);
  const speachesFastSentRef = useRef(false);
  const stopSpeachesListeningRef = useRef<() => void>(() => {});
  const stopVoskListeningRef = useRef<() => void>(() => {});
  const stopBargeInMonitorRef = useRef<() => void>(() => {});
  const disconnectVoiceSocketRef = useRef<() => void>(() => {});
  const stopSpeakingRef = useRef<() => void>(() => {});
  const sendVoiceTranscriptRef = useRef<(text: string) => void>(() => {});
  const startSpeachesListeningRef = useRef<() => Promise<void>>(async () => {});
  const playAudioBytesRef = useRef<(bytes: Uint8Array, mimeType: string, label: string, onEnded: () => void, onFailed: () => void) => Promise<void>>(async () => {});
  function stopSpeaking() { stopSpeakingRef.current(); }
  function sendVoiceTranscript(text: string) { sendVoiceTranscriptRef.current(text); }
  function startSpeachesListening() { return startSpeachesListeningRef.current(); }
  function playAudioBytes(bytes: Uint8Array, mimeType: string, label: string, onEnded: () => void, onFailed: () => void) { return playAudioBytesRef.current(bytes, mimeType, label, onEnded, onFailed); }
  function abortActiveRecognition() { recognitionRef.current?.abort(); }
  function abortActiveTts() { ttsAbortRef.current?.abort(); }
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stop everything on unmount
  useEffect(() => {
    addLog(
      `[v${__APP_VERSION__ || "?"}] BrainPage mounted — web v${__APP_VERSION__ || "?"}`,
    );
    addLog(
      `[v${__APP_VERSION__ || "?"}]   API_URL=${API_URL} | WEBSOCKET_URL=${WEBSOCKET_URL || "(same origin)"}`,
    );
    return () => {
      addLog(`[v${__APP_VERSION__ || "?"}] BrainPage unmounting — cleanup`);
      abortActiveRecognition();
      stopSpeachesListeningRef.current();
      stopBargeInMonitorRef.current();
      stopVoskListeningRef.current();
      abortActiveTts();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      disconnectVoiceSocketRef.current();
    };
  }, [addLog]);

  // ── TTS ─────────────────────────────────────────────────────────────

// ── Voice WebSocket ────────────────────────────────────────────────

// ── WebRTC Peer Connection ───────────────────────────────────────

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webrtcConnectedRef = useRef(false);
  const webrtcMicSenderRef = useRef<RTCRtpSender | null>(null);

  /**
   * Create RTCPeerConnection, exchange SDP offer/answer via WS signaling.
   * On success, the server has a media pipeline ready for the mic track.
   */

/** Play streaming audio chunks in sequence */

/** Send STT transcript via voice WS */

// ── STT ─────────────────────────────────────────────────────────────

// ── Speaches STT: capture audio, send to Whisper API ──

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

function toggleConversationMode() {
    const action = !conversationMode ? "ENTERING" : "EXITING";
    addLog(`[v${__APP_VERSION__ || "?"}] 👤 ACTION: ${action} call mode`);
    addLog(
      `[v${__APP_VERSION__ || "?"}]   Context: ${selectedCompany?.name || "-"} / ${selectedBrand?.name || "-"} / ${selectedTeam?.name || "-"}`,
    );
    if (conversationMode) {
      // Exiting conversation mode
      addLog("→ exiting conv mode");
      setConversationMode(false);
      conversationModeRef.current = false;
      if (isListening) {
        recognitionRef.current?.stop();
        stopSpeachesListening();
        stopVoskListening();
        setIsListening(false);
      }
      stopSpeaking();
      disconnectVoiceSocket();
      setAutoSpeak(true);
    } else {
      // Entering conversation mode
      addLog("→ entering conv mode");
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

  type ProviderTestStatus = "idle" | "running" | "pass" | "fail" | "warn";
  const [testingLLM, setTestingLLM] = useState(false);
  const [testingTTS, setTestingTTS] = useState(false);
  const [testingSTT, setTestingSTT] = useState(false);
  const [llmTestStatus, setLlmTestStatus] =
    useState<ProviderTestStatus>("idle");
  const [ttsTestStatus, setTtsTestStatus] =
    useState<ProviderTestStatus>("idle");
  const [sttTestStatus, setSttTestStatus] =
    useState<ProviderTestStatus>("idle");

// ── Chat ─────────────────────────────────────────────────────────────

  // Factories retain refs for event callbacks; they do not read them during render.
  // eslint-disable-next-line react-hooks/refs
  const { appendSpeachesTranscriptionFields, makePcmWavBlob, startVoskListening, stopVoskListening, startSpeachesProvisionalRecognition, cleanupSpeachesVad, startSpeachesVad } = createBrainSpeechCapture({
    sttLangRef,
    addLog,
    resolveBrainCloudConfig,
    selectedTeam,
    listenSocketRef,
    selectedMicId,
    listeningRef,
    listenAudioStreamRef,
    listenAudioContextRef,
    listenSourceRef,
    listenProcessorRef,
    setIsListening,
    setDraft,
    draftRef,
    conversationModeRef,
    sendVoiceTranscript,
    provisionalRecognitionRef,
    provisionalTextRef,
    speachesStopTimerRef,
    speachesVadProcessorRef,
    speachesVadSourceRef,
    speachesVadContextRef,
    mediaRecorderRef,
    speachesPcmSampleRateRef,
    speachesPcmChunksRef,
    speachesHeardSpeechRef,
    stopSpeachesListening: () => stopSpeachesListeningRef.current(),
  });

  // Factories retain refs for event callbacks; they do not read them during render.
  // eslint-disable-next-line react-hooks/refs
  const { startSpeachesListening: startBrainSpeachesListening, stopSpeachesListening, toggleListening } = createBrainSpeechFlow({
    addLog,
    selectedMicId,
    mediaStreamRef,
    audioChunksRef,
    speachesPcmChunksRef,
    speachesPcmSampleRateRef,
    peerConnectionRef,
    webrtcMicSenderRef,
    setTransportStatus,
    provisionalTextRef,
    speachesHeardSpeechRef,
    speachesFastSentRef,
    mediaRecorderRef,
    cleanupSpeachesVad,
    listeningRef,
    setIsListening,
    conversationModeRef,
    sending,
    setDraft,
    draftRef,
    voiceSocketRef,
    sendVoiceTranscript,
    handleSend,
    makePcmWavBlob,
    selectedTeamId,
    appendSpeachesTranscriptionFields,
    postPlaybackEchoGuardUntilRef,
    startSpeachesProvisionalRecognition,
    startSpeachesVad,
    speakingMessageId,
    stopSpeaking,
    isListening,
    reListenTimerRef,
    listenSocketRef,
    stopVoskListening,
    recognitionRef,
    sttProvider,
    startVoskListening,
    sttLangRef,
    silenceTimerRef,
    reconErrorCountRef,
  });

  // Factories retain refs for event callbacks; they do not read them during render.
  // eslint-disable-next-line react-hooks/refs
  const { stopBargeInMonitor, stopSpeaking: stopBrainSpeaking, playAudioBytes: playBrainAudioBytes } = createBrainAudioController({
    bargeInActiveRef,
    bargeInProcessorRef,
    bargeInContextRef,
    bargeInStreamRef,
    conversationModeRef,
    listeningRef,
    selectedMicId,
    ttsPlaybackActiveRef,
    addLog,
    audioQueueRef,
    voiceSocketRef,
    startSpeachesListening,
    setSpeakingMessageId,
    postPlaybackEchoGuardUntilRef,
    ttsAbortRef,
    audioRef,
    webAudioSourceRef,
    webAudioContextRef,
    selectedSpeakerId,
  });

const handleSendRef = useRef<(overrideText?: string) => Promise<void>>(async () => {});
  function handleSend(overrideText?: string) { return handleSendRef.current(overrideText); }

  // Factories retain refs for event callbacks; they do not read them during render.
  // eslint-disable-next-line react-hooks/refs
  const { playNextAudioChunk, sendVoiceTranscript: sendBrainVoiceTranscript, formatCallTime, speakReply, toggleAutoSpeak } = createBrainVoiceOutput({
    audioQueueRef,
    audioPlayingRef,
    addLog,
    playAudioBytes,
    voiceSocketRef,
    lastChunkPlayedRef,
    setMessages,
    setSending,
    handleSend,
    setSpeakingMessageId,
    conversationModeRef,
    toggleListening,
    stopSpeaking,
    ttsAbortRef,
    resolveBrainCloudConfig,
    selectedTeamId,
    autoSpeak,
    setAutoSpeak,
  });


  // Factories retain refs for event callbacks; they do not read them during render.
  // eslint-disable-next-line react-hooks/refs
  const { handleSend: handleBrainSend, resetChat } = createBrainChatActions({
    draft,
    addLog,
    sending,
    configReady,
    isListening,
    recognitionRef,
    setIsListening,
    messages,
    setMessages,
    setDraft,
    setSending,
    conversationModeRef,
    selectedCompany,
    selectedBrand,
    selectedTeam,
    user,
    autoSpeak,
    speakReply,
    stopSpeaking,
  });

  // Factories retain refs for event callbacks; they do not read them during render.
  // eslint-disable-next-line react-hooks/refs
  const { connectVoiceSocket, disconnectVoiceSocket } = createBrainVoiceSocket({
    voiceSocketRef,
    voiceSessionIdRef,
    resolveBrainCloudConfig,
    addLog,
    user,
    setCallStatus,
    setCallTimer,
    callTimerRef,
    selectedCompany,
    selectedBrand,
    selectedTeam,
    sttLangRef,
    fetchPipelineStatus,
    setTransportStatus,
    pipelinePollRef,
    setSending,
    listeningRef,
    recognitionRef,
    setMessages,
    lastBrainReplyRef,
    ttsFallbackTimerRef,
    greetingSpeechActiveRef,
    audioPlayingRef,
    conversationModeRef,
    toggleListening,
    audioQueueRef,
    lastChunkPlayedRef,
    playNextAudioChunk,
    formatCallTime,
    callTimer,
    setPipelineStatus,
    peerConnectionRef,
    webrtcMicSenderRef,
    webrtcConnectedRef,
  });

  useEffect(() => {
    stopVoskListeningRef.current = stopVoskListening;
    stopSpeachesListeningRef.current = stopSpeachesListening;
    startSpeachesListeningRef.current = startBrainSpeachesListening;
    stopBargeInMonitorRef.current = stopBargeInMonitor;
    stopSpeakingRef.current = stopBrainSpeaking;
    playAudioBytesRef.current = playBrainAudioBytes;
    sendVoiceTranscriptRef.current = sendBrainVoiceTranscript;
    handleSendRef.current = handleBrainSend;
    disconnectVoiceSocketRef.current = disconnectVoiceSocket;
  }, [
    stopVoskListening,
    stopSpeachesListening,
    startBrainSpeachesListening,
    stopBargeInMonitor,
    stopBrainSpeaking,
    playBrainAudioBytes,
    sendBrainVoiceTranscript,
    handleBrainSend,
    disconnectVoiceSocket,
  ]);

  const contextSummary = [

selectedCompany?.name ?? "No company selected",
    selectedBrand?.name ?? "No brand selected",
    selectedTeam?.name ?? "No team selected",
  ].join(" • ");

  const { testLLMProvider, testTTSProvider, testSTTProvider } = createBrainProviderTests({
    selectedTeamId,
    testingLLM,
    setTestingLLM,
    setLlmTestStatus,
    selectedTeam,
    addLog,
    llmProvider,
    selectedCompany,
    selectedBrand,
    testingTTS,
    setTestingTTS,
    setTtsTestStatus,
    ttsProvider,
    resolveBrainCloudConfig,
    testingSTT,
    setTestingSTT,
    setSttTestStatus,
    sttProvider,
    appendSpeachesTranscriptionFields,
  });

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <BrainProviderPanel {...{
        contextSummary,
        setConfigRefreshKey,
        teamConfigLoading,
        selectedTeamId,
        llmProvider,
        llmApiKeySet,
        testLLMProvider,
        testingLLM,
        llmTestStatus,
        ttsProvider,
        ttsApiKeySet,
        testTTSProvider,
        testingTTS,
        ttsTestStatus,
        sttProvider,
        sttKeySet,
        testSTTProvider,
        testingSTT,
        sttTestStatus,
        ttsVoiceId,
        callStatus,
        pipelineStatus,
        transportStatus,
      }} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Context panel ── */}
        <BrainContextPanel {...{
        loading,
        selectedCompanyId,
        handleCompanyChange,
        companies,
        selectedBrandId,
        handleBrandChange,
        brandsForCompany,
        selectedTeamId,
        setSelectedTeamId,
        teamsForBrand,
        configReady,
      }} />

        {/* ── Chat panel ── */}
        <BrainConversationPanel {...{
        toggleAutoSpeak,
        autoSpeak,
        resetChat,
        toggleConversationMode,
        conversationMode,
        callStatus,
        formatCallTime,
        callTimer,
        setShowDeviceSettings,
        showDeviceSettings,
        selectedMicId,
        setSelectedMicId,
        audioInputDevices,
        selectedSpeakerId,
        setSelectedSpeakerId,
        audioOutputDevices,
        addLog,
        setMessages,
        speakReply,
        messages,
        speakingMessageId,
        sending,
        messagesEndRef,
        isListening,
        draft,
        recognitionRef,
        setIsListening,
        setDraft,
        handleSend,
        configReady,
        sttLang,
        setSttLang: updateSttLang,
        listeningRef,
        toggleListening,
      }} />

        {/* ── Debug Logs ─────────────────────────────────────────────── */}
        <BrainLogsPanel {...{
        brainLogs,
        setBrainLogs,
      }} />
      </div>
    </div>
  );
}
