import { BrowserWindow } from 'electron';
import log from 'electron-log';
import * as cmdlog from './cmdlog.js';
import { runtimeStatus } from './runtime-state.js';
import { setMainWindow as setCallMainWindow, startCall, appendTranscript, processDecision, executeRpaFlowFromCommand, closeCall, getCurrentCall } from './call-handler.js';
import { setMainWindow as setRpaMainWindow } from './rpa-executor.js';
import { startPolling, registerCommandHandler, type BrowserCommand, type CommandResult } from './command-poller.js';

/**
 * Set up Phase 6 command handlers and start polling.
 * Called after WebSockets are connected and auth is established.
 */
export function setupCommandPolling(mainWindow: BrowserWindow | null): void {
  const deviceId = cmdlog.truncate(runtimeStatus.deviceId, 8, 4);
  const tokenPre = cmdlog.truncate(runtimeStatus.authToken, 16, 0);
  const cloudUrl = runtimeStatus.cloudUrl || '(unset)';
  const sessionId = runtimeStatus.sessionId || 'none';
  cmdlog.log('SYS', `Setting up command handlers and starting polling | device: ${deviceId} | token: ${tokenPre} | cloud: ${cloudUrl} | session: ${sessionId}`);
  setCallMainWindow(mainWindow);
  setRpaMainWindow(mainWindow);

  // Register command handlers
  registerCommandHandler('call_start', async (command: BrowserCommand): Promise<CommandResult> => {
    cmdlog.log('CMD', `call_start → session ${command.payload.session_id}`);
    const sessionId = (command.payload.session_id as string) || '';
    if (!sessionId) {
      return { command_id: command.id, status: 'failed', error: 'No session_id', timestamp: new Date().toISOString() };
    }
    startCall(sessionId);
    return { command_id: command.id, status: 'success', output: { sessionId }, timestamp: new Date().toISOString() };
  });

  registerCommandHandler('call_transcript', async (command: BrowserCommand): Promise<CommandResult> => {
    const text = (command.payload.text as string) || '';
    const isFinal = (command.payload.is_final as boolean) || false;
    cmdlog.log('CMD', `call_transcript → ${text.substring(0, 60)}${isFinal ? ' (final)' : ' (partial)'}`);
    appendTranscript(text, isFinal);
    return { command_id: command.id, status: 'success', timestamp: new Date().toISOString() };
  });

  registerCommandHandler('call_decide', async (command: BrowserCommand): Promise<CommandResult> => {
    cmdlog.log('CMD', `call_decide → processing decision`);
    processDecision(command.payload);
    return { command_id: command.id, status: 'success', timestamp: new Date().toISOString() };
  });

  registerCommandHandler('rpa_flow', async (command: BrowserCommand): Promise<CommandResult> => {
    const payload = command.payload as { flow_id?: string; name?: string; steps?: Array<{ step_id?: string; action: string; selector?: string; value?: string; url?: string; description?: string; timeout?: number; direction?: string }> };
    if (!payload.steps || payload.steps.length === 0) {
      cmdlog.log('CMD', `rpa_flow (${command.id}) → no steps, failed`);
      return { command_id: command.id, status: 'failed', error: 'No RPA steps', timestamp: new Date().toISOString() };
    }
    const steps = payload.steps as Array<{ step_id?: string; action: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover' | 'wait_for' | 'submit' | 'assert'; selector?: string; value?: string; url?: string; description?: string; timeout?: number; direction?: string }>;
    cmdlog.log('CMD', `rpa_flow (${command.id}) → ${steps.length} steps: ${steps.map(s => s.action).join(', ')}`);
    const result = await executeRpaFlowFromCommand({
      flow_id: payload.flow_id,
      name: payload.name,
      steps,
    });
    return {
      command_id: command.id,
      status: result.status === 'completed' ? 'success' : 'failed',
      output: { flow_result: result },
      timestamp: new Date().toISOString(),
    };
  });

  registerCommandHandler('call_close', async (command: BrowserCommand): Promise<CommandResult> => {
    const reason = (command.payload.reason as string) || 'Cloud requested close';
    cmdlog.log('CMD', `call_close → ${reason}`);
    closeCall(reason);
    return { command_id: command.id, status: 'success', timestamp: new Date().toISOString() };
  });

  registerCommandHandler('call_escalate', async (command: BrowserCommand): Promise<CommandResult> => {
    const reason = (command.payload.reason as string) || 'Escalation requested';
    cmdlog.log('CMD', `call_escalate → ${reason}`);
    log.info(`[CommandPoller] Escalation: ${reason}`);
    return { command_id: command.id, status: 'success', output: { reason }, timestamp: new Date().toISOString() };
  });

  registerCommandHandler('status_query', async (command: BrowserCommand): Promise<CommandResult> => {
    cmdlog.log('CMD', `status_query → reporting device state`);
    return {
      command_id: command.id,
      status: 'success',
      output: {
        deviceId: runtimeStatus.deviceId,
        callState: getCurrentCallState(),
        status: runtimeStatus.status,
      },
      timestamp: new Date().toISOString(),
    };
  });

  // Start polling
  startPolling();
  cmdlog.log('SYS', 'Command polling initialized and running');
  log.info('[Connection] Phase 6 command polling initialized');
}

function getCurrentCallState(): Record<string, unknown> | null {
  const call = getCurrentCall();
  if (!call) return null;
  return {
    sessionId: call.sessionId,
    state: call.state,
    duration_ms: Date.now() - call.startTime,
  };
}
