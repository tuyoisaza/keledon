import { useRef } from "react";
import { API_URL, WEBSOCKET_URL } from "@/lib/config";

type PipelineProvider = {
  id: string;
  health: string;
  name: string;
  detail?: string;
};

export type BrainPipelineStatus = {
  stt: PipelineProvider | null;
  tts: PipelineProvider | null;
  llm: PipelineProvider | null;
  vadEnabled: boolean;
  bargeInEnabled: boolean;
};

export function useBrainCloudStatus(
  addLog: (message: string) => void,
  setPipelineStatus: (status: BrainPipelineStatus | null) => void,
) {
  const cloudApiBaseRef = useRef<string | null>(null);
  const cloudWsBaseRef = useRef<string | null>(null);

  async function resolveBrainCloudConfig(): Promise<{ apiBase: string; wsBase: string }> {
    if (cloudApiBaseRef.current && cloudWsBaseRef.current) {
      return { apiBase: cloudApiBaseRef.current, wsBase: cloudWsBaseRef.current };
    }
    let apiBase = API_URL || "";
    let wsBase = WEBSOCKET_URL || "";
    try {
      const res = await fetch("/api/cloud-config", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const config = await res.json();
        if (config.api_url) apiBase = config.api_url;
        if (config.ws_url) wsBase = config.ws_url;
        if (!apiBase && config.ws_url) {
          apiBase = String(config.ws_url).replace(/^wss:/, "https:").replace(/^ws:/, "http:");
        }
      }
    } catch (error) {
      addLog(`[v${__APP_VERSION__ || "?"}] cloud-config lookup failed, using fallback: ${error instanceof Error ? error.message : String(error)}`);
    }
    if ((!apiBase || !wsBase) && window.location.hostname === "keledon.tuyoisaza.com") {
      apiBase = apiBase || "https://keledonapi.tuyoisaza.com";
      wsBase = wsBase || "wss://keledonapi.tuyoisaza.com";
    }
    cloudApiBaseRef.current = apiBase;
    cloudWsBaseRef.current = wsBase || window.location.origin.replace(/^http/, "ws");
    addLog(`[v${__APP_VERSION__ || "?"}] Brain cloud endpoints: api=${cloudApiBaseRef.current || "(same-origin)"} ws=${cloudWsBaseRef.current}`);
    return { apiBase: cloudApiBaseRef.current || "", wsBase: cloudWsBaseRef.current || "" };
  }

  async function fetchPipelineStatus(sessionId: string) {
    try {
      const { apiBase } = await resolveBrainCloudConfig();
      const token = sessionStorage.getItem("auth_token");
      const res = await fetch(`${apiBase}/api/voice-provider/status/${encodeURIComponent(sessionId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        addLog(`[VOICE] Provider status fetch failed: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setPipelineStatus(null);
        return;
      }
      setPipelineStatus({
        stt: data.stt ? { id: data.stt.id, health: data.stt.health, name: data.stt.name, detail: data.stt.detail } : null,
        tts: data.tts ? { id: data.tts.id, health: data.tts.health, name: data.tts.name, detail: data.tts.detail } : null,
        llm: data.llm ? { id: data.llm.id, health: data.llm.health, name: data.llm.name, detail: data.llm.detail } : null,
        vadEnabled: data.vadEnabled ?? true,
        bargeInEnabled: data.bargeInEnabled ?? true,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      addLog(`[VOICE] Provider status error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { resolveBrainCloudConfig, fetchPipelineStatus };
}
