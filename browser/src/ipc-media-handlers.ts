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
