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
  vendors: any[];
  keledonId: string | null;
  escalationTriggers: string[];
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
