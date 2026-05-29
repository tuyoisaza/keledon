/**
 * cmdlog.ts — Command Activity Log
 *
 * In-memory buffer of command polling and WebSocket activity.
 * Each entry is forwarded to the renderer via IPC for the live log viewer.
 * Buffer capped at 500 entries (oldest discarded).
 */

import { BrowserWindow } from 'electron';

export interface CmdLogEntry {
  timestamp: string;
  event: string;   // short event type: 'POLL' | 'CMD' | 'WS' | 'SYS' | 'ERR'
  detail: string;  // human-readable description — include tokens/ids/URLs
}

const MAX_ENTRIES = 500;
const entries: CmdLogEntry[] = [];
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(mw: BrowserWindow | null): void {
  mainWindow = mw;
}

/**
 * Safely truncate a string for display in log entries.
 * Shows first `head` chars and last `tail` chars.
 */
export function truncate(s: string | null | undefined, head = 12, tail = 4): string {
  if (!s) return '(none)';
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

/**
 * Short-form preview of a JSON object for log entries.
 */
export function preview(obj: unknown, maxLen = 80): string {
  try {
    const s = JSON.stringify(obj);
    if (!s || s === '{}') return '(empty)';
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
  } catch {
    return String(obj);
  }
}

export function log(eventType: string, detail: string): void {
  const entry: CmdLogEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    detail,
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('cmdlog:entry', entry);
    } catch {
      // Renderer may not be ready
    }
  }
}

export function getLog(): CmdLogEntry[] {
  return [...entries];
}

export function clearLog(): void {
  entries.length = 0;
}
