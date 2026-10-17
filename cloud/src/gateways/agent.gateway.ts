import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  isRuntimeIdentityCurrent,
  ownsRuntimeSession,
  resolveRuntimeIdentity,
} from './runtime-identity';
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
import { CloudCommand } from '../contracts/events';
import {
  AgentRuntimeSocketData,
  AgentSocket,
  AgentSocketData,
  CommandSocketData,
} from './agent-gateway.types';
import { AgentGatewayEventHandlers } from './agent-gateway.event-handlers';
import { persistExecutionEvidence } from './agent-execution-evidence';
import {
  extractContextFromMetadata,
  generateAgentUUID,
  injectTraceMetadata,
  isValidAgentCommand,
  isValidAgentEvent,
} from './agent-gateway.utils';

const gatewayCorsOrigins = resolveCorsOrigins();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCloudCommand(value: unknown): value is CloudCommand {
  if (!isRecord(value)) return false;
  return (
    typeof value.confidence === 'number' &&
    typeof value.mode === 'string' &&
    ['normal', 'safe', 'silent', 'error'].includes(value.mode) &&
    (typeof value.flow_id === 'string' || value.flow_id === null) &&
    (typeof value.flow_run_id === 'string' || value.flow_run_id === null)
  );
}

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
  server: Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    AgentRuntimeSocketData
  >;

  private readonly logger = new Logger(AgentGateway.name);
  private readonly connectedAgents = new Map<string, AgentSocket>();
  private readonly agentSessions = new Map<string, string>(); // clientId -> sessionId
  private readonly tracer = trace.getTracer('keledon-cloud-agent-gateway');
  private readonly eventHandlers: AgentGatewayEventHandlers;

  constructor(
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => DecisionEngineService))
    private readonly decisionEngine: DecisionEngineService,
    private readonly prisma: PrismaService,
  ) {
    this.eventHandlers = new AgentGatewayEventHandlers(
      this.sessionService,
      this.logger,
      (agentId, command) => this.sendCommandToAgent(agentId, command),
    );
  }

  afterInit(): void {
    this.logger.log('AgentGateway: WebSocket server initialized');
  }

  async handleConnection(client: AgentSocket): Promise<void> {
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

  handleDisconnect(client: AgentSocket): void {
    this.logger.log(`Agent disconnected: ${client.id}`);
    this.connectedAgents.delete(client.id);

    // End the session if one was created for this agent
    const sessionId = this.agentSessions.get(client.id);
    if (sessionId) {
      this.agentSessions.delete(client.id);
      void this.endSession(sessionId);
    }

    // Broadcast agent disconnection to dashboard if needed
    if (client.data.runtimeIdentity && this.server) {
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
  async handleBrainEvent(
    client: AgentSocket,
    event: AgentEvent,
  ): Promise<void> {
    if (!(await this.hasOwnedSession(client, event?.session_id))) {
      client.emit('error', { message: 'Invalid session scope' });
      return;
    }
    await client.join(`session:${event.session_id}`);
    const metadata = isRecord(event?.payload?.metadata)
      ? event.payload.metadata
      : undefined;
    const extractedContext = extractContextFromMetadata(metadata);

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
            if (this.decisionEngine && event.event_type === 'text_input') {
              const text = event.payload.text;
              if (typeof text !== 'string' || !text.trim()) {
                client.emit('error', { message: 'Invalid text input' });
                return;
              }
              const confidence = event.payload.confidence;
              const provider = event.payload.provider;
              const eventMetadata = isRecord(event.payload.metadata)
                ? event.payload.metadata
                : {};
              const decision = await this.decisionEngine.processTextInput(
                event.session_id,
                text,
                typeof confidence === 'number' && Number.isFinite(confidence)
                  ? confidence
                  : 0.8,
                typeof provider === 'string' ? provider : 'deepgram',
                eventMetadata,
              );

              // Send command back to agent
              const command: unknown = decision.command;
              if (isCloudCommand(command)) {
                this.sendCommand(event.session_id, command);
              } else {
                client.emit('error', { message: 'Invalid decision command' });
              }
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
            const errorCommand: CloudCommand = {
              command_id: generateAgentUUID(),
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
    client: AgentSocket,
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
        void client.leave(`session:${existingSessionId}`);
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
        `[AgentGateway] Session created: ${session.id} for device ${identity.deviceId}`,
      );

      client.emit('session.created', {
        session_id: session.id,
        agent_id: identity.deviceId,
        status: session.status,
        created_at: session.createdAt,
      });
    } catch (error) {
      console.error(`[AgentGateway] Error creating session:`, error);
      client.emit('error', { message: 'Failed to create session' });
    }
  }

  @SubscribeMessage(KELEDON_AGENT_EVENTS.EXECUTION_RESULT_ACK)
  async handleAgentExecResultAck(
    client: AgentSocket,
    ack: AgentExecResultAck,
  ): Promise<void> {
    if (!(await this.hasOwnedSession(client, ack?.session_id))) {
      client.emit('error', { message: 'Invalid session scope' });
      return;
    }
    const normalizedEvidence = this.normalizeAgentExecAck(ack);
    await this.processExecutionEvidence(client, normalizedEvidence);
  }

  @SubscribeMessage(KELEDON_AGENT_EVENTS.EXECUTION_EVIDENCE)
  async handleExecutionEvidence(
    client: AgentSocket,
    evidence: ExecutionEvidence,
  ): Promise<void> {
    if (!(await this.hasOwnedSession(client, evidence?.session_id))) {
      client.emit('error', { message: 'Invalid session scope' });
      return;
    }
    await this.processExecutionEvidence(client, evidence);
  }

  private async processExecutionEvidence(
    client: AgentSocket,
    evidence: ExecutionEvidence,
  ): Promise<void> {
    await persistExecutionEvidence(client.id, evidence, {
      logger: this.logger,
      sessionService: this.sessionService,
      tracer: this.tracer,
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
  handleTestConnection(
    client: AgentSocket,
    data: Record<string, unknown>,
  ): void {
    const payload = isRecord(data.payload) ? data.payload : {};
    const clientTimestamp =
      typeof data.timestamp === 'number' && Number.isFinite(data.timestamp)
        ? data.timestamp
        : Date.now();

    // Echo back the test message to prove roundtrip
    client.emit('test_connection_response', {
      type: 'test_connection_response',
      sessionId: typeof data.sessionId === 'string' ? data.sessionId : null,
      timestamp: new Date().toISOString(),
      payload: {
        message: 'Cloud response: Connection test successful',
        originalTimestamp: clientTimestamp,
        roundtripTime: Math.max(0, Date.now() - clientTimestamp),
        cloudServer: process.env.HOSTNAME || 'localhost',
        agentVersion:
          typeof payload.agentVersion === 'string'
            ? payload.agentVersion
            : 'unknown',
      },
    });
  }

  // Handle Agent → Cloud events (per canonical contract)
  @SubscribeMessage('event')
  async handleEvent(client: AgentSocket, data: AgentSocketData): Promise<void> {
    try {
      // Validate event structure against canonical contract
      if (!isValidAgentEvent(data)) {
        this.logger.error(
          `Invalid event structure from agent ${client.id}`,
          data,
        );
        client.emit('error', { message: 'Invalid event structure' });
        return;
      }

      if (!(await this.hasOwnedSession(client, data.session_id))) {
        client.emit('error', { message: 'Invalid session scope' });
        return;
      }
      this.logger.log(`Received event from agent ${client.id}: ${data.type}`);

      this.eventHandlers.handle(client, data);
    } catch (error) {
      this.logger.error(
        `Error processing event from agent ${client.id}`,
        error,
      );
      client.emit('error', { message: 'Failed to process event' });
    }
  }

  // Method to send commands to agent (Cloud → Agent)
  sendCommand(sessionId: string, command: CloudCommand): void {
    this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.COMMAND_EMIT, (span) => {
      span.setAttribute('command_type', String(command?.type || 'unknown'));
      span.setAttribute('session_id', sessionId);
      const decisionId = command.metadata?.decision_id;
      if (typeof decisionId === 'string') {
        span.setAttribute('decision.id', decisionId);
      }

      const traceId = span.spanContext().traceId;
      const propagationCarrier: Record<string, string> = {};
      const spanContext = trace.setSpan(context.active(), span);
      propagation.inject(spanContext, propagationCarrier);
      injectTraceMetadata(
        command,
        traceId,
        typeof decisionId === 'string' ? decisionId : undefined,
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
        const metadata = isRecord(command.payload.metadata)
          ? command.payload.metadata
          : {};
        const decisionId = metadata.decision_id;
        if (typeof decisionId === 'string') {
          span.setAttribute('decision.id', decisionId);
        }

        const traceId = span.spanContext().traceId;
        const propagationCarrier: Record<string, string> = {};
        const spanContext = trace.setSpan(context.active(), span);
        propagation.inject(spanContext, propagationCarrier);
        command.payload = {
          ...command.payload,
          metadata: {
            ...metadata,
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

  // Get connected agents count
  getConnectedAgentsCount(): number {
    return this.connectedAgents.size;
  }

  // Get list of connected agent IDs
  getConnectedAgentIds(): string[] {
    return Array.from(this.connectedAgents.keys());
  }

  private async hasOwnedSession(
    client: AgentSocket,
    sessionId: unknown,
  ): Promise<boolean> {
    const identity = client.data.runtimeIdentity;
    return !!identity && ownsRuntimeSession(this.prisma, identity, sessionId);
  }
}
