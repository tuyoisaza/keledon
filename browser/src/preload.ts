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
    },
    onConnect: (callback: (data: { keledonId: string; code: string }) => void) => {
      ipcRenderer.on('keledon:launch', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('keledon:launch');
    }
  },
  executor: {
    executeGoal: (goal: string, context: Record<string, unknown>) =>
      ipcRenderer.invoke('executor:executeGoal', goal, context),
    executeSteps: (steps: unknown[]) =>
      ipcRenderer.invoke('executor:executeSteps', steps),
    getCDPUrl: () => ipcRenderer.invoke('executor:getCDPUrl'),
    getCurrentUrl: () => ipcRenderer.invoke('executor:getUrl'),
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
  },
  launcher: {
    onLaunch: (callback: (data: { keledonId: string; code: string; cloudUrl?: string; action?: string }) => void) => {
      ipcRenderer.on('keledon:launch', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('keledon:launch');
    }
  },
  tabs: {
    create: (name: string, url: string) => ipcRenderer.invoke('tabs:create', name, url),
    list: () => ipcRenderer.invoke('tabs:list'),
    switch: (tabId: string) => ipcRenderer.invoke('tabs:switch', tabId),
    close: (tabId: string) => ipcRenderer.invoke('tabs:close', tabId),
    getActive: () => ipcRenderer.invoke('tabs:getActive'),
    onUpdate: (callback: (tabs: TabData[]) => void) => {
      ipcRenderer.on('tabs:updated', (_event, tabs) => callback(tabs));
      return () => ipcRenderer.removeAllListeners('tabs:updated');
    }
  },
  escalation: {
    onShow: (callback: (data: { type: string; data: EscalationData }) => void) => {
      ipcRenderer.on('escalation:show', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('escalation:show');
    },
    onAction: (callback: (action: 'continue' | 'fix' | 'abort', data?: any) => void) => {
      ipcRenderer.on('escalation:action', (_event, data) => callback(data.action, data.data));
      return () => ipcRenderer.removeAllListeners('escalation:action');
    }
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

interface TabData {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

interface EscalationData {
  triggerWord?: string;
  message: string;
  step?: string;
  retryCount?: number;
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
        onConnect: (callback: (data: { keledonId: string; code: string; cloudUrl?: string; action?: string }) => void) => () => void;
      };
      executor: {
        executeGoal: (goal: string, context: Record<string, unknown>) => Promise<unknown>;
        executeSteps: (steps: unknown[]) => Promise<unknown>;
        getCDPUrl: () => Promise<string>;
        getCurrentUrl: () => Promise<string>;
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
      launcher: {
        onLaunch: (callback: (data: { keledonId: string; code: string; cloudUrl?: string; action?: string }) => void) => () => void;
      };
      tabs: {
        create: (name: string, url: string) => Promise<{ id: string; name: string; url: string }>;
        list: () => Promise<{ id: string; name: string; url: string; active: boolean }[]>;
        switch: (tabId: string) => Promise<{ success: boolean }>;
        close: (tabId: string) => Promise<{ success: boolean }>;
        getActive: () => Promise<string>;
        onUpdate: (callback: (tabs: { id: string; name: string; url: string; active: boolean }[]) => void) => () => void;
      };
      escalation: {
        onShow: (callback: (data: { type: 'trigger' | 'failure'; data: EscalationData }) => void) => () => void;
        onAction: (callback: (action: 'continue' | 'fix' | 'abort', data?: any) => void) => () => void;
      };
    };
  }
}