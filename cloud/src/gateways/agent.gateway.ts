import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import {
  AgentEvent,
  AgentExecResultAck,
  CloudCommand,
  ExecutionEvidence,
} from '../contracts/events';
import { DecisionEngineService } from '../services/decision-engine.service';
import { v4 as uuidv4 } from 'uuid';
import {
  context,
  propagation,
  ROOT_CONTEXT,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import { KELEDON_AGENT_EVENTS, KELEDON_TRACE_SPANS } from '../telemetry/trace-model';
import { AGENT_EXEC_ATTRS } from '../telemetry/decision-evidence';
import { resolveCorsOrigins } from '../config/runtime-tier';

const gatewayCorsOrigins = resolveCorsOrigins();

// Import from canonical contracts
export interface AgentSocketData {
  event_id: string;
  session_id: string;
  timestamp: string;
  type: 'text_input' | 'ui_result' | 'system';
  payload: any;
}

export interface CommandSocketData {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'say' | 'ui_steps' | 'mode' | 'stop';
  payload: any;
}

@WebSocketGateway({
  cors: { 
    origin: gatewayCorsOrigins,
    credentials: true 
  },
  transports: ['websocket', 'polling'],
  namespace: '/agent'
})

export class AgentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);
  private readonly connectedAgents = new Map<string, Socket>();
  private readonly tracer = trace.getTracer('keledon-cloud-agent-gateway');

  constructor(
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => DecisionEngineService))
    private readonly decisionEngine: DecisionEngineService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('AgentGateway: WebSocket server initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Agent connected: ${client.id}`);
    this.connectedAgents.set(client.id, client);
    
    // Send initial connection acknowledgment
    client.emit('connected', {
      agent_id: client.id,
      timestamp: new Date().toISOString(),
      status: 'connected'
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Agent disconnected: ${client.id}`);
    this.connectedAgents.delete(client.id);
    
    // Broadcast agent disconnection to dashboard if needed
    if (this.server && typeof (this.server as any).of === 'function') {
      this.server.of('/dashboard').emit('agent:disconnected', {
        agent_id: client.id,
        timestamp: new Date().toISOString()
      });
    }
  }

  @SubscribeMessage('brain_event')
  async handleBrainEvent(client: Socket, event: AgentEvent): Promise<void> {
    const extractedContext = this.extractContextFromMetadata(event?.payload?.metadata);

    await context.with(extractedContext, async () => {
      await this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.LISTEN, async (span) => {
        span.setAttribute('session_id', event?.session_id || 'unknown');

        try {
          // Validate session exists (canon rule: if no session_id, it does not exist)
          const session = await this.sessionService.getSession(event.session_id);
          if (!session) {
            console.error(`[AgentGateway] Invalid session ${event.session_id} from agent ${client.id}`);
            client.emit('error', { message: 'Invalid session_id' });
            return;
          }

          // Process event with decision engine (Cloud decides)
          if (this.decisionEngine) {
            const decision = await this.decisionEngine.processTextInput(
              event.session_id,
              event.payload.text,
              event.payload.confidence || 0.8,
              event.payload.provider || 'deepgram',
              event.payload.metadata || {},
            );
            const command = decision.command as any;

            // Send command back to agent
            this.sendCommand(event.session_id, command);
          }

          // Persist the original event (canon: all events must be persisted)
          const persistedEvent = await this.sessionService.persistEvent(event.session_id, event);

          console.log(`[AgentGateway] Event processed: ${persistedEvent.id}`);
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });

          console.error(`[AgentGateway] Error processing event:`, error);

          // Send error command (anti-demo rule: show failure)
          const errorCommand: any = {
            command_id: uuidv4(),
            session_id: event.session_id,
            timestamp: new Date().toISOString(),
            type: 'error',
            confidence: 0,
            mode: 'error',
            flow_id: null,
            flow_run_id: null,
            say: {
              text: `Decision processing failed: ${error.message}`,
              interruptible: true,
            },
          };

          this.sendCommand(event.session_id, errorCommand);
        } finally {
          span.end();
        }
      });
    });
  }

  @SubscribeMessage('session.create')
  async handleSessionCreate(client: Socket, data: {
    agent_id: string;
    tab_url?: string;
    tab_title?: string;
  }): Promise<void> {
    try {
      const session = await this.sessionService.create(data.agent_id, {
        tab_url: data.tab_url,
        tab_title: data.tab_title
      });

      console.log(`[AgentGateway] Session created: ${session.id} for agent ${data.agent_id}`);

      client.emit('session.created', {
        session_id: session.id,
        agent_id: session.agent_id,
        status: session.status,
        created_at: session.created_at
      });

    } catch (error) {
      console.error(`[AgentGateway] Error creating session:`, error);
      client.emit('error', { message: 'Failed to create session' });
    }
  }

  @SubscribeMessage(KELEDON_AGENT_EVENTS.EXECUTION_RESULT_ACK)
  async handleAgentExecResultAck(client: Socket, ack: AgentExecResultAck): Promise<void> {
    const normalizedEvidence = this.normalizeAgentExecAck(ack);
    await this.processExecutionEvidence(client, normalizedEvidence);
  }

  @SubscribeMessage(KELEDON_AGENT_EVENTS.EXECUTION_EVIDENCE)
  async handleExecutionEvidence(client: Socket, evidence: ExecutionEvidence): Promise<void> {
    await this.processExecutionEvidence(client, evidence);
  }

  private async processExecutionEvidence(client: Socket, evidence: ExecutionEvidence): Promise<void> {
    const requiredFields = [
      'event',
      'session_id',
      'decision_id',
      'trace_id',
      'command_type',
      'tab_id',
      'execution_result',
    ] as const;

    for (const field of requiredFields) {
      if (!evidence?.[field]) {
        throw new Error(`execution.evidence missing required field: ${field}`);
      }
    }

    if (String(evidence.decision_id).trim().toLowerCase() === 'unknown') {
      throw new Error('execution.evidence malformed: decision_id must be real and non-placeholder');
    }

    if (String(evidence.trace_id).trim().toLowerCase() === 'unknown') {
      throw new Error('execution.evidence malformed: trace_id must be real and non-placeholder');
    }

    const executionStatus = evidence.execution_status || evidence.execution_result;
    if (!executionStatus) {
      throw new Error('execution.evidence missing required field: execution_status');
    }

    const extractedContext = this.extractContextFromMetadata(evidence?.metadata);

    await context.with(extractedContext, async () => {
      await this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.AGENT_EXEC, async (span) => {
        try {
          span.setAttribute('session_id', String(evidence?.session_id || 'unknown'));
          span.setAttribute(AGENT_EXEC_ATTRS.EVENT, String(evidence?.event || 'unknown'));
          span.setAttribute(AGENT_EXEC_ATTRS.DECISION_ID, String(evidence?.decision_id || 'unknown'));
          span.setAttribute(AGENT_EXEC_ATTRS.TRACE_ID, String(evidence?.trace_id || 'unknown'));
          span.setAttribute('command_id', String(evidence?.command_id || 'unknown'));
          span.setAttribute(AGENT_EXEC_ATTRS.COMMAND_TYPE, String(evidence?.command_type || 'unknown'));
          span.setAttribute(AGENT_EXEC_ATTRS.TAB_ID, String(evidence?.tab_id || 'unknown'));
          span.setAttribute(AGENT_EXEC_ATTRS.EXECUTION_RESULT, String(evidence?.execution_result || 'unknown'));
          span.setAttribute(AGENT_EXEC_ATTRS.EXECUTION_STATUS, String(executionStatus));
          span.setAttribute('outcome', String(evidence?.outcome || 'unknown'));
          span.setAttribute('latency_ms', Number(evidence?.latency_ms || 0));

          if (executionStatus !== 'success') {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `Extension execution reported ${executionStatus}`,
            });
          }

          this.logger.log(
            `[C10] execution.evidence ${evidence.event} decision_id=${evidence.decision_id} trace_id=${evidence.trace_id} command_type=${evidence.command_type} tab_id=${evidence.tab_id} result=${evidence.execution_result}`,
          );

          await this.sessionService.persistEvent(evidence.session_id, {
            session_id: evidence.session_id,
            event_type: 'ui_result',
            agent_id: client.id,
            ts: evidence.completed_at,
            payload: {
              kind: 'execution_evidence',
              decision_id: evidence.decision_id,
              trace_id: evidence.trace_id,
              command_id: evidence.command_id,
              event: evidence.event,
              command_type: evidence.command_type,
              tab_id: evidence.tab_id,
              execution_result: evidence.execution_result,
              execution_status: executionStatus,
              execution_timestamp: evidence.execution_timestamp,
              outcome: evidence.outcome,
              started_at: evidence.started_at,
              completed_at: evidence.completed_at,
              latency_ms: evidence.latency_ms,
              evidence: evidence.evidence,
            },
          } as AgentEvent);
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        } finally {
          span.end();
        }
      });
    });
  }

  private normalizeAgentExecAck(ack: AgentExecResultAck): ExecutionEvidence {
    const executionStatus = ack.execution_status;
    const executionTimestamp = ack.execution_timestamp;

    return {
      event: ack.event,
      session_id: ack.session_id,
      decision_id: ack.decision_id,
      trace_id: ack.trace_id,
      command_id: ack.command_id,
      command_type: ack.command_type,
      tab_id: ack.tab_id,
      execution_result: executionStatus,
      execution_status: executionStatus,
      execution_timestamp: executionTimestamp,
      outcome: executionStatus,
      started_at: executionTimestamp,
      completed_at: executionTimestamp,
      latency_ms: 0,
      evidence: {
        source: 'browser-extension',
        action: ack.command_type,
        detail: 'agent_exec_result_ack',
      },
      metadata: ack.metadata,
    };
  }

  // Handle test connection messages from side panel
  @SubscribeMessage('test_connection')
  handleTestConnection(client: Socket, data: any): void {
    this.logger.log(`Test connection received from agent ${client.id}:`, data);
    
    // Echo back the test message to prove roundtrip
    client.emit('test_connection_response', {
      type: 'test_connection_response',
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        message: 'Cloud response: Connection test successful',
        originalTimestamp: data.timestamp,
        roundtripTime: Date.now() - data.timestamp,
        cloudServer: process.env.HOSTNAME || 'localhost',
        agentVersion: data.payload?.agentVersion || 'unknown'
      }
    });
  }

  // Handle Agent → Cloud events (per canonical contract)
  @SubscribeMessage('event')
  handleEvent(client: Socket, data: AgentSocketData): void {
    try {
      this.logger.log(`Received event from agent ${client.id}: ${data.type}`);
      
      // Validate event structure against canonical contract
      if (!this.validateEvent(data)) {
        this.logger.error(`Invalid event structure from agent ${client.id}`, data);
        client.emit('error', { message: 'Invalid event structure' });
        return;
      }

      // Process event based on type
      switch (data.type) {
        case 'text_input':
          this.handleTextInput(client, data);
          break;
        case 'ui_result':
          this.handleUIResult(client, data);
          break;
        case 'system':
          this.handleSystemEvent(client, data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${data.type}`);
      }
      
    } catch (error) {
      this.logger.error(`Error processing event from agent ${client.id}`, error);
      client.emit('error', { message: 'Failed to process event' });
    }
  }

  // Method to send commands to agent (Cloud → Agent)
  sendCommand(sessionId: string, command: any): void {
    this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.COMMAND_EMIT, (span) => {
      span.setAttribute('command_type', String((command as any)?.type || 'unknown'));
      span.setAttribute('session_id', sessionId);
      const decisionId = (command as any)?.metadata?.decision_id;
      if (decisionId) {
        span.setAttribute('decision.id', String(decisionId));
      }

      const traceId = span.spanContext().traceId;
      const propagationCarrier: Record<string, string> = {};
      const spanContext = trace.setSpan(context.active(), span);
      propagation.inject(spanContext, propagationCarrier);
      this.injectTraceMetadata(
        command as Record<string, any>,
        traceId,
        decisionId,
        propagationCarrier.traceparent,
        propagationCarrier.tracestate,
      );

      this.server.emit(`command.${sessionId}`, command);
      if ((command as any).say) {
        console.log(`[AgentGateway] Command sent to session ${sessionId}: ${(command as any).say.text}`);
      }

      span.end();
    });
  }

  // Send Cloud → Agent commands (per canonical contract)
  sendCommandToAgent(agentId: string, command: CommandSocketData): void {
    try {
      const agent = this.connectedAgents.get(agentId);
      if (!agent) {
        this.logger.warn(`Agent ${agentId} not connected`);
        return;
      }

      // Validate command structure against canonical contract
      if (!this.validateCommand(command)) {
        this.logger.error(`Invalid command structure for agent ${agentId}`, command);
        return;
      }

      this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.COMMAND_EMIT, (span) => {
        span.setAttribute('command_type', command.type);
        span.setAttribute('session_id', command.session_id);
        const decisionId = command.payload?.metadata?.decision_id;
        if (decisionId) {
          span.setAttribute('decision.id', String(decisionId));
        }

        const traceId = span.spanContext().traceId;
        const propagationCarrier: Record<string, string> = {};
        const spanContext = trace.setSpan(context.active(), span);
        propagation.inject(spanContext, propagationCarrier);
        command.payload = {
          ...command.payload,
          metadata: {
            ...command.payload?.metadata,
            trace_id: traceId,
            ...(decisionId ? { decision_id: decisionId } : {}),
            ...(propagationCarrier.traceparent ? { traceparent: propagationCarrier.traceparent } : {}),
            ...(propagationCarrier.tracestate ? { tracestate: propagationCarrier.tracestate } : {}),
          },
        };

        agent.emit('command', command);
        this.logger.log(`Sent command to agent ${agentId}: ${command.type}`);
        span.end();
      });
      
    } catch (error) {
      this.logger.error(`Error sending command to agent ${agentId}`, error);
    }
  }

  // Handle text input events (STT output)
  private handleTextInput(client: Socket, event: AgentSocketData): void {
    this.logger.log(`Processing text input: ${event.payload.text}`);
    
    // TODO: Integrate with AI decision engine
    // For now, send back a simple acknowledgment command
    const command: CommandSocketData = {
      command_id: this.generateUUID(),
      session_id: event.session_id,
      timestamp: new Date().toISOString(),
      type: 'say',
      payload: {
        text: `Received: ${event.payload.text}`,
        interruptible: true
      }
    };
    
    this.sendCommandToAgent(client.id, command);
  }

  // Handle UI result events (RPA execution results)
  private handleUIResult(client: Socket, event: AgentSocketData): void {
    this.logger.log(`Processing UI result: ${event.payload.status}`);
    
    // TODO: Store result, continue flow execution
  }

  // Handle system events (lifecycle, errors)
  private handleSystemEvent(client: Socket, event: AgentSocketData): void {
    this.logger.log(`Processing system event: ${event.payload.event}`);
    
    // TODO: Handle system events like call_started, call_ended
    switch (event.payload.event) {
      case 'call_started':
        this.logger.log(`Call started for agent ${client.id}`);
        break;
      case 'call_ended':
        this.logger.log(`Call ended for agent ${client.id}`);
        break;
      case 'error':
        this.logger.error(`Agent error: ${event.payload.data}`);
        break;
    }
  }

  // Validate event against canonical contract
  private validateEvent(event: AgentSocketData): boolean {
    return !!(
      event.event_id &&
      event.session_id &&
      event.timestamp &&
      ['text_input', 'ui_result', 'system'].includes(event.type) &&
      event.payload
    );
  }

  // Validate command against canonical contract
  private validateCommand(command: CommandSocketData): boolean {
    return !!(
      command.command_id &&
      command.session_id &&
      command.timestamp &&
      ['say', 'ui_steps', 'mode', 'stop'].includes(command.type) &&
      command.payload
    );
  }

  // Generate UUID for events/commands
  private generateUUID(): string {
    return uuidv4();
  }

  // Broadcast to sidepanel
  private broadcastToSidePanel(event: string, data: any): void {
    this.server.of('/sidepanel').emit(event, data);
  }

  private extractContextFromMetadata(metadata: Record<string, any> | undefined) {
    const traceparent = metadata?.traceparent;
    const tracestate = metadata?.tracestate;

    if (!traceparent) {
      return ROOT_CONTEXT;
    }

    const carrier: Record<string, string> = { traceparent };
    if (tracestate) {
      carrier.tracestate = tracestate;
    }

    return propagation.extract(ROOT_CONTEXT, carrier);
  }

  private injectTraceMetadata(
    command: Record<string, any>,
    traceId: string,
    decisionId?: string,
    traceparent?: string,
    tracestate?: string,
  ): void {
    command.metadata = {
      ...(command.metadata || {}),
      trace_id: traceId,
      ...(decisionId ? { decision_id: decisionId } : {}),
      ...(traceparent ? { traceparent } : {}),
      ...(tracestate ? { tracestate } : {}),
    };

    if (command.say && typeof command.say === 'object') {
      command.say.metadata = {
        ...(command.say.metadata || {}),
        trace_id: traceId,
        ...(decisionId ? { decision_id: decisionId } : {}),
        ...(traceparent ? { traceparent } : {}),
        ...(tracestate ? { tracestate } : {}),
      };
    }
  }

  // Get connected agents count
  getConnectedAgentsCount(): number {
    return this.connectedAgents.size;
  }

  // Get list of connected agent IDs
  getConnectedAgentIds(): string[] {
    return Array.from(this.connectedAgents.keys());
  }
}
