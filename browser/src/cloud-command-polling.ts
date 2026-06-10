import { BrowserWindow } from 'electron';
import log from 'electron-log';
import * as cmdlog from './cmdlog.js';
import { runtimeStatus } from './runtime-state.js';
import { setMainWindow as setCallMainWindow, startCall, appendTranscript, processDecision, executeRpaFlowFromCommand, closeCall, getCurrentCall } from './call-handler.js';
import { setMainWindow as setRpaMainWindow, executeRpaFlow } from './rpa-executor.js';
import { startPolling, registerCommandHandler, type BrowserCommand, type CommandResult } from './command-poller.js';
import { planGoalActions } from './goal-planner.js';
import type { RpaStep } from './rpa-executor.js';

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

  // ── goal_execute / rpa_execute: accept a natural-language goal → plan → execute steps ──
  registerCommandHandler('goal_execute', async (command: BrowserCommand): Promise<CommandResult> => {
    const goal = (command.payload.goal as string) || '';
    if (!goal.trim()) {
      cmdlog.log('CMD', `goal_execute (${command.id}) → empty goal, failed`);
      return { command_id: command.id, status: 'failed', error: 'Empty goal', timestamp: new Date().toISOString() };
    }
    const inputs = command.payload.inputs as Record<string, unknown> | undefined;
    cmdlog.log('CMD', `goal_execute (${command.id}) → goal: "${goal.substring(0, 100)}" | inputs: ${inputs ? Object.keys(inputs).join(',') : 'none'}`);

    // Step 1: Decompose goal into actions using the heuristic planner
    const actions = planGoalActions(goal, inputs);
    if (actions.length === 0) {
      return { command_id: command.id, status: 'failed', error: 'Could not plan goal', timestamp: new Date().toISOString() };
    }
    cmdlog.log('CMD', `goal_execute (${command.id}) → ${actions.length} planned steps: ${actions.map(a => a.type).join(', ')}`);

    // Step 2: Map GoalPlannerAction[] → RpaStep[]
    const rpaSteps: RpaStep[] = actions.map((a, i) => ({
      step_id: `step-${i + 1}`,
      action: a.type as RpaStep['action'],
      selector: a.selector || a.target || undefined,
      value: a.value,
      url: a.url,
      description: a.description || a.type,
      direction: a.direction,
      timeout: a.timeout,
    }));

    // Step 3: Execute via RPA engine
    const result = await executeRpaFlow({
      flow_id: `goal-${command.id}`,
      name: `Goal: ${goal.substring(0, 60)}`,
      steps: rpaSteps,
    });

    cmdlog.log('CMD', `goal_execute (${command.id}) → status=${result.status} | steps=${result.steps?.length ?? 0} | duration=${result.total_duration_ms}ms${result.error ? ` error=${result.error}` : ''}`);
    return {
      command_id: command.id,
      status: result.status === 'completed' ? 'success' : 'failed',
      output: { steps: result.steps, duration_ms: result.total_duration_ms },
      error: result.error,
      timestamp: new Date().toISOString(),
    };
  });

  // rpa_execute: accept a natural-language goal and execute via goal planner
  registerCommandHandler('rpa_execute', async (command: BrowserCommand): Promise<CommandResult> => {
    const goal = (command.payload.goal as string) || '';
    if (!goal.trim()) {
      cmdlog.log('CMD', `rpa_execute (${command.id}) → empty goal, failed`);
      return { command_id: command.id, status: 'failed', error: 'Empty goal', timestamp: new Date().toISOString() };
    }
    const inputs = command.payload.inputs as Record<string, unknown> | undefined;
    cmdlog.log('CMD', `rpa_execute (${command.id}) → goal: "${goal.substring(0, 100)}" | inputs: ${inputs ? Object.keys(inputs).join(',') : 'none'}`);

    // Decompose goal into actions
    const actions = planGoalActions(goal, inputs);
    if (actions.length === 0) {
      return { command_id: command.id, status: 'failed', error: 'Could not plan goal', timestamp: new Date().toISOString() };
    }
    cmdlog.log('CMD', `rpa_execute (${command.id}) → ${actions.length} planned steps: ${actions.map(a => a.type).join(', ')}`);

    // Map to RPA steps and execute
    const rpaSteps: RpaStep[] = actions.map((a, i) => ({
      step_id: `step-${i + 1}`,
      action: a.type as RpaStep['action'],
      selector: a.selector || a.target || undefined,
      value: a.value,
      url: a.url,
      description: a.description || a.type,
      direction: a.direction,
      timeout: a.timeout,
    }));

    const result = await executeRpaFlow({
      flow_id: `rpa-${command.id}`,
      name: `RPA: ${goal.substring(0, 60)}`,
      steps: rpaSteps,
    });

    cmdlog.log('CMD', `rpa_execute (${command.id}) → status=${result.status} | duration=${result.total_duration_ms}ms`);
    return {
      command_id: command.id,
      status: result.status === 'completed' ? 'success' : 'failed',
      output: { steps: result.steps, duration_ms: result.total_duration_ms },
      error: result.error,
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
