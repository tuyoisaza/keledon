import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('keledon', {
  device: {
    getInfo: () => ipcRenderer.invoke('device:getInfo')
  },
  runtime: {
    getStatus: () => ipcRenderer.invoke('runtime:getStatus'),
    connect: (config: { cloudUrl: string; token: string; keledonId?: string }) => 
      ipcRenderer.invoke('runtime:connect', config),
    disconnect: () => ipcRenderer.invoke('runtime:disconnect'),
    startSession: (sessionId: string, teamId?: string) => 
      ipcRenderer.invoke('runtime:startSession', sessionId, teamId),
    onStatusChange: (callback: (status: unknown) => void) => {
      ipcRenderer.on('runtime:statusChanged', (_event, status) => callback(status));
      return () => ipcRenderer.removeAllListeners('runtime:statusChanged');
    }
  },
  executor: {
    executeGoal: (goal: string, context: Record<string, unknown>) =>
      ipcRenderer.invoke('executor:executeGoal', goal, context),
    executeSteps: (steps: unknown[]) =>
      ipcRenderer.invoke('executor:executeSteps', steps),
    onProgress: (callback: (progress: unknown) => void) => {
      ipcRenderer.on('executor:progress', (_event, progress) => callback(progress));
      return () => ipcRenderer.removeAllListeners('executor:progress');
    }
  },
  evidence: {
    getLogs: () => ipcRenderer.invoke('evidence:getLogs'),
    getScreenshots: () => ipcRenderer.invoke('evidence:getScreenshots')
  },
  media: {
    mute: () => ipcRenderer.invoke('media:mute'),
    unmute: () => ipcRenderer.invoke('media:unmute'),
    hold: () => ipcRenderer.invoke('media:hold'),
    resume: () => ipcRenderer.invoke('media:resume'),
    hangup: () => ipcRenderer.invoke('media:hangup'),
    onTranscript: (callback: (data: TranscriptData) => void) => {
      ipcRenderer.on('media:transcript', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('media:transcript');
    },
    onCallStatus: (callback: (data: CallStatusData) => void) => {
      ipcRenderer.on('media:callStatus', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('media:callStatus');
    }
  },
  brain: {
    onCommand: (callback: (data: CommandData) => void) => {
      ipcRenderer.on('brain:command', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('brain:command');
    },
    setDebugMode: (enabled: boolean) => ipcRenderer.invoke('brain:setDebugMode', enabled)
  }
});

interface TranscriptData {
  text: string;
  speaker: 'agent' | 'customer';
  confidence: number;
  timestamp: string;
}

interface CallStatusData {
  status: 'idle' | 'in-call' | 'on-hold';
  duration?: number;
}

interface CommandData {
  type: string;
  payload: unknown;
  flow_id?: string;
  timestamp: string;
}

declare global {
  interface Window {
    keledon: {
      device: {
        getInfo: () => Promise<{
          deviceId: string;
          version: string;
          platform: string;
          electron: string;
          chrome: string;
          node: string;
        }>;
      };
      runtime: {
        getStatus: () => Promise<{
          status: string;
          connected: boolean;
          sessionId: string | null;
        }>;
        connect: (config: { cloudUrl: string; token: string }) => Promise<{ success: boolean }>;
        disconnect: () => Promise<{ success: boolean }>;
        startSession: (sessionId: string, teamId?: string) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
        onStatusChange: (callback: (status: unknown) => void) => () => void;
      };
      executor: {
        executeGoal: (goal: string, context: Record<string, unknown>) => Promise<unknown>;
        executeSteps: (steps: unknown[]) => Promise<unknown>;
        onProgress: (callback: (progress: unknown) => void) => () => void;
      };
      evidence: {
        getLogs: () => Promise<unknown>;
        getScreenshots: () => Promise<unknown>;
      };
      media: {
        mute: () => Promise<{ success: boolean }>;
        unmute: () => Promise<{ success: boolean }>;
        hold: () => Promise<{ success: boolean }>;
        resume: () => Promise<{ success: boolean }>;
        hangup: () => Promise<{ success: boolean }>;
        onTranscript: (callback: (data: TranscriptData) => void) => () => void;
        onCallStatus: (callback: (data: CallStatusData) => void) => () => void;
      };
      brain: {
        onCommand: (callback: (data: CommandData) => void) => () => void;
        setDebugMode: (enabled: boolean) => Promise<{ success: boolean }>;
      };
    };
  }
}
