import { Brain, Sparkles, Loader2, Volume2, Mic } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
type ProviderTestStatus = "idle" | "running" | "pass" | "fail" | "warn";

type BrainProviderPanelProps = {
  contextSummary: string;
  setConfigRefreshKey: Dispatch<SetStateAction<number>>;
  teamConfigLoading: boolean;
  selectedTeamId: string;
  llmProvider: string | null;
  llmApiKeySet: boolean;
  testLLMProvider: () => Promise<void>;
  testingLLM: boolean;
  llmTestStatus: "idle" | "running" | "pass" | "fail" | "warn";
  ttsProvider: string | null;
  ttsApiKeySet: boolean;
  testTTSProvider: () => Promise<void>;
  testingTTS: boolean;
  ttsTestStatus: "idle" | "running" | "pass" | "fail" | "warn";
  sttProvider: string | null;
  sttKeySet: boolean;
  testSTTProvider: () => Promise<void>;
  testingSTT: boolean;
  sttTestStatus: "idle" | "running" | "pass" | "fail" | "warn";
  ttsVoiceId: string | null;
  callStatus: "disconnected" | "idle" | "connecting" | "connected";
  pipelineStatus: { stt: { id: string; health: string; name: string; detail?: string; } | null; tts: { id: string; health: string; name: string; detail?: string; } | null; llm: { id: string; health: string; name: string; detail?: string; } | null; vadEnabled: boolean; bargeInEnabled: boolean; } | null;
  transportStatus: { mode: "webrtc" | "ws-fallback" | "disconnected" | "initializing"; iceState?: string; peerState?: string; detail?: string; };
};

export function BrainProviderPanel(props: BrainProviderPanelProps) {
  const pipelineStatus = props.pipelineStatus;
  return (
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Brain className="h-3.5 w-3.5" />
            Brand Brain
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Brain</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Configure the company, brand, and team context, then chat with
              KELEDON Brain — by text or voice.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Live context
            </div>
            <p className="mt-1 max-w-sm text-muted-foreground">
              {props.contextSummary}
            </p>
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
              testStatus: ProviderTestStatus = "idle",
            ) => {
              const statusMeta =
                testStatus === "pass"
                  ? {
                      label: "PASS",
                      cls: "bg-green-500/10 text-green-400 border-green-500/20",
                      dot: "bg-green-400",
                    }
                  : testStatus === "fail"
                    ? {
                        label: "FAIL",
                        cls: "bg-red-500/10 text-red-400 border-red-500/20",
                        dot: "bg-red-400",
                      }
                    : testStatus === "warn"
                      ? {
                          label: "WARN",
                          cls: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
                          dot: "bg-yellow-300",
                        }
                      : testStatus === "running"
                        ? {
                            label: "RUNNING",
                            cls: "bg-blue-500/10 text-blue-300 border-blue-500/20",
                            dot: "bg-blue-300 animate-pulse",
                          }
                        : {
                            label: "UNTESTED",
                            cls: "bg-muted/40 text-muted-foreground border-border",
                            dot: "bg-muted-foreground",
                          };
              return (
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/30 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    {icon}
                    {label}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClass}`}
                    >
                      {providerName || "none"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                        keySet
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                      title={
                        keySet
                          ? `${keyLabel} configured`
                          : `${keyLabel} not configured`
                      }
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${keySet ? "bg-green-400" : "bg-red-400"}`}
                      />
                      {keySet ? keyLabel : "no key"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${statusMeta.cls}`}
                      title={`${label} test status: ${statusMeta.label}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`}
                      />
                      {statusMeta.label}
                    </span>
                    {onTest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTest();
                        }}
                        disabled={testing}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          testing
                            ? "bg-muted/30 text-muted-foreground border-border cursor-wait"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 border-border"
                        }`}
                        title={`Test ${label} provider`}
                      >
                        {testing ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          "test"
                        )}
                      </button>
                    )}
                  </span>
                </div>
              );
            };
            return (
              <div className="space-y-1 pt-2 border-t border-border">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Provider Configuration
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        props.setConfigRefreshKey((k) => k + 1);
                      }}
                      disabled={props.teamConfigLoading}
                      className={`text-[10px] inline-flex items-center gap-0.5 transition-colors ${
                        props.teamConfigLoading
                          ? "text-muted-foreground cursor-wait"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Refresh provider configuration"
                    >
                      {props.teamConfigLoading ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <svg
                          className="h-2.5 w-2.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                          <path d="M21 21v-5h-5" />
                        </svg>
                      )}
                      refresh
                    </button>
                    <a
                      href="/management/providers"
                      className="text-[10px] text-primary hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open("/management/providers", "_blank");
                      }}
                    >
                      edit →
                    </a>
                  </span>
                </div>
                {props.teamConfigLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </div>
                ) : props.selectedTeamId ? (
                  <div className="space-y-1">
                    {providerRow(
                      <Brain className="h-3 w-3 text-primary" />,
                      "LLM",
                      props.llmProvider === "openai"
                        ? "GPT-4o"
                        : props.llmProvider === "google"
                          ? "Gemini"
                          : props.llmProvider === "anthropic"
                            ? "Claude"
                            : props.llmProvider || "none",
                      props.llmApiKeySet,
                      "key",
                      props.llmProvider
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted/60 text-muted-foreground border border-border",
                      props.testLLMProvider,
                      props.testingLLM,
                      props.llmTestStatus,
                    )}
                    {providerRow(
                      <Volume2 className="h-3 w-3 text-blue-400" />,
                      "TTS",
                      props.ttsProvider || "none",
                      props.ttsApiKeySet,
                      "key",
                      props.ttsProvider
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-muted/60 text-muted-foreground border border-border",
                      props.testTTSProvider,
                      props.testingTTS,
                      props.ttsTestStatus,
                    )}
                    {providerRow(
                      <Mic className="h-3 w-3 text-green-400" />,
                      "STT",
                      props.sttProvider === "vosk"
                        ? "Vosk"
                        : props.sttProvider === "deepgram"
                          ? "Deepgram"
                          : props.sttProvider === "speaches"
                            ? "Speaches"
                            : props.sttProvider === "webspeech"
                              ? "Web Speech"
                              : props.sttProvider || "none",
                      props.sttKeySet,
                      "key",
                      props.sttProvider
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-muted/60 text-muted-foreground border border-border",
                      props.testSTTProvider,
                      props.testingSTT,
                      props.sttTestStatus,
                    )}
                    {props.ttsVoiceId && (
                      <div className="flex items-center justify-between px-2 py-1 text-[10px] text-muted-foreground">
                        <span>Voice ID</span>
                        <code className="px-1 py-0.5 rounded bg-muted/50 font-mono">
                          {props.ttsVoiceId}
                        </code>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-2 py-1 text-[10px] text-muted-foreground">
                    Select a team to see provider config
                  </div>
                )}
              </div>
            );
          })()}
          {/* ── Live Provider Status ── */}
          {props.callStatus === "connected" && pipelineStatus && (
            <div className="space-y-1 pt-2 border-t border-border mt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Live Provider Status
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${props.callStatus === "connected" ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`}
                />
              </div>
              <div className="space-y-1">
                {(() => {
                  const transportMeta: Record<
                    typeof props.transportStatus.mode,
                    { label: string; cls: string; dot: string; value: string }
                  > = {
                    webrtc: {
                      label: "WEBRTC",
                      value: "media channel",
                      cls: "bg-green-500/10 text-green-400 border-green-500/20",
                      dot: "bg-green-400",
                    },
                    "ws-fallback": {
                      label: "WS FALLBACK",
                      value: "websocket audio",
                      cls: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
                      dot: "bg-yellow-300",
                    },
                    initializing: {
                      label: "NEGOTIATING",
                      value: "offer/answer",
                      cls: "bg-blue-500/10 text-blue-300 border-blue-500/20",
                      dot: "bg-blue-300 animate-pulse",
                    },
                    disconnected: {
                      label: "OFFLINE",
                      value: "not connected",
                      cls: "bg-muted/40 text-muted-foreground border-border",
                      dot: "bg-muted-foreground",
                    },
                  };
                  const meta = transportMeta[props.transportStatus.mode];
                  return (
                    <div className="rounded-md bg-muted/20 px-2 py-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          Transport
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">
                            {meta.value}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${meta.cls}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                            />
                            {meta.label}
                          </span>
                        </span>
                      </div>
                      {(props.transportStatus.iceState ||
                        props.transportStatus.peerState ||
                        props.transportStatus.detail) && (
                        <div
                          className="mt-0.5 truncate text-[9px] text-muted-foreground"
                          title={props.transportStatus.detail || ""}
                        >
                          ICE={props.transportStatus.iceState || "?"} · Peer=
                          {props.transportStatus.peerState || "?"}
                          {props.transportStatus.detail
                            ? ` · ${props.transportStatus.detail}`
                            : ""}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {[pipelineStatus.llm, pipelineStatus.stt, pipelineStatus.tts]
                  .filter(Boolean)
                  .map((provider) => {
                    if (!provider) return null;
                    const healthMap: Record<
                      string,
                      { label: string; cls: string; dot: string }
                    > = {
                      ready: {
                        label: "READY",
                        cls: "bg-green-500/10 text-green-400 border-green-500/20",
                        dot: "bg-green-400",
                      },
                      degraded: {
                        label: "DEGRADED",
                        cls: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
                        dot: "bg-yellow-300",
                      },
                      error: {
                        label: "ERROR",
                        cls: "bg-red-500/10 text-red-400 border-red-500/20",
                        dot: "bg-red-400",
                      },
                      initializing: {
                        label: "INIT",
                        cls: "bg-blue-500/10 text-blue-300 border-blue-500/20",
                        dot: "bg-blue-300 animate-pulse",
                      },
                    };
                    const meta = healthMap[provider.health] || {
                      label: provider.health.toUpperCase(),
                      cls: "bg-muted/40 text-muted-foreground border-border",
                      dot: "bg-muted-foreground",
                    };
                    const kindLabel =
                      provider === pipelineStatus.llm
                        ? "LLM"
                        : provider === pipelineStatus.stt
                          ? "STT"
                          : "TTS";
                    return (
                      <div
                        key={kindLabel}
                        className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/20 text-[10px]"
                      >
                        <span className="font-medium text-foreground">
                          {kindLabel}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">
                            {provider.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${meta.cls}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                            />
                            {meta.label}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                {pipelineStatus.vadEnabled && (
                  <div className="flex items-center justify-between px-2 py-0.5 text-[10px] text-muted-foreground">
                    <span>VAD</span>
                    <span className="text-green-400">enabled</span>
                  </div>
                )}
                {pipelineStatus.bargeInEnabled && (
                  <div className="flex items-center justify-between px-2 py-0.5 text-[10px] text-muted-foreground">
                    <span>Barge-in</span>
                    <span className="text-green-400">enabled</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
