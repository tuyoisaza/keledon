import { PrismaService } from '../prisma/prisma.service';
import {
  resolveRuntimeIdentity,
  ownsRuntimeSession,
  isRuntimeIdentityCurrent,
} from './runtime-identity';
import { AgentExecutionEvidenceProcessor } from './agent-execution-evidence.processor';
import { AgentSocketData, CommandSocketData } from './agent-socket.types';
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
  ExecutionEvidence,
} from '../contracts/events';
import { DecisionEngineService } from '../services/decision-engine.service';
import {
  context,
  propagation,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import {
  KELEDON_AGENT_EVENTS,
  KELEDON_TRACE_SPANS,
} from '../telemetry/trace-model';
import { resolveCorsOrigins } from '../config/runtime-tier';
import {
  extractAgentTraceContext,
  injectAgentTraceMetadata,
  isValidAgentCommand,
  isValidAgentEvent,
  newAgentMessageId,
} from './agent-gateway-contracts';

const gatewayCorsOrigins =
  process.env.KELEDON_ALLOW_ALL_CORS === 'true' ? true : resolveCorsOrigins();

@WebSocketGateway({
  cors: {
    origin: gatewayCorsOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/agent',
})
export class AgentGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);
  private readonly connectedAgents = new Map<string, Socket>();
  private readonly agentSessions = new Map<string, string>(); // clientId -> sessionId
  private readonly tracer = trace.getTracer('keledon-cloud-agent-gateway');
  private readonly evidenceProcessor: AgentExecutionEvidenceProcessor;

  constructor(
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => DecisionEngineService))
    private readonly decisionEngine: DecisionEngineService,
    private readonly prisma: PrismaService,
  ) {
    this.evidenceProcessor = new AgentExecutionEvidenceProcessor(
      this.prisma,
      this.sessionService,
      this.logger,
      this.tracer,
      extractAgentTraceContext,
    );
  }

  afterInit(_server: Server): void {
    this.logger.log('AgentGateway: WebSocket server initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    const identity = await resolveRuntimeIdentity(
      this.prisma,
      client.handshake.auth?.token,
      client.handshake.auth?.device_id,
    );
    if (!identity) {
      client.disconnect();
      return;
    }
    client.data.runtimeIdentity = identity;
    this.logger.log(`Agent connected: ${client.id}`);
    this.connectedAgents.set(client.id, client);

    // Send initial connection acknowledgment
    client.emit('connected', {
      agent_id: client.id,
      timestamp: new Date().toISOString(),
      status: 'connected',
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Agent disconnected: ${client.id}`);
    this.connectedAgents.delete(client.id);

    // End the session if one was created for this agent
    const sessionId = this.agentSessions.get(client.id);
    if (sessionId) {
      this.agentSessions.delete(client.id);
      await this.endSession(sessionId);
    }

    // Broadcast agent disconnection to dashboard if needed
    if (
      client.data.runtimeIdentity &&
      this.server &&
      typeof (this.server as any).of === 'function'
    ) {
      this.server
        .of('/dashboard')
        .to(`team:${client.data.runtimeIdentity.teamId}`)
        .emit('agent:disconnected', {
          agent_id: client.id,
          timestamp: new Date().toISOString(),
        });
    }
  }

  private async endSession(sessionId: string): Promise<void> {
    try {
      await this.sessionService.updateSessionStatus(sessionId, 'ended');
      this.logger.log(`Session ended: ${sessionId}`);
    } catch {
      this.logger.error(`Failed to end session ${sessionId}`);
    }
  }

  @SubscribeMessage('brain_event')
  async handleBrainEvent(client: Socket, event: AgentEvent): Promise<void> {
    if (
      !(await ownsRuntimeSession(
        this.prisma,
        client.data.runtimeIdentity,
        event?.session_id,
      ))
    ) {
      client.emit('error', { message: 'Invalid session scope' });
      return;
    }
    await client.join(`session:${event.session_id}`);
    const extractedContext = extractAgentTraceContext(event?.payload?.metadata);

    await context.with(extractedContext, async () => {
      await this.tracer.startActiveSpan(
        KELEDON_TRACE_SPANS.LISTEN,
        async (span) => {
          span.setAttribute('session_id', event?.session_id || 'unknown');

          try {
            // Validate session exists (canon rule: if no session_id, it does not exist)
            const session = await this.sessionService.getSession(
              event.session_id,
            );
            if (!session) {
              console.error(
                `[AgentGateway] Invalid session ${event.session_id} from agent ${client.id}`,
              );
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
            const persistedEvent = await this.sessionService.persistEvent(
              event.session_id,
              event,
            );

            console.log(`[AgentGateway] Event processed: ${persistedEvent.id}`);
          } catch {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: 'Agent event processing failed',
            });

            console.error('[AgentGateway] Error processing event');

            // Send error command (anti-demo rule: show failure)
            const errorCommand: any = {
              command_id: newAgentMessageId(),
              session_id: event.session_id,
              timestamp: new Date().toISOString(),
              type: 'error',
              confidence: 0,
              mode: 'error',
              flow_id: null,
              flow_run_id: null,
              say: {
                text: 'Decision processing failed. Please try again later.',
                interruptible: true,
              },
            };

            this.sendCommand(event.session_id, errorCommand);
          } finally {
            span.end();
          }
        },
      );
    });
  }

  @SubscribeMessage('session.create')
  async handleSessionCreate(
    client: Socket,
    data: {
      agent_id: string;
      tab_url?: string;
      tab_title?: string;
    },
  ): Promise<void> {
    try {
      const identity = client.data.runtimeIdentity;
      if (
        !identity ||
        !(await isRuntimeIdentityCurrent(this.prisma, identity))
      ) {
        client.emit('error', { message: 'Unauthenticated device' });
        return;
      }
      // End any existing session for this client before creating a new one
      const existingSessionId = this.agentSessions.get(client.id);
      if (existingSessionId) {
        await this.endSession(existingSessionId);
      }

      const session = await this.sessionService.create(identity.deviceId, {
        userId: identity.userId,
        teamId: identity.teamId,
        tab_url: data.tab_url,
        tab_title: data.tab_title,
      });

      // Track this session for the client
      this.agentSessions.set(client.id, session.id);
      await client.join(`session:${session.id}`);

      console.log(
        `[AgentGateway] Session created: ${session.id} for agent ${data.agent_id}`,
      );

      client.emit('session.created', {
        session_id: session.id,
        agent_id: data.agent_id,
        status: session.status,
        created_at: session.created_at,
      });
    } catch (error) {
      console.error(`[AgentGateway] Error creating session:`, error);
      client.emit('error', { message: 'Failed to create session' });
    }
  }

  @SubscribeMessage(KELEDON_AGENT_EVENTS.EXECUTION_RESULT_ACK)
  async handleAgentExecResultAck(
    client: Socket,
    ack: AgentExecResultAck,
  ): Promise<void> {
    const normalizedEvidence = this.normalizeAgentExecAck(ack);
    await this.evidenceProcessor.processExecutionEvidence(
      client,
      normalizedEvidence,
    );
  }

  @SubscribeMessage(KELEDON_AGENT_EVENTS.EXECUTION_EVIDENCE)
  async handleExecutionEvidence(
    client: Socket,
    evidence: ExecutionEvidence,
  ): Promise<void> {
    await this.evidenceProcessor.processExecutionEvidence(client, evidence);
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
        agentVersion: data.payload?.agentVersion || 'unknown',
      },
    });
  }

  // Handle Agent → Cloud events (per canonical contract)
  @SubscribeMessage('event')
  async handleEvent(client: Socket, data: AgentSocketData): Promise<void> {
    if (
      !(await ownsRuntimeSession(
        this.prisma,
        client.data.runtimeIdentity,
        data?.session_id,
      ))
    ) {
      client.emit('error', { message: 'Invalid session scope' });
      return;
    }
    try {
      this.logger.log(`Received event from agent ${client.id}: ${data.type}`);

      // Validate event structure against canonical contract
      if (!isValidAgentEvent(data)) {
        this.logger.error(
          `Invalid event structure from agent ${client.id}`,
          data,
        );
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
          this.logger.warn(`Unknown event type: ${String(data.type)}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event from agent ${client.id}`,
        error,
      );
      client.emit('error', { message: 'Failed to process event' });
    }
  }

  // Method to send commands to agent (Cloud → Agent)
  sendCommand(sessionId: string, command: any): void {
    this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.COMMAND_EMIT, (span) => {
      span.setAttribute('command_type', String(command?.type || 'unknown'));
      span.setAttribute('session_id', sessionId);
      const decisionId = command?.metadata?.decision_id;
      if (decisionId) {
        span.setAttribute('decision.id', String(decisionId));
      }

      const traceId = span.spanContext().traceId;
      const propagationCarrier: Record<string, string> = {};
      const spanContext = trace.setSpan(context.active(), span);
      propagation.inject(spanContext, propagationCarrier);
      injectAgentTraceMetadata(
        command as Record<string, any>,
        traceId,
        decisionId,
        propagationCarrier.traceparent,
        propagationCarrier.tracestate,
      );

      this.server
        .to(`session:${sessionId}`)
        .emit(`command.${sessionId}`, command);
      if (command.say) {
        console.log(
          `[AgentGateway] Command sent to session ${sessionId} (${command.say.text.length} characters)`,
        );
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
      if (!isValidAgentCommand(command)) {
        this.logger.error(
          `Invalid command structure for agent ${agentId}`,
          command,
        );
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
            ...(propagationCarrier.traceparent
              ? { traceparent: propagationCarrier.traceparent }
              : {}),
            ...(propagationCarrier.tracestate
              ? { tracestate: propagationCarrier.tracestate }
              : {}),
          },
        };

        agent.emit('command', command);
        this.logger.log(`Sent command to agent ${agentId}: ${command.type}`);
        span.end();
      });
    } catch {
      this.logger.error(`Error sending command to agent ${agentId}`);
    }
  }

  // Handle text input events (STT output)
  private handleTextInput(client: Socket, event: AgentSocketData): void {
    this.logger.log(
      `Processing text input (${event.payload.text.length} characters)`,
    );

    // TODO: Integrate with AI decision engine
    // For now, send back a simple acknowledgment command
    const command: CommandSocketData = {
      command_id: newAgentMessageId(),
      session_id: event.session_id,
      timestamp: new Date().toISOString(),
      type: 'say',
      payload: {
        text: `Received: ${event.payload.text}`,
        interruptible: true,
      },
    };

    this.sendCommandToAgent(client.id, command);
  }

  // Handle UI result events (RPA execution results)
  private handleUIResult(client: Socket, event: AgentSocketData): void {
    this.logger.log(`Processing UI result for session ${event.session_id}`);

    // Store the UI result in database
    this.storeUIResult(event).catch((err) => {
      this.logger.error('Failed to store UI result:', err);
    });

    // Emit to any listeners that might be waiting for this result
    client.emit('ui_result_stored', {
      session_id: event.session_id,
      command_id: event.command_id,
      status: 'stored',
    });
  }

  private async storeUIResult(event: AgentSocketData): Promise<void> {
    try {
      if (this.sessionService) {
        await this.sessionService.persistEvent(event.session_id, {
          session_id: event.session_id,
          event_type: 'ui_result',
          payload: {
            command_id: event.command_id,
            results: event.payload?.results || [],
            error: event.payload?.error,
          },
          ts: event.timestamp || new Date().toISOString(),
          agent_id: event.agent_id || 'unknown',
        });
        this.logger.log(`UI result stored for session ${event.session_id}`);
      }
    } catch (error) {
      this.logger.error('Error storing UI result:', error);
      throw error;
    }
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

  // Broadcast to sidepanel
  private broadcastToSidePanel(event: string, data: any): void {
    if (data?.session_id)
      this.server
        .of('/sidepanel')
        .to(`session:${data.session_id}`)
        .emit(event, data);
  }

  getConnectedAgentsCount(): number {
    return this.connectedAgents.size;
  }

  getConnectedAgentIds(): string[] {
    return Array.from(this.connectedAgents.keys());
  }
}
