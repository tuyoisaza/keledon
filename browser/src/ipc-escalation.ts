import log from 'electron-log';
import { eventLogger } from './media/event-logger.js';
import { runtimeStatus, mainWindow } from './runtime-state.js';
import { getDeviceSocket } from './cloud-connection.js';

/**
 * Show an escalation notification in the browser window and emit via WebSocket.
 */
export function showEscalation(type: 'trigger' | 'failure', data: {
  triggerWord?: string;
  message: string;
  step?: string;
  retryCount?: number;
  transcript?: string;
}) {
  log.warn('[Escalation]', type, data);
  eventLogger.warn('escalation', `escalation_${type}`, { type, ...data });

  if (mainWindow) {
    mainWindow.webContents.send('escalation:show', { type, data });
  }

  // If via WebSocket, emit to brain
  const deviceSocket = getDeviceSocket();
  if (deviceSocket && deviceSocket.connected) {
    deviceSocket.emit('escalation:alert', {
      type,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Check if text contains any escalation trigger words.
 */
export function checkEscalationTriggers(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const trigger of runtimeStatus.escalationTriggers) {
    if (lowerText.includes(trigger.toLowerCase())) {
      return true;
    }
  }
  return false;
}
