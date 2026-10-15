import { Volume2, VolumeX, RotateCcw, PhoneOff, Phone, Mic, Loader2, PhoneIncoming, MicOff, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatLine } from './brain-types';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { SpeechRecognitionLike } from './speech-recognition';


type BrainConversationPanelProps = {
  toggleAutoSpeak: () => void;
  autoSpeak: boolean;
  resetChat: () => void;
  toggleConversationMode: () => void;
  conversationMode: boolean;
  callStatus: "idle" | "connecting" | "connected" | "disconnected";
  formatCallTime: (seconds: number) => string;
  callTimer: number;
  setShowDeviceSettings: Dispatch<SetStateAction<boolean>>;
  showDeviceSettings: boolean;
  selectedMicId: string;
  setSelectedMicId: Dispatch<SetStateAction<string>>;
  audioInputDevices: MediaDeviceInfo[];
  selectedSpeakerId: string;
  setSelectedSpeakerId: Dispatch<SetStateAction<string>>;
  audioOutputDevices: MediaDeviceInfo[];
  addLog: (msg: string) => void;
  setMessages: Dispatch<SetStateAction<ChatLine[]>>;
  speakReply: (text: string, messageId: string) => Promise<void>;
  messages: ChatLine[];
  speakingMessageId: string | null;
  sending: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  isListening: boolean;
  draft: string;
  recognitionRef: RefObject<SpeechRecognitionLike | null>;
  setIsListening: Dispatch<SetStateAction<boolean>>;
  setDraft: Dispatch<SetStateAction<string>>;
  handleSend: (overrideText?: string) => Promise<void>;
  configReady: boolean;
  sttLang: string;
  setSttLang: (language: string) => void;
  listeningRef: RefObject<boolean>;
  toggleListening: () => Promise<void>;
};

export function BrainConversationPanel({
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
  setSttLang,
  listeningRef,
  toggleListening
}: BrainConversationPanelProps) {
  return (
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
                title={
                  autoSpeak
                    ? "Auto-speak on — click to mute"
                    : "Auto-speak off — click to enable"
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  autoSpeak
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {autoSpeak ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {autoSpeak ? "Speaking" : "Muted"}
                </span>
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
                title={
                  conversationMode
                    ? "Exit call mode"
                    : "Call — hands-free conversation"
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  conversationMode
                    ? "border-green-500/60 bg-green-500/10 text-green-500"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {conversationMode ? (
                  <PhoneOff className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {conversationMode
                    ? callStatus === "connecting"
                      ? "Connecting..."
                      : callStatus === "connected"
                        ? formatCallTime(callTimer)
                        : "On Call"
                    : "Call"}
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
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                    showDeviceSettings
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-500"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Mic className="h-4 w-4" />
                  <span className="hidden sm:inline">Devices</span>
                </button>
                {showDeviceSettings && (
                  <div
                    data-device-panel
                    className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg"
                  >
                    <div className="space-y-3 text-sm">
                      <label className="block space-y-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Microphone
                        </span>
                        <select
                          value={selectedMicId}
                          onChange={(e) => {
                            setSelectedMicId(e.target.value);
                            try {
                              localStorage.setItem(
                                "keledon_brain_mic_id",
                                e.target.value,
                              );
                            } catch {
                              /* ignore localStorage errors */
                            }
                          }}
                          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        >
                          <option value="">System default</option>
                          {audioInputDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Mic ${d.deviceId.slice(0, 8)}…`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Speaker
                        </span>
                        <select
                          value={selectedSpeakerId}
                          onChange={(e) => {
                            setSelectedSpeakerId(e.target.value);
                            try {
                              localStorage.setItem(
                                "keledon_brain_speaker_id",
                                e.target.value,
                              );
                            } catch {
                              /* ignore localStorage errors */
                            }
                          }}
                          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                        >
                          <option value="">System default</option>
                          {audioOutputDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Speaker ${d.deviceId.slice(0, 8)}…`}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        Speaker selection works in Chrome/Edge when using TTS or
                        voice call audio.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Test TTS */}
              <button
                type="button"
                onClick={async () => {
                  addLog("Test TTS button clicked");
                  const msg = "Hello, this is a test of the audio system.";
                  // Call speakReply directly with test text
                  const testId = "test-tts-" + Date.now();
                  setMessages((cur) => [
                    ...cur,
                    {
                      id: testId,
                      role: "assistant",
                      content: "🔊 Test: " + msg,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
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
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/40 text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <div
                    className={cn(
                      "mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wide",
                      message.role === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
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
                <span>{conversationMode ? "Call with Brain" : "Message"}</span>
                {callStatus === "connected" && (
                  <span className="flex items-center gap-1.5 text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {formatCallTime(callTimer)}
                  </span>
                )}
                {callStatus === "connecting" && (
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Connecting
                  </span>
                )}
              </span>
              {conversationMode ? (
                <div
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border-2 px-4 py-6 text-sm transition-colors",
                    callStatus === "connecting" &&
                      "border-yellow-400/40 bg-yellow-500/5",
                    callStatus === "connected" &&
                      isListening &&
                      "border-red-400/60 bg-red-500/5",
                    callStatus === "connected" &&
                      !isListening &&
                      "border-green-400/40 bg-green-500/5",
                    callStatus === "disconnected" && "border-muted bg-muted/20",
                  )}
                >
                  {callStatus === "connecting" && (
                    <div className="text-center">
                      <PhoneIncoming className="mx-auto h-10 w-10 text-yellow-400 animate-pulse" />
                      <p className="mt-3 text-base font-medium text-yellow-400">
                        Calling KELEDON Brain...
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Establishing secure voice channel
                      </p>
                    </div>
                  )}
                  {callStatus === "connected" && (
                    <div className="w-full text-center">
                      {/* Large status area */}
                      <div className="mb-4">
                        {isListening ? (
                          <>
                            <Mic className="mx-auto h-12 w-12 text-red-400 animate-pulse" />
                            <p className="mt-3 text-lg font-bold text-red-400">
                              You're speaking
                            </p>
                            {draft && (
                              <p className="mt-2 max-w-md mx-auto text-sm text-foreground/80 italic">
                                "{draft}"
                              </p>
                            )}
                          </>
                        ) : sending ? (
                          <>
                            <Loader2 className="mx-auto h-12 w-12 text-blue-400 animate-spin" />
                            <p className="mt-3 text-lg font-bold text-blue-400">
                              Brain is thinking...
                            </p>
                          </>
                        ) : (
                          <>
                            <Volume2 className="mx-auto h-12 w-12 text-green-500 animate-pulse" />
                            <p className="mt-3 text-lg font-bold text-green-500">
                              Brain is speaking
                            </p>
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
                          className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-foreground hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <PhoneOff className="h-4 w-4" />
                          End Call
                        </button>
                      </div>
                    </div>
                  )}
                  {callStatus === "disconnected" && (
                    <div className="text-center">
                      <PhoneOff className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-3 text-base font-medium text-muted-foreground">
                        Call ended
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Duration: {formatCallTime(callTimer)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={
                    isListening
                      ? "Listening — speak now..."
                      : "Ask Brain what the brand should do, say, or explain..."
                  }
                  rows={4}
                  className={cn(
                    "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary",
                    isListening ? "border-red-400/60" : "border-border",
                  )}
                />
              )}
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {configReady
                  ? conversationMode
                    ? "Brain will answer and re-listen automatically. Tap Call again to exit."
                    : "Brain will answer using the selected company, brand, and team."
                  : "Select all context fields before sending."}
              </div>
              <div className="flex items-center gap-2">
                {/* STT Language selector */}
                <select
                  value={sttLang}
                  onChange={(e) => {
                    const lang = e.target.value;
                    setSttLang(lang);
                    try {
                      localStorage.setItem("keledon_stt_lang", lang);
                    } catch {
                      /* ignore localStorage errors */
                    }
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
                  title={isListening ? "Stop listening" : "Speak to Brain"}
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    isListening
                      ? "animate-pulse border-red-400/60 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
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
  );
}
