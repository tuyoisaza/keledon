import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { SessionService } from './session.service';
import { AgentGateway } from '../gateways/agent.gateway';
import { AgentEvent, CloudCommand } from '../contracts/events';
import { v4 as uuidv4 } from 'uuid';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { RAGService, RetrievalResult } from '../rag/rag.service';
import { KELEDON_TRACE_SPANS } from '../telemetry/trace-model';
import {
  CanonicalDecisionType,
  DECISION_EVIDENCE_ATTRS,
  DecisionEvidence,
  POLICY_CHECK_ATTRS,
} from '../telemetry/decision-evidence';
import { FlowService } from '../flows/flow.service';
import { SubAgentService } from '../subagents/subagent.service';

export interface DecisionContext {
  sessionId: string;
  agentId: string;
  previousEvents: AgentEvent[];
  currentTranscript: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface DecisionResult {
  command: CloudCommand;
  confidence: number;
  reasoning: string;
  context: Record<string, any>;
  processingTime: number;
  decisionEvidence?: DecisionEvidence;
}

// Command interfaces per canonical contract
interface SayCommand {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'say';
  payload: {
    text: string;
    interruptible?: boolean;
    provider?: string;
    voice?: string;
    metadata?: Record<string, any>;
  };
}

interface UIStepsCommand {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'ui_steps';
  payload: {
    flow_id: string;
    steps: Array<{
      step_id: string;
      action: string;
      selector: string;
      value?: any;
      post_condition?: {
        type: string;
        selector: string;
        expected: any;
      };
    }>;
    context?: Record<string, any>;
    timeout_ms?: number;
  };
}

interface ModeCommand {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'mode';
  payload: {
    mode: 'normal' | 'safe' | 'silent';
    confidence?: number;
    reason?: string;
  };
}

interface StopCommand {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'stop';
  payload: {
    reason?: string;
    graceful?: boolean;
  };
}

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private readonly tracer = trace.getTracer('keledon-cloud-decision-engine');

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
  ) {}

  /**
   * Process text_input event and generate canonical brain command
   * This is the core "Cloud decides" functionality per canonical specs
   */
  async processTextInput(sessionId: string, text: string, confidence: number, provider: string, metadata: Record<string, any> = {}): Promise<DecisionResult> {
    const startTime = Date.now();
    const decisionId = uuidv4();
    
    try {
      // Validate session exists (canonical rule: if no session_id, it does not exist)
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} does not exist - cannot process text input`);
      }

      // Get session context for decision making
      const sessionEvents = await this.sessionService.getSessionEvents(sessionId);
      const context = await this.buildDecisionContext(sessionId, text, sessionEvents, metadata);

      // Core decision logic (Cloud decides), including mandatory evidence checks.
      const decisionOutcome = await this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.DECIDE, async (span) => {
        const model = metadata.model || provider || process.env.KELEDON_DECISION_MODEL || 'rule-engine';
        span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_ID, decisionId);
        span.setAttribute('model', String(model));

        if (typeof metadata.token_count === 'number') {
          span.setAttribute('token_count', metadata.token_count);
        }

        try {
          const vectorContext = await this.retrieveVectorContext(sessionId, text, metadata, decisionId);
          const decision = await this.makeDecision(context);
          const decisionType = this.mapDecisionType(decision?.type);
          const policy = await this.enforcePolicy(decisionId, decision, decisionType, vectorContext);

          const evidence: DecisionEvidence = {
            decision_id: decisionId,
            policy_ids: policy.policyIds,
            playbook_id: policy.playbookId,
            vector_collections: this.collectVectorCollections(vectorContext),
            vector_doc_ids: vectorContext.map((item) => item.document.id),
            confidence_score: Number(decision?.confidence ?? context.confidence ?? 0),
            decision_type: decisionType,
          };

          this.attachDecisionEvidence(span, evidence);
          span.setAttribute('decision.command_type', String(decision?.type || 'unknown'));

          return {
            decision,
            vectorContext,
            evidence,
          };
        } catch (decisionError) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: decisionError instanceof Error ? decisionError.message : String(decisionError),
          });
          throw decisionError;
        } finally {
          span.end();
        }
      });
      
      context.metadata.vector_context = decisionOutcome.vectorContext;
      context.metadata.decision_evidence = decisionOutcome.evidence;

      // Generate canonical brain command
      const command = await this.generateCommand(decisionOutcome.decision, sessionId, decisionOutcome.evidence);

      // Persist the decision
      await this.persistDecision(sessionId, text, command, {
        ...decisionOutcome.decision,
        context: {
          ...(decisionOutcome.decision?.context || {}),
          decision_evidence: decisionOutcome.evidence,
        },
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`[DecisionEngine] Processed text_input: "${text}" -> command: ${command.type} (confidence: ${command.confidence})`);
      
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
          interruptible: true
        }
      };

      return {
        command: errorCommand,
        confidence: 0,
        reasoning: `Error: ${error.message}`,
        context: { error: error.message, decision_id: decisionId },
        processingTime: Date.now() - startTime
      };
    }
  }

  private mapDecisionType(commandType: string | undefined): CanonicalDecisionType {
    if (commandType === 'say') {
      return 'RESPOND';
    }

    if (commandType === 'ui_steps' || commandType === 'mode' || commandType === 'stop') {
      return 'ACT';
    }

    if (commandType === 'ask') {
      return 'ASK';
    }

    return 'WAIT';
  }

  private attachDecisionEvidence(span: any, evidence: DecisionEvidence): void {
    span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_ID, evidence.decision_id);
    span.setAttribute(DECISION_EVIDENCE_ATTRS.POLICY_IDS, evidence.policy_ids);
    span.setAttribute(DECISION_EVIDENCE_ATTRS.PLAYBOOK_ID, evidence.playbook_id);
    span.setAttribute(DECISION_EVIDENCE_ATTRS.VECTOR_COLLECTIONS, evidence.vector_collections);
    span.setAttribute(DECISION_EVIDENCE_ATTRS.VECTOR_DOC_IDS, evidence.vector_doc_ids);
    span.setAttribute(DECISION_EVIDENCE_ATTRS.CONFIDENCE_SCORE, evidence.confidence_score);
    span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_TYPE, evidence.decision_type);
  }

  private collectVectorCollections(vectorContext: RetrievalResult[]): string[] {
    const collections = new Set<string>();

    for (const result of vectorContext) {
      if (result.document.metadata?.source) {
        collections.add(String(result.document.metadata.source));
      }
    }

    if (collections.size === 0) {
      collections.add(process.env.QDRANT_COLLECTION || 'keledon');
    }

    return Array.from(collections);
  }

  private resolvePlaybookId(commandType: string, decisionType: CanonicalDecisionType): string {
    if (commandType === 'ui_steps') {
      return 'playbook.browser.automation.v1';
    }

    if (commandType === 'say') {
      return 'playbook.respond.grounded.v1';
    }

    if (commandType === 'mode' || commandType === 'stop') {
      return 'playbook.safety.control.v1';
    }

    if (decisionType === 'ASK') {
      return 'playbook.clarification.v1';
    }

    return 'playbook.wait.for_signal.v1';
  }

  private async enforcePolicy(
    decisionId: string,
    decision: any,
    decisionType: CanonicalDecisionType,
    vectorContext: RetrievalResult[],
  ): Promise<{ policyIds: string[]; playbookId: string }> {
    return this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.POLICY_CHECK, async (span) => {
      span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_ID, decisionId);
      span.setAttribute(POLICY_CHECK_ATTRS.DECISION_ID, decisionId);

      try {
        if (!vectorContext.length) {
          throw new Error('No vector documents retrieved - policy enforcement failed');
        }

        const commandType = String(decision?.type || '').toLowerCase();
        const policyIds: string[] = ['POLICY_VECTOR_GROUNDED_DECISION'];

        if (['say', 'ui_steps', 'mode', 'stop'].includes(commandType)) {
          policyIds.push('POLICY_COMMAND_TYPE_ALLOWED');
        }

        if (decisionType === 'ACT') {
          policyIds.push('POLICY_ACTION_ALLOWED_BY_CLOUD');
        }

        if (decisionType === 'RESPOND') {
          policyIds.push('POLICY_RESPONSE_REQUIRES_GROUNDING');
        }

        if (decisionType === 'ASK') {
          policyIds.push('POLICY_CLARIFICATION_ALLOWED');
        }

        if (decisionType === 'WAIT') {
          policyIds.push('POLICY_WAIT_FOR_NEXT_EVENT');
        }

        if (!policyIds.length) {
          throw new Error('No applicable policy for decision');
        }

        const playbookId = this.resolvePlaybookId(commandType, decisionType);

        span.setAttribute(POLICY_CHECK_ATTRS.POLICY_IDS, policyIds);
        span.setAttribute(POLICY_CHECK_ATTRS.PLAYBOOK_ID, playbookId);
        span.setAttribute(POLICY_CHECK_ATTRS.APPLIED, true);

        return {
          policyIds,
          playbookId,
        };
      } catch (error) {
        span.setAttribute(POLICY_CHECK_ATTRS.APPLIED, false);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async retrieveVectorContext(
    sessionId: string,
    text: string,
    metadata: Record<string, any>,
    decisionId: string,
  ): Promise<RetrievalResult[]> {
    return this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.VECTOR_RETRIEVE, async (span) => {
      const startedAt = Date.now();
      const topK = Number(metadata.topK || 3);
      const collection = process.env.QDRANT_COLLECTION || 'keledon';

      span.setAttribute('vector.collection', collection);
      span.setAttribute('topK', topK);
      span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_ID, decisionId);

      if (!this.ragService) {
        const errorMessage = 'RAGService unavailable - vector retrieval is mandatory for decisions';
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
        throw new Error(errorMessage);
      }

      try {
        const results = await this.ragService.retrieveKnowledge(text, {
          sessionId,
          companyId: metadata.companyId || 'keledon-default',
          decisionId,
          maxResults: topK,
          minScore: typeof metadata.minScore === 'number' ? metadata.minScore : undefined,
        });

        const latencyMs = Date.now() - startedAt;
        const docIds = results.map((result) => result.document.id);
        span.setAttribute('latency_ms', latencyMs);
        span.setAttribute('vector.results', results.length);
        span.setAttribute('vector.doc_ids', docIds);

        if (!results.length) {
          const errorMessage = 'Vector retrieval returned zero documents';
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
          throw new Error(errorMessage);
        }

        return results;
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        span.setAttribute('latency_ms', latencyMs);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generate canonical brain command from decision
   */
  async generateCommand(decision: any, sessionId: string, evidence?: DecisionEvidence): Promise<CloudCommand> {
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
          }
        };

      case 'ui_steps':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'ui_steps',
          confidence: decision.confidence || 0.8,
          mode: decision.mode || 'normal',
          flow_id: decision.flow_id,
          flow_run_id: decision.flow_run_id || null,
          metadata: commandMetadata,
          ui_steps: decision.steps
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
        // Default to say command for unknown types
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'say',
          confidence: 0.5,
          mode: 'normal',
          flow_id: null,
          flow_run_id: null,
          metadata: commandMetadata,
          say: {
            text: `I understand you said: ${decision.text || 'something'}`,
            interruptible: true,
            metadata: commandMetadata,
          }
        };
    }
  }

  /**
   * Build decision context from session history and current input
   */
  private async buildDecisionContext(sessionId: string, text: string, events: any[], metadata: Record<string, any>): Promise<DecisionContext> {
    // Get session to extract agent ID
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId,
      agentId: session.agent_id,
      previousEvents: events,
      currentTranscript: text,
      confidence: metadata.confidence || 0.8,
      metadata
    };
  }

  /**
   * Core decision making logic
   */
  private async makeDecision(context: DecisionContext): Promise<any> {
    const { currentTranscript, confidence, previousEvents } = context;

    // Simple decision logic for now - can be enhanced with AI
    const text = currentTranscript.toLowerCase().trim();

    // Check for explicit commands
    if (text.includes('stop') || text.includes('cancel') || text.includes('never mind')) {
      return {
        type: 'stop',
        confidence: 0.9,
        mode: 'normal',
        reasoning: 'User requested to stop'
      };
    }

    if (text.includes('safe mode') || text.includes('be careful')) {
      return {
        type: 'mode',
        mode: 'safe',
        confidence: 0.9,
        reasoning: 'User requested safe mode'
      };
    }

    if (text.includes('silent') || text.includes('quiet')) {
      return {
        type: 'mode',
        mode: 'silent',
        confidence: 0.9,
        reasoning: 'User requested silent mode'
      };
    }

    // Check for UI automation patterns
    if (text.includes('click') || text.includes('type') || text.includes('select') || text.includes('fill')) {
      return {
        type: 'ui_steps',
        confidence: 0.7,
        mode: 'normal',
        reasoning: 'User requested UI automation',
        steps: this.parseUISteps(text)
      };
    }

    // Default to saying something back
    return {
      type: 'say',
      text: `I heard: ${currentTranscript}`,
      confidence: confidence,
      mode: 'normal',
      reasoning: 'Default response to user input'
    };
  }

  /**
   * Parse UI automation steps from text
   */
  private parseUISteps(text: string): any[] {
    // Simple parsing logic - can be enhanced with NLP
    const steps: any[] = [];
    
    if (text.includes('click')) {
      const match = text.match(/click\s+(?:on\s+)?(.+?)(?:\s+(?:and|then)\s+|$)/i);
      if (match) {
        steps.push({
          step_id: uuidv4(),
          action: 'click',
          selector: match[1].trim(),
          description: `Click on ${match[1]}`
        });
      }
    }

    if (text.includes('type') || text.includes('fill')) {
      const match = text.match(/(?:type|fill)\s+(.+?)\s+(?:into|in)\s+(.+?)(?:\s+(?:and|then)\s+|$)/i);
      if (match) {
        steps.push({
          step_id: uuidv4(),
          action: 'type',
          selector: match[2].trim(),
          value: match[1].trim().replace(/['"]/g, ''),
          description: `Type "${match[1]}" into ${match[2]}`
        });
      }
    }

    return steps;
  }

  /**
   * Persist decision for audit trail
   */
  private async persistDecision(sessionId: string, text: string, command: CloudCommand, decision: any): Promise<void> {
    // Create a synthetic event to persist the decision
    const decisionEvent: AgentEvent = {
      event_id: uuidv4(),
      session_id: sessionId,
      event_type: 'system',
      agent_id: decision.context?.agentId || 'unknown',
      ts: new Date().toISOString(),
      payload: {
        input_text: text,
        decision: decision,
        command: command,
        processed_at: new Date().toISOString()
      }
    };

    try {
      await this.sessionService.persistEvent(sessionId, decisionEvent);
    } catch (error) {
      this.logger.error(`Failed to persist decision: ${error.message}`);
    }
  }

  /**
   * Search for flows matching the given query
   * Used by the brain to find appropriate flows based on conversation context
   */
  async searchFlows(query: string, teamId?: string): Promise<any[]> {
    if (!this.flowService) {
      this.logger.warn('FlowService not available');
      return [];
    }
    return this.flowService.searchFlows(query, teamId, 5);
  }

  /**
   * Find flows triggered by specific keywords
   */
  async findFlowsByTrigger(keyword: string, teamId?: string): Promise<any[]> {
    if (!this.flowService) {
      this.logger.warn('FlowService not available');
      return [];
    }
    return this.flowService.findByTrigger(keyword, teamId);
  }

  /**
   * Execute a flow and return results
   * Called when brain decides a flow should run
   */
  async executeFlow(flowId: string, parameters: Record<string, any>, sessionId: string): Promise<{
    success: boolean;
    extractedData: Record<string, any>;
    executionLog: any[];
    totalDuration: number;
  }> {
    if (!this.subAgentService) {
      throw new Error('SubAgentService not available');
    }

    this.logger.log(`[DecisionEngine] Executing flow ${flowId} for session ${sessionId}`);
    return this.subAgentService.executeFlow(flowId, parameters, sessionId);
  }

  /**
   * Analyze conversation context and suggest flows
   * Called during decision making to incorporate flow knowledge
   */
  async suggestFlowsForContext(transcript: string, context: DecisionContext): Promise<{
    flows: any[];
    reasoning: string;
  }> {
    const suggestions: any[] = [];
    let reasoning = '';

    const triggerKeywords = this.extractTriggerKeywords(transcript);

    for (const keyword of triggerKeywords) {
      const matchedFlows = await this.findFlowsByTrigger(keyword, context.metadata?.teamId);
      for (const flow of matchedFlows) {
        if (!suggestions.find(s => s.id === flow.id)) {
          suggestions.push({
            ...flow.payload,
            matchKeyword: keyword,
            score: flow.score || 0.5,
          });
        }
      }
    }

    if (suggestions.length > 0) {
      reasoning = `Found ${suggestions.length} flow(s) matching context triggers: ${triggerKeywords.join(', ')}`;
    } else {
      reasoning = 'No flows found matching current context';
    }

    return { flows: suggestions, reasoning };
  }

  /**
   * Extract potential trigger keywords from transcript
   */
  private extractTriggerKeywords(transcript: string): string[] {
    const keywords: string[] = [];
    const lowerTranscript = transcript.toLowerCase();

    const patterns = [
      /\b(check|find|look up|lookup|search)\b.*\b(case|order|ticket|account)\b/gi,
      /\b(create|new|open)\b.*\b(case|order|ticket)\b/gi,
      /\b(update|modify|change)\b.*\b(case|order|account)\b/gi,
      /\b(save|submit|close)\b.*\b(case|order)\b/gi,
      /\b(login|sign in)\b.*\b(salesforce|genesys|hubspot)\b/gi,
    ];

    for (const pattern of patterns) {
      if (pattern.test(lowerTranscript)) {
        const match = transcript.match(pattern);
        if (match) {
          keywords.push(...match);
        }
      }
    }

    return [...new Set(keywords)];
  }

  /**
   * Generate a flow execution command
   */
  async generateFlowCommand(flow: any, parameters: Record<string, any>, sessionId: string): Promise<CloudCommand> {
    const commandId = uuidv4();
    
    const flowRun = this.subAgentService 
      ? await this.subAgentService.executeFlow(flow.id, parameters, sessionId)
      : null;

    const command: CloudCommand = {
      command_id: commandId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      type: 'ui_steps',
      confidence: flow.score || 0.7,
      mode: 'normal',
      flow_id: flow.id,
      flow_run_id: flowRun?.flowId,
      ui_steps: flow.steps?.map((step: any) => ({
        step_id: step.id,
        action: step.type,
        selector: step.selector,
        value: step.value,
      })) || [],
      say: {
        text: flow.description || 'Executing workflow',
        interruptible: true
      }
    };

    return command;
  }
}
