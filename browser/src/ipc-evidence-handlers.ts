import { app, ipcMain, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import * as cmdlog from './cmdlog.js';
import type { EventLogger } from './media/event-logger.js';

export function registerEvidenceIpcHandlers(
  getStartupLogPath: () => string,
  getMainLogPath: () => string,
  getLogsDir: () => string,
  INSTALL_DIR: string,
  eventLogger: EventLogger,
): void {

  // --- Evidence: Get Logs ---
  ipcMain.handle('evidence:getLogs', async () => {
    const parts: string[] = [];
    const startupPath = getStartupLogPath();
    const mainPath = getMainLogPath();
    if (fs.existsSync(startupPath)) {
      parts.push('=== STARTUP LOG ===\n');
      parts.push(fs.readFileSync(startupPath, 'utf-8'));
    }
    if (fs.existsSync(mainPath)) {
      parts.push('\n=== RUNTIME LOG ===\n');
      parts.push(fs.readFileSync(mainPath, 'utf-8'));
    }
    return { logs: parts.join('') || 'No logs found', logPath: getLogsDir() };
  });

  // --- Evidence: Copy All Logs ---
  ipcMain.handle('evidence:copyAllLogs', async () => {
    const parts: string[] = [
      `KELEDON Browser Log Dump`,
      `Time: ${new Date().toISOString()}`,
      `Version: ${app.getVersion()}`,
      `Install: ${INSTALL_DIR}`,
      `\n`,
    ];
    const startupPath = getStartupLogPath();
    const mainPath = getMainLogPath();
    if (fs.existsSync(startupPath)) {
      parts.push('=== STARTUP LOG ===\n');
      parts.push(fs.readFileSync(startupPath, 'utf-8'));
    }
    if (fs.existsSync(mainPath)) {
      parts.push('\n=== RUNTIME LOG ===\n');
      parts.push(fs.readFileSync(mainPath, 'utf-8'));
    }
    try {
      const logsDir = getLogsDir();
      const crashFiles = fs.readdirSync(logsDir).filter(f => f.startsWith('crash-'));
      for (const cf of crashFiles.slice(-3)) {
        parts.push(`\n=== ${cf} ===\n`);
        parts.push(fs.readFileSync(path.join(logsDir, cf), 'utf-8'));
      }
    } catch (_) {}
    return { logs: parts.join('') };
  });

  // --- Evidence: Event Logs ---
  ipcMain.handle('evidence:getEventLogs', async (_event, filter?: { level?: string; category?: string; limit?: number }) => {
    const logs = eventLogger.getLogs(filter as any);
    const stats = eventLogger.getStats();
    return { logs, stats };
  });

  ipcMain.handle('evidence:clearEventLogs', async () => {
    eventLogger.clear();
    return { success: true };
  });

  ipcMain.handle('evidence:getLogCategories', async () => {
    return { categories: eventLogger.getCategories() };
  });

  ipcMain.handle('evidence:getScreenshots', async () => {
    return { screenshots: [] };
  });


}
