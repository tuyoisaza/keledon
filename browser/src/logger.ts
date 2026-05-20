import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { app } from 'electron';

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

let _logsDir: string = '';
let _startupLog: string = '';
let _mainLog: string = '';
let _installDir: string = '';

function getInstallPath(): string {
  if (!_installDir) {
    if (app.isPackaged) {
      _installDir = path.dirname(process.execPath);
    } else {
      _installDir = process.cwd();
    }
  }
  return _installDir;
}

export function getLogsDir(): string {
  if (!_logsDir) {
    if (app.isReady()) {
      try {
        _logsDir = path.join(app.getPath('userData'), 'logs');
      } catch {
        _logsDir = path.join(os.tmpdir(), 'keledon-logs');
      }
    } else {
      _logsDir = path.join(os.tmpdir(), 'keledon-logs');
    }
    try {
      if (!fs.existsSync(_logsDir)) {
        fs.mkdirSync(_logsDir, { recursive: true });
      }
    } catch { /* ignore */ }
  }
  return _logsDir;
}

export function getStartupLogPath(): string {
  if (!_startupLog) {
    _startupLog = path.join(getLogsDir(), 'startup.log');
  }
  return _startupLog;
}

export function getMainLogPath(): string {
  if (!_mainLog) {
    _mainLog = path.join(getLogsDir(), 'keledon-browser.log');
  }
  return _mainLog;
}

export function getInstallDir(): string {
  return getInstallPath();
}

const rotateLog = (logPath: string): void => {
  try {
    if (!fs.existsSync(logPath)) return;
    const stats = fs.statSync(logPath);
    if (stats.size < MAX_LOG_SIZE) return;
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const older = `${logPath}.${i}`;
      const newer = i === 1 ? logPath : `${logPath}.${i - 1}`;
      if (fs.existsSync(newer)) {
        if (i === MAX_LOG_FILES - 1 && fs.existsSync(older)) {
          fs.unlinkSync(older);
        }
        fs.renameSync(newer, `${logPath}.${i}`);
      }
    }
  } catch { /* ignore */ }
};

export const earlyLog = (msg: string): void => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${msg}\n`;
  try {
    const startupPath = getStartupLogPath();
    rotateLog(startupPath);
    fs.appendFileSync(startupPath, logLine);
  } catch {
    try {
      const fallbackPath = path.join(os.tmpdir(), 'keledon-startup.log');
      fs.appendFileSync(fallbackPath, logLine);
    } catch (_) { /* truly cannot log */ }
  }
  console.log(logLine.trimEnd());
};

export const writeCrashLog = (error: Error | string): void => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const crashFile = path.join(getLogsDir(), `crash-${timestamp}.log`);
  const errorStr = error instanceof Error
    ? `${error.message}\n\nStack:\n${error.stack || 'No stack'}`
    : String(error);
  const crashContent = [
    `KELEDON Browser Crash Report`,
    `Time: ${new Date().toISOString()}`,
    `Version: ${app.getVersion?.() || 'unknown'}`,
    `Electron: ${process.versions.electron || 'unknown'}`,
    `Chrome: ${process.versions.chrome || 'unknown'}`,
    `Node: ${process.versions.node || 'unknown'}`,
    `OS: ${os.platform()} ${os.release()} ${os.arch()}`,
    `Memory: ${Math.round(os.freemem() / 1024 / 1024)}MB free / ${Math.round(os.totalmem() / 1024 / 1024)}MB total`,
    `Uptime: ${Math.round(process.uptime())}s`,
    `Args: ${JSON.stringify(process.argv)}`,
    ``,
    `Error:`,
    errorStr,
  ].join('\n');
  try {
    fs.writeFileSync(crashFile, crashContent);
    earlyLog(`[CRASH] Crash log written to ${crashFile}`);
  } catch (e) {
    earlyLog(`[CRASH] Failed to write crash log: ${e}`);
  }
};
