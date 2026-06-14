export interface RuntimeStatus {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  deviceId: string;
  cloudUrl: string;
  sessionId: string | null;
  authToken: string | null;
  pendingKeledonId: string | null;
  pendingPairingCode: string | null;
  teamId: string | null;
  teamName: string | null;
  language: string;
  vendors: any[];
  keledonId: string | null;
  escalationTriggers: string[];
  diagnostics: BrowserDiagnostics;
}

export interface BrowserDiagnostics {
  lastDeepLinkReceivedAt: string | null;
  lastDeepLinkAction: string | null;
  lastDeepLinkHadRequiredParams: boolean | null;
  lastDeepLinkValidation: 'ok' | 'missing_params' | 'expired' | 'invalid_signature' | 'parse_error' | null;
  lastAutoConnectStatus: 'ok' | 'http_error' | 'exception' | 'not_attempted' | 'pair_error';
  lastAutoConnectHttpStatus: number | null;
  lastAutoConnectError: string | null;
  lastLaunchKeledonId: string | null;
  lastLaunchCloudUrl: string | null;
  lastRendererLaunchBufferedAt: string | null;
  lastRendererLaunchDeliveredAt: string | null;
}

export interface TabInfo {
  id: string;
  name: string;
  url: string;
  active: boolean;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}
