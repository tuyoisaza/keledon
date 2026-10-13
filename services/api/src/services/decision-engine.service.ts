import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { AgentGateway } from '../gateways/agent.gateway';
import { CloudCommand } from '../contracts/events';
import { v4 as uuidv4 } from 'uuid';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { RAGService, RetrievalResult } from '../rag/rag.service';
import { KELEDON_TRACE_SPANS } from '../telemetry/trace-model';
import {
  CanonicalDecisionType,
  DECISION_EVIDENCE_ATTRS,
  DecisionEvidence,
} from '../telemetry/decision-evidence';
import { FlowService } from '../flows/flow.service';
import { SubAgentService } from '../subagents/subagent.service';
import { LLMService } from '../llm/llm.service';
import { CommandDecision } from '../llm/llm.types';

import { DecisionContext, DecisionResult } from './decision-engine.types';
export type { DecisionContext, DecisionResult } from './decision-engine.types';
import {
  DecisionContextMethods,
  DecisionFlowMethods,
  DecisionPolicyMethods,
} from './decision-engine.methods';
@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private readonly tracer = trace.getTracer('keledon-cloud-decision-engine');
  private readonly contextMethods: DecisionContextMethods;
  private readonly flowMethods: DecisionFlowMethods;
  private readonly policyMethods: DecisionPolicyMethods;

  constructor(
    @Inject(forwardRef(() => SessionService))
    private sessionService: SessionService,
    @Inject(forwardRef(() => AgentGateway))
    private agentGateway: AgentGateway,
    @Optional()
    private readonly ragService?: RAGService,
    @Optional()
    private readonly flowService?: FlowService,
    @Optional()
    private readonly subAgentService?: SubAgentService,
    @Optional()
    private readonly llmService?: LLMService,
  ) {
    this.contextMethods = new DecisionContextMethods(
      this.sessionService,
      this.llmService,
      this.logger,
    );
    this.flowMethods = new DecisionFlowMethods(
      this.flowService,
      this.subAgentService,
      this.logger,
    );
    this.policyMethods = new DecisionPolicyMethods(
      this.ragService,
      this.tracer,
    );
  }

  /**
   * Process text_input event and generate canonical brain command
   * This is the core "Cloud decides" functionality per canonical specs
   */
  async processTextInput(
    sessionId: string,
    text: string,
    confidence: number,
    provider: string,
    metadata: Record<string, any> = {},
  ): Promise<DecisionResult> {
    const startTime = Date.now();
    const decisionId = uuidv4();

    try {
      // Validate session exists (canonical rule: if no session_id, it does not exist)
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(
          `Session ${sessionId} does not exist - cannot process text input`,
        );
      }

      // Get session context for decision making
      const sessionEvents =
        await this.sessionService.getSessionEvents(sessionId);
      const context = await this.buildDecisionContext(
        sessionId,
        text,
        sessionEvents,
        metadata,
      );

      // Core decision logic (Cloud decides), including mandatory evidence checks.
      const decisionOutcome = await this.tracer.startActiveSpan(
        KELEDON_TRACE_SPANS.DECIDE,
        async (span) => {
          const model =
            metadata.model ||
            provider ||
            process.env.KELEDON_DECISION_MODEL ||
            'rule-engine';
          span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_ID, decisionId);
          span.setAttribute('model', String(model));

          if (typeof metadata.token_count === 'number') {
            span.setAttribute('token_count', metadata.token_count);
          }

          try {
            const vectorContext = await this.retrieveVectorContext(
              sessionId,
              text,
              metadata,
              decisionId,
            );
            const decision = await this.makeDecision(context, vectorContext);
            const decisionType = this.mapDecisionType(decision?.type);
            const policy = await this.enforcePolicy(
              decisionId,
              decision,
              decisionType,
              vectorContext,
            );

            const evidence: DecisionEvidence = {
              decision_id: decisionId,
              policy_ids: policy.policyIds,
              playbook_id: policy.playbookId,
              vector_collections: this.collectVectorCollections(vectorContext),
              vector_doc_ids: vectorContext.map((item) => item.document.id),
              confidence_score: Number(
                decision?.confidence ?? context.confidence ?? 0,
              ),
              decision_type: decisionType,
            };

            this.attachDecisionEvidence(span, evidence);
            span.setAttribute(
              'decision.command_type',
              String(decision?.type || 'unknown'),
            );

            return {
              decision,
              vectorContext,
              evidence,
            };
          } catch (decisionError) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message:
                decisionError instanceof Error
                  ? decisionError.message
                  : String(decisionError),
            });
            throw decisionError;
          } finally {
            span.end();
          }
        },
      );

      context.metadata.vector_context = decisionOutcome.vectorContext;
      context.metadata.decision_evidence = decisionOutcome.evidence;

      // Generate canonical brain command
      const command = await this.generateCommand(
        decisionOutcome.decision,
        sessionId,
        decisionOutcome.evidence,
      );

      // Persist the decision
      await this.persistDecision(sessionId, text, command, {
        ...decisionOutcome.decision,
        context: {
          ...(decisionOutcome.decision?.context || {}),
          decision_evidence: decisionOutcome.evidence,
        },
      });

      const processingTime = Date.now() - startTime;

      console.log(
        `[DecisionEngine] Processed text_input: "${text}" -> command: ${command.type} (confidence: ${command.confidence})`,
      );

      return {
        command,
        confidence: command.confidence,
        reasoning: 'Decision completed with structured evidence',
        context: {
          ...(decisionOutcome.decision?.context || {}),
          decision_evidence: decisionOutcome.evidence,
        },
        processingTime,
        decisionEvidence: decisionOutcome.evidence,
      };
    } catch (error) {
      console.error('[DecisionEngine] Error processing text input:', error);

      // Return error command (anti-demo rule: show failure)
      const errorCommand: CloudCommand = {
        command_id: uuidv4(),
        session_id: sessionId,
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

      return {
        command: errorCommand,
        confidence: 0,
        reasoning: `Error: ${error.message}`,
        context: { error: error.message, decision_id: decisionId },
        processingTime: Date.now() - startTime,
      };
    }
  }

  private mapDecisionType(
    commandType: string | undefined,
  ): CanonicalDecisionType {
    return this.policyMethods.mapDecisionType(commandType);
  }

  private attachDecisionEvidence(span: any, evidence: DecisionEvidence): void {
    this.policyMethods.attachDecisionEvidence(span, evidence);
  }

  private collectVectorCollections(vectorContext: RetrievalResult[]): string[] {
    return this.policyMethods.collectVectorCollections(vectorContext);
  }

  private resolvePlaybookId(
    commandType: string,
    decisionType: CanonicalDecisionType,
  ): string {
    return this.policyMethods.resolvePlaybookId(commandType, decisionType);
  }

  private enforcePolicy(
    decisionId: string,
    decision: any,
    decisionType: CanonicalDecisionType,
    vectorContext: RetrievalResult[],
  ): Promise<{ policyIds: string[]; playbookId: string }> {
    return this.policyMethods.enforcePolicy(
      decisionId,
      decision,
      decisionType,
      vectorContext,
    );
  }

  private retrieveVectorContext(
    sessionId: string,
    text: string,
    metadata: Record<string, any>,
    decisionId: string,
  ): Promise<RetrievalResult[]> {
    return this.policyMethods.retrieveVectorContext(
      sessionId,
      text,
      metadata,
      decisionId,
    );
  }

  /**
   * Generate canonical brain command from decision
   */
  async generateCommand(
    decision: any,
    sessionId: string,
    evidence?: DecisionEvidence,
  ): Promise<CloudCommand> {
    const commandId = uuidv4();
    const timestamp = new Date().toISOString();

    const commandMetadata = evidence
      ? {
          decision_id: evidence.decision_id,
          decision_type: evidence.decision_type,
          playbook_id: evidence.playbook_id,
          policy_ids: evidence.policy_ids,
        }
      : undefined;

    switch (decision.type) {
      case 'say':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'say',
          confidence: decision.confidence || 0.8,
          mode: decision.mode || 'normal',
          flow_id: null,
          flow_run_id: null,
          metadata: commandMetadata,
          say: {
            text: decision.text,
            interruptible: decision.interruptible || true,
            voice: decision.voice,
            language: decision.language,
            speed: decision.speed,
            pitch: decision.pitch,
            volume: decision.volume,
            metadata: commandMetadata,
          },
        };

      case 'ui_steps':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'ui_steps',
          confidence: decision.confidence || 0.8,
          mode: decision.mode || 'normal',
          flow_id: decision.flow_id || null,
          flow_run_id: decision.flow_run_id || null,
          metadata: commandMetadata,
          ui_steps: (decision.steps || []).map((s: any) => ({
            step_id: uuidv4(),
            ...s,
          })),
        };

      case 'ask':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'say',
          confidence: decision.confidence || 0.7,
          mode: 'normal',
          flow_id: null,
          flow_run_id: null,
          metadata: commandMetadata,
          say: {
            text: decision.text || 'Could you clarify what you need?',
            interruptible: true,
            metadata: commandMetadata,
          },
        };

      case 'mode':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'mode',
          confidence: decision.confidence || 0.8,
          mode: decision.mode,
          flow_id: null,
          flow_run_id: null,
          metadata: commandMetadata,
        };

      case 'stop':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'stop',
          confidence: decision.confidence || 1.0,
          mode: decision.mode || 'normal',
          flow_id: null,
          flow_run_id: null,
          metadata: commandMetadata,
        };

      default:
        // Unknown decisions must surface as an error, never as a fabricated
        // acknowledgement that could be mistaken for a completed action.
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'error',
          confidence: 0,
          mode: 'error',
          flow_id: null,
          flow_run_id: null,
          metadata: commandMetadata,
        };
    }
  }

  private buildDecisionContext(
    sessionId: string,
    text: string,
    events: any[],
    metadata: Record<string, any>,
  ): Promise<DecisionContext> {
    return this.contextMethods.buildDecisionContext(
      sessionId,
      text,
      events,
      metadata,
    );
  }

  private makeDecision(
    context: DecisionContext,
    vectorContext: RetrievalResult[] = [],
  ): Promise<CommandDecision> {
    return this.contextMethods.makeDecision(context, vectorContext);
  }

  private persistDecision(
    sessionId: string,
    text: string,
    command: CloudCommand,
    decision: any,
  ): Promise<void> {
    return this.contextMethods.persistDecision(
      sessionId,
      text,
      command,
      decision,
    );
  }

  searchFlows(query: string, teamId?: string): Promise<any[]> {
    return this.flowMethods.searchFlows(query, teamId);
  }

  findFlowsByTrigger(keyword: string, teamId?: string): Promise<any[]> {
    return this.flowMethods.findFlowsByTrigger(keyword, teamId);
  }

  executeFlow(
    flowId: string,
    parameters: Record<string, any>,
    sessionId: string,
  ): Promise<{
    success: boolean;
    extractedData: Record<string, any>;
    executionLog: any[];
    totalDuration: number;
  }> {
    return this.flowMethods.executeFlow(flowId, parameters, sessionId);
  }

  suggestFlowsForContext(
    transcript: string,
    context: DecisionContext,
  ): Promise<{ flows: any[]; reasoning: string }> {
    return this.flowMethods.suggestFlowsForContext(transcript, context);
  }

  generateFlowCommand(
    flow: any,
    parameters: Record<string, any>,
    sessionId: string,
  ): Promise<CloudCommand> {
    return this.flowMethods.generateFlowCommand(flow, parameters, sessionId);
  }
}
