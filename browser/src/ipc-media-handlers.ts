/**
 * IPC Media Handlers - Media layer wrapper for KELEDON browser
 *
 * Wraps the media layer (speech, transcription, calls) for IPC communication.
 * Extracted from ipc-handlers.ts (v0.3.80) for file size compliance (PHDK 600-line limit).
 *
 * @module ipc-media-handlers
 */

import { mediaLayer } from './media/media-layer.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { eventLogger } from './media/event-logger.js';

/**
 * Media layer wrapper for IPC handlers.
 * Provides a clean interface for media operations (calls, speech, transcription)
 * with integrated event logging.
 */
export const mediaLayerWrapper = {
  /** Initialize the media layer (microphone, speaker, RTC) */
  initialize: async () => {
    eventLogger.info('media', 'initialize', {});
    return mediaLayer.initialize();
  },

  /** Get current call status */
  getCallStatus: () => mediaLayer.getCallStatus(),

  /** Start a call session */
  startCall: async (sessionId?: string) => {
    eventLogger.info('media', 'call_start', { sessionId });
    await mediaLayer.startCall(sessionId);
    transcriptMonitor.setMediaLayer(mediaLayer);
    transcriptMonitor.startMonitoring();
    eventLogger.info('media', 'call_started', { sessionId });
    return { success: true };
  },

  /** Stop the current call */
  stopCall: async () => {
    eventLogger.info('media', 'call_stop', {});
    await mediaLayer.stopCall();
    transcriptMonitor.stopMonitoring();
    eventLogger.info('media', 'call_stopped', {});
    return { success: true };
  },

  /** Speak text through TTS */
  speak: async (text: string, interruptible?: boolean) => {
    eventLogger.debug('media', 'tts_speak', { textLength: text.length, interruptible });
    return mediaLayer.speak(text, interruptible);
  },

  /** Stop current speech */
  stopSpeaking: async () => mediaLayer.stopSpeaking(),

  /** Mute the microphone */
  mute: () => {
    eventLogger.info('media', 'mute', {});
    mediaLayer.mute();
  },

  /** Unmute the microphone */
  unmute: () => {
    eventLogger.info('media', 'unmute', {});
    mediaLayer.unmute();
  },

  /** Hold the current call */
  hold: async () => {
    eventLogger.info('media', 'hold', {});
    return mediaLayer.hold();
  },

  /** Resume from hold */
  resume: async () => {
    eventLogger.info('media', 'resume', {});
    return mediaLayer.resume();
  },

  /** Subscribe to media layer events */
  on: (event: string, callback: (...args: unknown[]) => void) => mediaLayer.on(event, callback),

  /** Emit a media layer event */
  emit: (event: string, data?: unknown) => mediaLayer.emit(event, data),
};

export function registerMediaIpcHandlers(
  ipcMain: any,
  runtimeStatus: any,
  getDeviceSocket: () => any | null,
): void {

  // --- Media: Start Call ---
  ipcMain.handle('media:startCall', async (_event, sessionId: string) => {
    try {
      await mediaLayerWrapper.startCall(sessionId);
      runtimeStatus.sessionId = sessionId;
      return { success: true, sessionId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Stop Call ---
  ipcMain.handle('media:stopCall', async () => {
    try {
      await mediaLayerWrapper.stopCall();
      runtimeStatus.sessionId = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Speak ---
  ipcMain.handle('media:speak', async (_event, text: string, interruptible: boolean = true) => {
    try {
      await mediaLayerWrapper.speak(text, interruptible);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Stop Speaking ---
  ipcMain.handle('media:stopSpeaking', async () => {
    try {
      await mediaLayerWrapper.stopSpeaking();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Get Status ---
  ipcMain.handle('media:getStatus', async () => {
    return mediaLayerWrapper.getCallStatus();
  });

  // --- Media: Mute ---
  ipcMain.handle('media:mute', async () => {
    mediaLayerWrapper.mute();
    return { success: true };
  });

  // --- Media: Unmute ---
  ipcMain.handle('media:unmute', async () => {
    mediaLayerWrapper.unmute();
    return { success: true };
  });

  // --- Media: Hold ---
  ipcMain.handle('media:hold', async () => {
    try {
      await mediaLayerWrapper.hold();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Resume ---
  ipcMain.handle('media:resume', async () => {
    try {
      await mediaLayerWrapper.resume();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Hangup ---
  ipcMain.handle('media:hangup', async () => {
    try {
      await mediaLayerWrapper.stopCall();
      runtimeStatus.sessionId = null;
      const deviceSocket = getDeviceSocket();
      if (deviceSocket) {
        deviceSocket.emit('session:end');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
