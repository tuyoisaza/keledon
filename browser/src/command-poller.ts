/**
 * Command Poller - KELEDON Browser command queue polling
 *
 * Polls the Cloud API for queued commands on a regular interval.
 * The browser is "blind" — it only knows what the Cloud tells it.
 */

import log from 'electron-log';
import { runtimeStatus } from './runtime-state.js';
import * as cmdlog from './cmdlog.js';

export interface BrowserCommand {
  id: string;
  command: 'rpa_execute' | 'call_start' | 'call_transcript' | 'call_decide' | 'call_close' | 'call_escalate' | 'rpa_flow' | 'status_query';
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CommandResult {
  command_id: string;
  status: 'success' | 'failed';
  output?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export interface PollerConfig {
  intervalMs?: number;
  maxRetries?: number;
  backoffMs?: number;
}

type CommandHandler = (command: BrowserCommand) => Promise<CommandResult>;

let pollInterval: ReturnType<typeof setInterval> | null = null;
let isPolling = false;
let backoffMs = 1000;
const DEFAULT_INTERVAL = 2000;
const MAX_BACKOFF = 30000;
const handlers: Map<string, CommandHandler> = new Map();

function getPollInterval(): number {
  return Math.min(backoffMs, DEFAULT_INTERVAL);
}

function resetBackoff(): void {
  backoffMs = 1000;
}

function increaseBackoff(): void {
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
}

export function registerCommandHandler(command: string, handler: CommandHandler): void {
  handlers.set(command, handler);
  log.info(`[CommandPoller] Registered handler for: ${command}`);
}

export function unregisterCommandHandler(command: string): void {
  handlers.delete(command);
}

function getAuthHeaders(): Record<string, string> {
  const token = runtimeStatus.authToken || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function pollForCommand(): Promise<void> {
  if (!isPolling) return;
  if (!runtimeStatus.deviceId) {
    log.debug('[CommandPoller] No device ID, skipping poll');
    return;
  }

  const cloudUrl = runtimeStatus.cloudUrl;
  const deviceId = runtimeStatus.deviceId;

  try {
    const res = await fetch(`${cloudUrl}/api/browser/devices/${deviceId}/next-command`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    
    cmdlog.log('POLL', `GET /next-command → ${res.status}`);

    if (res.ok) {
      resetBackoff();
      const data = await res.json();

      // No commands available
      if (!data || !data.command) {
        cmdlog.log('POLL', `No commands queued (poll every ${getPollInterval()}ms)`);
        return;
      }

      const command: BrowserCommand = data;
      cmdlog.log('CMD', `Received: ${command.command} (${command.id})`);
      log.info(`[CommandPoller] Received command: ${command.command} (${command.id})`);

      // Execute the command
      await executeCommand(command);
    } else if (res.status === 401 || res.status === 403) {
      cmdlog.log('ERR', `Poll auth failed: ${res.status} — token may be invalid`);
      log.error(`[CommandPoller] Auth failed: ${res.status}`);
      // Don't increase backoff for auth errors — they need immediate retry after reconnect
    } else {
      cmdlog.log('POLL', `Poll returned ${res.status}, backing off`);
      log.warn(`[CommandPoller] Poll error: ${res.status}`);
      increaseBackoff();
    }
  } catch (error) {
    cmdlog.log('ERR', `Poll network error: ${error}, backing off`);
    log.error('[CommandPoller] Poll failed:', error);
    increaseBackoff();
  }
}

async function executeCommand(command: BrowserCommand): Promise<void> {
  const handler = handlers.get(command.command);

  if (!handler) {
    cmdlog.log('CMD', `No handler for command: ${command.command} — reporting failed`);
    log.warn(`[CommandPoller] No handler for command: ${command.command}`);
    // Report as failed — unknown command
    await reportResult({
      command_id: command.id,
      status: 'failed',
      error: `Unknown command: ${command.command}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  cmdlog.log('CMD', `Executing: ${command.command} (${command.id})`);
  try {
    const result = await handler(command);
    cmdlog.log('CMD', `Result: ${command.command} (${command.id}) → ${result.status}`);
    await reportResult(result);
  } catch (error) {
    cmdlog.log('ERR', `Execution failed: ${command.command} (${command.id}): ${error}`);
    log.error(`[CommandPoller] Command execution failed:`, error);
    await reportResult({
      command_id: command.id,
      status: 'failed',
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

async function reportResult(result: CommandResult): Promise<void> {
  if (!runtimeStatus.deviceId || !runtimeStatus.authToken) {
    cmdlog.log('ERR', 'Cannot report result — no device ID or auth token');
    log.warn('[CommandPoller] Cannot report result — no device ID or auth token');
    return;
  }

  const cloudUrl = runtimeStatus.cloudUrl;
  const deviceId = runtimeStatus.deviceId;

  try {
    const res = await fetch(`${cloudUrl}/api/browser/devices/${deviceId}/command-result`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(result),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      cmdlog.log('CMD', `Result reported: ${result.command_id} (${result.status})`);
      log.info(`[CommandPoller] Result reported: ${result.command_id} (${result.status})`);
    } else {
      cmdlog.log('ERR', `Failed to report result: ${res.status}`);
      log.error(`[CommandPoller] Failed to report result: ${res.status}`);
    }
  } catch (error) {
    cmdlog.log('ERR', `Report network error: ${error}`);
    log.error('[CommandPoller] Report failed:', error);
  }
}

export function startPolling(config: PollerConfig = {}): void {
  if (isPolling) {
    log.info('[CommandPoller] Already polling, ignoring');
    return;
  }

  isPolling = true;
  const interval = getPollInterval();
  cmdlog.log('SYS', `Command polling started (interval: ${interval}ms)`);
  log.info('[CommandPoller] Starting command polling loop');

  // Poll immediately, then on interval
  pollForCommand().catch(err => log.error('[CommandPoller] Initial poll failed:', err));

  pollInterval = setInterval(() => {
    if (isPolling) {
      pollForCommand().catch(err => log.error('[CommandPoller] Poll failed:', err));
    }
  }, getPollInterval());
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isPolling = false;
  handlers.clear();
  cmdlog.log('SYS', 'Command polling stopped');
  log.info('[CommandPoller] Stopped command polling loop');
}

export function isPollingActive(): boolean {
  return isPolling;
}
