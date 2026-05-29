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
let totalPolls = 0;
let failedPolls = 0;
let successfulPolls = 0;

function getPollInterval(): number {
  return Math.min(backoffMs, DEFAULT_INTERVAL);
}

function resetBackoff(): void {
  if (backoffMs !== 1000) {
    backoffMs = 1000;
  }
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

function buildContext(): string {
  const deviceId = runtimeStatus.deviceId || '(unset)';
  const tokenPre = cmdlog.truncate(runtimeStatus.authToken, 16, 0);
  const cloudUrl = runtimeStatus.cloudUrl || '(unset)';
  const connStatus = runtimeStatus.status || 'unknown';
  return `device=${cmdlog.truncate(deviceId, 8, 4)} token=${tokenPre} cloud=${cloudUrl} status=${connStatus}`;
}

async function readResponseBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return '(empty body)';
    return text.length > 200 ? text.slice(0, 200) + '…' : text;
  } catch {
    return '(unreadable body)';
  }
}

async function pollForCommand(): Promise<void> {
  if (!isPolling) return;
  if (!runtimeStatus.deviceId) {
    log.debug('[CommandPoller] No device ID, skipping poll');
    return;
  }

  const cloudUrl = runtimeStatus.cloudUrl;
  const deviceId = runtimeStatus.deviceId;
  const url = `${cloudUrl}/api/browser/devices/${deviceId}/next-command`;
  const ctx = buildContext();

  totalPolls++;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    const status = res.status;
    const statusText = res.statusText || '';

    if (res.ok) {
      resetBackoff();
      successfulPolls++;
      const body = await readResponseBody(res);
      const data = JSON.parse(body);

      // No commands available
      if (!data || !data.command) {
        const interval = getPollInterval();
        cmdlog.log('POLL', `← GET /next-command → ${status} ${statusText} | no command queued | poll #${totalPolls} | ctx: ${ctx} | interval: ${interval}ms`);
        return;
      }

      const command: BrowserCommand = data;
      cmdlog.log('CMD', `← GET /next-command → ${status} ${statusText} | command: ${command.command} (${command.id}) | poll #${totalPolls} | ctx: ${ctx}`);
      cmdlog.log('CMD', `→ Executing: ${command.command} (${command.id}) | payload: ${cmdlog.preview(command.payload)}`);
      log.info(`[CommandPoller] Received command: ${command.command} (${command.id})`);

      // Execute the command
      await executeCommand(command);
    } else if (status === 401 || status === 403) {
      failedPolls++;
      const responseBody = await readResponseBody(res);
      cmdlog.log('ERR', `← GET /next-command → ${status} ${statusText} | poll #${totalPolls} | ctx: ${ctx} | response: ${responseBody}`);
      log.error(`[CommandPoller] Auth failed: ${status} — body: ${responseBody}`);
      // Don't increase backoff for auth errors — they need immediate retry after reconnect
    } else {
      failedPolls++;
      const responseBody = await readResponseBody(res);
      cmdlog.log('POLL', `← GET /next-command → ${status} ${statusText} | poll #${totalPolls} | ctx: ${ctx} | response: ${responseBody} | backing off to ${backoffMs * 2}ms`);
      log.warn(`[CommandPoller] Poll error: ${status} — body: ${responseBody}`);
      increaseBackoff();
    }
  } catch (error) {
    failedPolls++;
    const errMsg = error instanceof Error ? error.message : String(error);
    cmdlog.log('ERR', `← GET /next-command → NETWORK ERROR | poll #${totalPolls} | ctx: ${ctx} | error: ${errMsg} | backing off to ${backoffMs * 2}ms`);
    log.error('[CommandPoller] Poll failed:', error);
    increaseBackoff();
  }
}

async function executeCommand(command: BrowserCommand): Promise<void> {
  const handler = handlers.get(command.command);

  if (!handler) {
    cmdlog.log('CMD', `→ No handler registered for command type "${command.command}" (${command.id}) — reporting failed`);
    log.warn(`[CommandPoller] No handler for command: ${command.command}`);
    await reportResult({
      command_id: command.id,
      status: 'failed',
      error: `Unknown command: ${command.command}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const payloadPreview = cmdlog.preview(command.payload);
  cmdlog.log('CMD', `→ Executing handler: ${command.command} (${command.id}) | payload: ${payloadPreview}`);
  try {
    const result = await handler(command);
    cmdlog.log('CMD', `← Handler result: ${command.command} (${command.id}) → ${result.status}${result.error ? ` | error: ${result.error}` : ''}${result.output ? ` | output: ${cmdlog.preview(result.output)}` : ''}`);
    await reportResult(result);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    cmdlog.log('ERR', `→ Handler threw: ${command.command} (${command.id}) | error: ${errMsg}`);
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
    cmdlog.log('ERR', `Cannot report result for ${result.command_id} — no device ID or auth token | ctx: ${buildContext()}`);
    log.warn('[CommandPoller] Cannot report result — no device ID or auth token');
    return;
  }

  const cloudUrl = runtimeStatus.cloudUrl;
  const deviceId = runtimeStatus.deviceId;
  const url = `${cloudUrl}/api/browser/devices/${deviceId}/command-result`;
  const ctx = buildContext();

  try {
    cmdlog.log('CMD', `→ POST /command-result | command: ${result.command_id} (${result.status}) | body: ${cmdlog.preview(result)} | ctx: ${ctx}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(result),
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = await readResponseBody(res);

    if (res.ok) {
      cmdlog.log('CMD', `← POST /command-result → ${res.status} | ${result.command_id} (${result.status}) reported | response: ${responseBody}`);
      log.info(`[CommandPoller] Result reported: ${result.command_id} (${result.status})`);
    } else {
      cmdlog.log('ERR', `← POST /command-result → ${res.status} | ${result.command_id} | ctx: ${ctx} | response: ${responseBody}`);
      log.error(`[CommandPoller] Failed to report result: ${res.status}`);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    cmdlog.log('ERR', `← POST /command-result → NETWORK ERROR | ${result.command_id} | ctx: ${ctx} | error: ${errMsg}`);
    log.error('[CommandPoller] Report failed:', error);
  }
}

export function startPolling(config: PollerConfig = {}): void {
  if (isPolling) {
    log.info('[CommandPoller] Already polling, ignoring');
    return;
  }

  isPolling = true;
  totalPolls = 0;
  failedPolls = 0;
  successfulPolls = 0;
  const interval = getPollInterval();
  const intervalConfig = config.intervalMs || DEFAULT_INTERVAL;
  const ctx = buildContext();
  const handlerCount = handlers.size;

  cmdlog.log('SYS', `Command polling started | interval: ${interval}ms (configured: ${intervalConfig}ms) | handlers: ${handlerCount} registered | ctx: ${ctx}`);
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
  cmdlog.log('SYS', `Command polling stopped | stats: ${totalPolls} polls (${successfulPolls} ok, ${failedPolls} failed)`);
  log.info('[CommandPoller] Stopped command polling loop');
}

export function isPollingActive(): boolean {
  return isPolling;
}
