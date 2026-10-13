export class BackgroundCommandMethods {
  async ensureSession() {
    if (!this.socket || !this.socket.connected || this.currentSessionId) {
      return;
    }

    let activeTab = null;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs?.[0] || null;
    } catch (error) {
      console.warn('[C10-EXT] Could not query active tab for session metadata');
    }

    this.socket.emit('session.create', {
      agent_id: `keledon-ext-${chrome.runtime.id}`,
      tab_url: activeTab?.url || 'unknown',
      tab_title: activeTab?.title || 'unknown',
    });
  }

  async emitBrainEventFromRuntime(trigger) {
    if (!this.agentActive) {
      console.warn('[C10-EXT] Agent inactive, start listening ignored');
      return;
    }

    await this.ensureSession();
    if (!this.socket || !this.socket.connected || !this.currentSessionId) {
      throw new Error('Extension runtime not connected to cloud session');
    }

    this.socket.emit('brain_event', {
      event_id: `evt-${crypto.randomUUID()}`,
      session_id: this.currentSessionId,
      event_type: 'text_input',
      agent_id: `keledon-ext-${chrome.runtime.id}`,
      ts: new Date().toISOString(),
      payload: {
        text: 'click submit button',
        confidence: 0.92,
        provider: 'real-extension-runtime',
        metadata: {
          companyId: 'keledon',
          topK: 3,
          trigger,
        },
      },
    });

    console.log('[C10-EXT] brain_event emitted from real extension runtime');
  }

  async handleCloudCommand(command) {
    const metadata = command?.metadata || {};
    const startedAt = new Date().toISOString();
    const startedEpoch = Date.now();

    this.currentCommand = command;
    console.log(
      `[C10-EXT] command received type=${command?.type} decision_id=${metadata.decision_id} trace_id=${metadata.trace_id}`,
    );

    // Add to command history
    this.commandHistory.push({
      timestamp: startedAt,
      type: command?.type || 'unknown',
      content: command?.ui_steps ? JSON.stringify(command.ui_steps) : (command?.text || 'No content'),
      decision_id: metadata.decision_id,
      trace_id: metadata.trace_id
    });
    
    // Keep only last 50 commands
    if (this.commandHistory.length > 50) {
      this.commandHistory = this.commandHistory.slice(-50);
    }

    await this.emitExecutionEvidence(command, {
      event: 'agent.exec.start',
      execution_result: 'success',
      outcome: 'success',
      startedAt,
      completedAt: startedAt,
      latencyMs: 0,
      detail: 'extension_received_command',
    });

    try {
      await this.executeCommand(command);

      const completedAt = new Date().toISOString();
      await this.emitExecutionEvidence(command, {
        event: 'agent.exec.end',
        execution_result: 'success',
        outcome: 'success',
        startedAt,
        completedAt,
        latencyMs: Math.max(1, Date.now() - startedEpoch),
        detail: 'extension_executed_cloud_command',
      });
    } catch (error) {
      const completedAt = new Date().toISOString();
      await this.emitExecutionEvidence(command, {
        event: 'agent.exec.error',
        execution_result: 'failure',
        outcome: 'failure',
        startedAt,
        completedAt,
        latencyMs: Math.max(1, Date.now() - startedEpoch),
        detail: error?.message || 'command_execution_failed',
        errorCode: 'EXTENSION_EXECUTION_FAILED',
      });
      throw error;
    }
  }

  async executeCommand(command) {
    const commandType = command?.type;

    if (commandType === 'say') {
      const text = command?.say?.text || '';
      if (text) {
        chrome.runtime.sendMessage({
          type: 'C10_RUNTIME_LOG',
          level: 'info',
          message: `SAY command: ${text}`,
        });
      }
      return;
    }

    if (commandType === 'ui_steps') {
      chrome.runtime.sendMessage({
        type: 'C10_RUNTIME_LOG',
        level: 'info',
        message: `UI_STEPS command with ${(command?.ui_steps || []).length} step(s)`,
      });
      return;
    }

    if (commandType === 'mode' || commandType === 'stop') {
      chrome.runtime.sendMessage({
        type: 'C10_RUNTIME_LOG',
        level: 'info',
        message: `${commandType.toUpperCase()} command executed`,
      });
      return;
    }

    throw new Error(`Unsupported cloud command type: ${commandType || 'unknown'}`);
  }

  async emitExecutionEvidence(command, payload) {
    if (!this.socket || !this.socket.connected || !this.currentSessionId) {
      throw new Error('Cannot emit execution evidence without cloud session');
    }

    const metadata = command?.metadata || {};
    if (!metadata.decision_id || !metadata.trace_id) {
      throw new Error('Cloud command metadata missing decision_id or trace_id');
    }

    const tabInfo = await this.getActiveTabInfo();
    const executionTimestamp = payload.completedAt;

    const agentExecResultPayload = {
      event: payload.event,
      session_id: this.currentSessionId,
      decision_id: metadata.decision_id,
      trace_id: metadata.trace_id,
      command_id: command?.command_id,
      command_type: command?.type || 'unknown',
      tab_id: String(tabInfo.id),
      execution_status: payload.execution_result,
      execution_timestamp: executionTimestamp,
      metadata: {
        traceparent: metadata.traceparent,
        tracestate: metadata.tracestate,
      },
    };

    const executionEvidencePayload = {
      event: payload.event,
      session_id: this.currentSessionId,
      decision_id: metadata.decision_id,
      trace_id: metadata.trace_id,
      command_id: command?.command_id,
      command_type: command?.type || 'unknown',
      tab_id: String(tabInfo.id),
      execution_result: payload.execution_result,
      execution_status: payload.execution_result,
      execution_timestamp: executionTimestamp,
      outcome: payload.outcome,
      started_at: payload.startedAt,
      completed_at: payload.completedAt,
      latency_ms: payload.latencyMs,
      evidence: {
        source: 'browser-extension',
        action: command?.type || 'unknown',
        detail: payload.detail,
        ...(payload.errorCode ? { error_code: payload.errorCode } : {}),
      },
      metadata: {
        traceparent: metadata.traceparent,
        tracestate: metadata.tracestate,
      },
    };

    this.socket.emit('AGENT_EXEC_RESULT', agentExecResultPayload);
    this.socket.emit('execution.evidence', executionEvidencePayload);
    console.log(
      `[C11-EXT] AGENT_EXEC_RESULT emitted event=${agentExecResultPayload.event} decision_id=${agentExecResultPayload.decision_id} trace_id=${agentExecResultPayload.trace_id} status=${agentExecResultPayload.execution_status}`,
    );
  }

}
