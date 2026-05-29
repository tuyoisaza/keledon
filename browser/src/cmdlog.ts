/**
 * cmdlog.ts — Command Activity Log
 *
 * In-memory buffer of command polling and WebSocket activity.
 * Each entry is forwarded to the renderer via IPC for the live log viewer.
 * Buffer capped at 500 entries — oldest are dropped.
 */

import { BrowserWindow } from 'electron';

export interface CmdLogEntry {
  timestamp: string;  // ISO-8601
  event: string;      // short type: 'POLL' | 'CMD' | 'WS' | 'SYS' | 'ERR'
  detail: string;     // human-readable description
}

const MAX_ENTRIES = 500;
const entries: CmdLogEntry[] = [];
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(mw: BrowserWindow | null): void {
  mainWindow = mw;
}

export function log(event: string, detail: string): void {
  const entry: CmdLogEntry = {
    timestamp: new Date().toISOString(),
    event,
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
  return entries.slice();
}

export function clearLog(): void {
  entries.length = 0;
}
