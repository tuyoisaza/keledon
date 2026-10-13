import { SpanStatusCode, Tracer } from '@opentelemetry/api';
import { RAGService } from '../rag/rag.service';
import {
  CanonicalDecisionType,
  DECISION_EVIDENCE_ATTRS,
  DecisionEvidence,
  POLICY_CHECK_ATTRS,
} from '../telemetry/decision-evidence';
import { RetrievalResult } from '../rag/rag.service';
import { KELEDON_TRACE_SPANS } from '../telemetry/trace-model';
import { Logger } from '@nestjs/common';
import { AgentEvent, CloudCommand } from '../contracts/events';
import { DecisionContext } from './decision-engine.types';
import { SessionService } from './session.service';
import { LLMService } from '../llm/llm.service';
import { CommandDecision } from '../llm/llm.types';
import { FlowService } from '../flows/flow.service';
import { SubAgentService } from '../subagents/subagent.service';
import { v4 as uuidv4 } from 'uuid';

export class DecisionContextMethods {
  constructor(
    private readonly sessionService: SessionService,
    private readonly llmService: LLMService | undefined,
    private readonly logger: Logger,
  ) {}

  /**
   * Build decision context from session history and current input
   */
  async buildDecisionContext(
    sessionId: string,
    text: string,
    events: any[],
    metadata: Record<string, any>,
  ): Promise<DecisionContext> {
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
      metadata,
    };
  }

  /**
   * Core decision making logic — uses LLM function calling when available,
   * falls back to rule-based for stop/mode/safe-mode keywords and reports
   * unavailable reasoning instead of inventing a response.
   * vectorContext is already fetched by the caller; pass it in to avoid a second RAG call.
   */
  async makeDecision(
    context: DecisionContext,
    vectorContext: RetrievalResult[] = [],
  ): Promise<CommandDecision> {
    const { currentTranscript, confidence } = context;
    const lower = currentTranscript.toLowerCase().trim();
    const ragContext = vectorContext.map((r) => r.document.content);

    // LLM path: structured function calling (preferred when available)
    if (this.llmService?.isEnabled()) {
      try {
        const decision = await this.llmService.generateCommand(
          currentTranscript,
          ragContext,
        );
        return { ...decision, confidence: decision.confidence ?? confidence };
      } catch (error) {
        this.logger.error(
          'LLM generateCommand failed; applying only deterministic safety rules:',
          error,
        );
      }
    }

    // Rule-based fallback
    if (
      lower.includes('stop') ||
      lower.includes('cancel') ||
      lower.includes('never mind')
    ) {
      return {
        type: 'stop',
        confidence: 0.9,
        reasoning: 'stop keyword detected',
      };
    }

    if (lower.includes('safe mode') || lower.includes('be careful')) {
      return {
        type: 'mode',
        mode: 'safe',
        confidence: 0.9,
        reasoning: 'safe-mode keyword detected',
      };
    }

    if (lower.includes('silent') || lower.includes('quiet')) {
      return {
        type: 'mode',
        mode: 'silent',
        confidence: 0.9,
        reasoning: 'silent keyword detected',
      };
    }

    return {
      type: 'ask',
      text: 'The AI service is unavailable, so I cannot process that request right now. Please try again later.',
      confidence: 0,
      reasoning: 'AI reasoning unavailable; no user intent was inferred',
    };
  }

  /**
   * Persist decision for audit trail
   */
  async persistDecision(
    sessionId: string,
    text: string,
    command: CloudCommand,
    decision: any,
  ): Promise<void> {
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
        processed_at: new Date().toISOString(),
      },
    };

    try {
      await this.sessionService.persistEvent(sessionId, decisionEvent);
    } catch (error) {
      this.logger.error(`Failed to persist decision: ${error.message}`);
    }
  }
}

export class DecisionFlowMethods {
  constructor(
    private readonly flowService: FlowService | undefined,
    private readonly subAgentService: SubAgentService | undefined,
    private readonly logger: Logger,
  ) {}

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
  async executeFlow(
    flowId: string,
    parameters: Record<string, any>,
    sessionId: string,
  ): Promise<{
    success: boolean;
    extractedData: Record<string, any>;
    executionLog: any[];
    totalDuration: number;
  }> {
    if (!this.subAgentService) {
      throw new Error('SubAgentService not available');
    }

    this.logger.log(
      `[DecisionEngine] Executing flow ${flowId} for session ${sessionId}`,
    );
    return this.subAgentService.executeFlow(flowId, parameters, sessionId);
  }

  /**
   * Analyze conversation context and suggest flows
   * Called during decision making to incorporate flow knowledge
   */
  async suggestFlowsForContext(
    transcript: string,
    context: DecisionContext,
  ): Promise<{
    flows: any[];
    reasoning: string;
  }> {
    const suggestions: any[] = [];
    const triggerKeywords = this.extractTriggerKeywords(transcript);

    for (const keyword of triggerKeywords) {
      const matchedFlows = await this.findFlowsByTrigger(
        keyword,
        context.metadata?.teamId,
      );
      for (const flow of matchedFlows) {
        if (!suggestions.find((s) => s.id === flow.id)) {
          suggestions.push({
            ...flow.payload,
            matchKeyword: keyword,
            score: flow.score || 0.5,
          });
        }
      }
    }

    const reasoning =
      suggestions.length > 0
        ? `Found ${suggestions.length} flow(s) matching context triggers: ${triggerKeywords.join(', ')}`
        : 'No flows found matching current context';

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
  async generateFlowCommand(
    flow: any,
    parameters: Record<string, any>,
    sessionId: string,
  ): Promise<CloudCommand> {
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
      ui_steps:
        flow.steps?.map((step: any) => ({
          step_id: step.id,
          action: step.type,
          selector: step.selector,
          value: step.value,
        })) || [],
      say: {
        text: flow.description || 'Executing workflow',
        interruptible: true,
      },
    };

    return command;
  }
}

export class DecisionPolicyMethods {
  constructor(
    private readonly ragService: RAGService | undefined,
    private readonly tracer: Tracer,
  ) {}

  mapDecisionType(commandType: string | undefined): CanonicalDecisionType {
    if (commandType === 'say') {
      return 'RESPOND';
    }

    if (
      commandType === 'ui_steps' ||
      commandType === 'mode' ||
      commandType === 'stop'
    ) {
      return 'ACT';
    }

    if (commandType === 'ask') {
      return 'ASK';
    }

    return 'WAIT';
  }

  attachDecisionEvidence(span: any, evidence: DecisionEvidence): void {
    span.setAttribute(
      DECISION_EVIDENCE_ATTRS.DECISION_ID,
      evidence.decision_id,
    );
    span.setAttribute(DECISION_EVIDENCE_ATTRS.POLICY_IDS, evidence.policy_ids);
    span.setAttribute(
      DECISION_EVIDENCE_ATTRS.PLAYBOOK_ID,
      evidence.playbook_id,
    );
    span.setAttribute(
      DECISION_EVIDENCE_ATTRS.VECTOR_COLLECTIONS,
      evidence.vector_collections,
    );
    span.setAttribute(
      DECISION_EVIDENCE_ATTRS.VECTOR_DOC_IDS,
      evidence.vector_doc_ids,
    );
    span.setAttribute(
      DECISION_EVIDENCE_ATTRS.CONFIDENCE_SCORE,
      evidence.confidence_score,
    );
    span.setAttribute(
      DECISION_EVIDENCE_ATTRS.DECISION_TYPE,
      evidence.decision_type,
    );
  }

  collectVectorCollections(vectorContext: RetrievalResult[]): string[] {
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

  resolvePlaybookId(
    commandType: string,
    decisionType: CanonicalDecisionType,
  ): string {
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

  async enforcePolicy(
    decisionId: string,
    decision: any,
    decisionType: CanonicalDecisionType,
    vectorContext: RetrievalResult[],
  ): Promise<{ policyIds: string[]; playbookId: string }> {
    return this.tracer.startActiveSpan(
      KELEDON_TRACE_SPANS.POLICY_CHECK,
      async (span) => {
        span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_ID, decisionId);
        span.setAttribute(POLICY_CHECK_ATTRS.DECISION_ID, decisionId);

        try {
          if (!vectorContext.length) {
            throw new Error(
              'No vector documents retrieved - policy enforcement failed',
            );
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
      },
    );
  }

  async retrieveVectorContext(
    sessionId: string,
    text: string,
    metadata: Record<string, any>,
    decisionId: string,
  ): Promise<RetrievalResult[]> {
    return this.tracer.startActiveSpan(
      KELEDON_TRACE_SPANS.VECTOR_RETRIEVE,
      async (span) => {
        const startedAt = Date.now();
        const topK = Number(metadata.topK || 3);
        const collection = process.env.QDRANT_COLLECTION || 'keledon';

        span.setAttribute('vector.collection', collection);
        span.setAttribute('topK', topK);
        span.setAttribute(DECISION_EVIDENCE_ATTRS.DECISION_ID, decisionId);

        if (!this.ragService) {
          const errorMessage =
            'RAGService unavailable - vector retrieval is mandatory for decisions';
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
          throw new Error(errorMessage);
        }

        try {
          const results = await this.ragService.retrieveKnowledge(text, {
            sessionId,
            companyId: metadata.companyId || 'keledon-default',
            decisionId,
            maxResults: topK,
            minScore:
              typeof metadata.minScore === 'number'
                ? metadata.minScore
                : undefined,
          });

          const latencyMs = Date.now() - startedAt;
          const docIds = results.map((result) => result.document.id);
          span.setAttribute('latency_ms', latencyMs);
          span.setAttribute('vector.results', results.length);
          span.setAttribute('vector.doc_ids', docIds);

          if (!results.length) {
            const errorMessage = 'Vector retrieval returned zero documents';
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: errorMessage,
            });
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
      },
    );
  }
}
