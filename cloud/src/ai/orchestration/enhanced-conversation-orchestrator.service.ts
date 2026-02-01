import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { 
  EnhancedConversationContext,
  OrchestrationOptions,
  OrchestrationResult,
  UserIntent,
  AgentExecution,
  RecommendedAction,
  TaskPriority,
  TaskStatus,
  AgentType,
  TelephonySession,
  RPAExecution,
  FlowExecution,
  SidePanelEvent,
  KnowledgeRetrieval
} from '../types/enhanced-orchestration.types';
import { RAGService } from '../rag/rag.service';
import { FlowExecutionEngine } from '../flow/flow-execution-engine.service';
import { EnhancedRPAService } from '../rpa/enhanced-rpa.service';
import { SidePanelService } from '../side-panel/side-panel.service';

/**
 * 🧠 Enhanced Conversations Orchestrator Service
 * Integrates RAG, Flow Engine, RPA, and Side Panel communication
 */
@Injectable()
export class EnhancedConversationOrchestratorService {
  private readonly logger = new Logger(EnhancedConversationOrchestratorService.name);
  private activeSessions = new Map<string, EnhancedConversationContext>();
  private sessionMetrics = new Map<string, any>();
  private learningPatterns = new Map<string, any>();

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RAGService,
    private readonly flowEngine: FlowExecutionEngine,
    private readonly rpaService: EnhancedRPAService,
    private readonly sidePanelService: SidePanelService
  ) {
    this.initializeEventListeners();
  }

  /**
   * 🚀 Start complete conversation orchestration
   */
  async orchestrateConversation(options: OrchestrationOptions): Promise<OrchestrationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log('[Enhanced Orchestrator] Starting complete orchestration:', {
        sessionId: options.sessionId,
        taskComplexity: options.taskComplexity,
        telephonySession: options.telephonySession,
        agents: options.agents,
        coordinationMode: options.coordinationMode
      });

      // Initialize enhanced context
      const context = await this.initializeEnhancedContext(options);
      this.activeSessions.set(options.sessionId, context);

      // Process STT input if available
      let transcribedText = options.userInput;
      if (options.telephonySession && !transcribedText) {
        transcribedText = await this.processSTTInput(options.telephonySession);
      }

      // Enhanced intent recognition with RAG
      const intent = await this.enhancedIntentRecognition(transcribedText, context, options);
      
      // Execute flow if specified
      let flowExecutions: FlowExecution[] = [];
      if (options.flowId) {
        flowExecutions = await this.executeFlow(options.flowId, options.sessionId, {
          intent,
          variables: { ...context.variables, transcribedText }
        });
      }

      // Generate contextually-aware response using RAG
      const ragResponse = await this.generateRAGResponse(transcribedText, intent, context);
      
      // Coordinate RPA execution if needed
      let rpaExecutions: RPAExecution[] = [];
      if (this.shouldTriggerRPA(intent, context) && options.rpaEnabled) {
        rpaExecutions = await this.triggerRPAWorkflows(intent, context, options.sessionId);
      }

      // Generate recommended actions
      const nextActions = await this.generateEnhancedActions(intent, context, {
        ragResponse,
        flowExecutions,
        rpaExecutions
      });

      // Update conversation context
      await this.updateEnhancedContext(options.sessionId, {
        intent,
        ragResponse,
        flowExecutions,
        rpaExecutions,
        nextActions
      }, context);

      // Communicate with side panel
      await this.updateSidePanel(options.sessionId, {
        context,
        intent,
        ragResponse,
        flowExecutions,
        rpaExecutions
      });

      const result: OrchestrationResult = {
        sessionId: options.sessionId,
        agents: await this.coordinateAgents(intent, context),
        conversation: [{
          id: `turn_${Date.now()}`,
          sessionId: options.sessionId,
          userInput: transcribedText,
          systemResponse: ragResponse.response,
          intent,
          entities: intent.entities,
          confidence: intent.confidence,
          timestamp: new Date(),
          agentId: 'orchestrator-main',
          turnNumber: (context.history?.length || 0) + 1,
          metadata: {
            processingTime: Date.now() - startTime,
            modelUsed: 'gpt-4-turbo',
            tokensUsed: 0, // Would be calculated
            searchQueries: ragResponse.sources,
            rpaExecutions: rpaExecutions.map(e => e.id)
          }
        }],
        context,
        nextActions,
        confidence: this.calculateOverallConfidence(intent, ragResponse, flowExecutions, rpaExecutions),
        processingTime: Date.now() - startTime,
        success: true,
        insights: await this.generateInsights(options, context, { ragResponse, flowExecutions, rpaExecutions }),
        recommendations: await this.generateRecommendations(options, context),
        rpaExecutions,
        flowExecutions,
        knowledgeRetrieval: ragResponse.sources
      };

      // Broadcast completion
      await this.broadcastOrchestrationComplete(options.sessionId, result);

      this.logger.log('[Enhanced Orchestrator] Orchestration completed:', {
        sessionId: options.sessionId,
        processingTime: result.processingTime,
        confidence: result.confidence,
        agentCount: result.agents.length
      });

      return result;
    } catch (error) {
      this.logger.error('[Enhanced Orchestrator] Orchestration failed:', error);
      
      // Broadcast error to side panel
      await this.broadcastError(options.sessionId, error);
      
      throw error;
    }
  }

  /**
   * 🎯 Enhanced intent recognition with RAG integration
   */
  private async enhancedIntentRecognition(userInput: string, context: EnhancedConversationContext, options: OrchestrationOptions): Promise<UserIntent> {
    try {
      this.logger.log(`[Enhanced Orchestrator] Recognizing intent with RAG support: "${userInput}"`);
      
      // Use RAG to enhance intent recognition
      const ragContext = await this.ragService.searchKnowledge(userInput, {
        sessionId: options.sessionId,
        maxResults: 5,
        minScore: 0.7,
        filters: {
          companyId: options.companyId,
          categories: this.getIntentCategories(userInput)
        }
      });

      // Enhanced intent with RAG context
      const intents = [
        {
          id: 'enhanced_rag_intent',
          name: this.extractIntentFromRAG(ragContext, userInput),
          description: `Enhanced intent based on RAG context: ${ragContext.map(r => r.source).join(', ')}`,
          confidence: ragContext.length > 0 ? Math.min(0.95, 0.7 + (ragContext[0]?.score || 0)) : 0.6,
          entities: this.extractEntitiesFromRAG(ragContext, userInput),
          action: this.determineActionFromIntent(userInput, ragContext),
          parameters: {
            userInput,
            ragResults: ragContext,
            contextScore: context.contextScore
          },
          alternatives: this.generateIntentAlternatives(userInput, ragContext),
          metadata: {
            recognizedBy: 'enhanced_rag_system',
            processingTime: Date.now(),
            contextUsed: ragContext.map(r => r.source),
            ragContextAvailable: ragContext.length > 0
          }
        }
      ];

      const selectedIntent = this.selectBestEnhancedIntent(intents, context, options);
      
      this.logger.log('[Enhanced Orchestrator] Enhanced intent recognized:', selectedIntent.name, selectedIntent.confidence);
      return selectedIntent;
    } catch (error) {
      this.logger.error('[Enhanced Orchestrator] Enhanced intent recognition failed:', error);
      
      // Fallback to basic intent
      return {
        id: 'fallback_intent',
        name: 'general_inquiry',
        description: 'General inquiry (RAG unavailable)',
        confidence: 0.5,
        entities: [],
        action: 'provide_information',
        parameters: { userInput, fallbackReason: error.message },
        alternatives: [],
        metadata: {
          recognizedBy: 'fallback_system',
          error: error.message
        }
      };
    }
  }

  /**
   * 🧠 Generate RAG-enhanced response
   */
  private async generateRAGResponse(query: string, intent: UserIntent, context: EnhancedConversationContext): Promise<{
    response: string;
    sources: string[];
    confidence: number;
    processingTime: number;
  }> {
    try {
      this.logger.log('[Enhanced Orchestrator] Generating RAG-enhanced response');
      
      // Get contextual knowledge
      const contextualKnowledge = await this.ragService.getContextualKnowledge(context.sessionId, {
        categories: [intent.name],
        timeRange: {
          start: new Date(Date.now() - 3600000), // Last hour
          end: new Date()
        },
        limit: 10
      });

      // Generate response with RAG context
      const response = await this.ragService.generateResponse(query, {
        retrievals: contextualKnowledge.vectors.map(v => ({
          id: v.id,
          content: v.content,
          source: v.metadata?.source || 'context',
          score: v.metadata?.relevance || 0.5,
          metadata: v.metadata || {},
          timestamp: new Date(v.metadata?.timestamp || Date.now())
        })),
        sessionId: context.sessionId,
        conversationHistory: context.history.slice(-3),
        userPreferences: context.preferences
      });

      this.logger.log('[Enhanced Orchestrator] RAG response generated successfully');
      return response;
    } catch (error) {
      this.logger.error('[Enhanced Orchestrator] RAG response generation failed:', error);
      
      return {
        response: 'I apologize, but I\'m having trouble accessing my knowledge base. Let me help you in a different way.',
        sources: [],
        confidence: 0.3,
        processingTime: 500
      };
    }
  }

  /**
   * 🌊 Execute flow with enhanced coordination
   */
  private async executeFlow(flowId: string, sessionId: string, options: {
    intent: UserIntent;
    variables: Record<string, any>;
  }): Promise<FlowExecution[]> {
    try {
      this.logger.log(`[Enhanced Orchestrator] Executing flow: ${flowId}`);
      
      const flowState = await this.flowEngine.executeFlow(flowId, {
        sessionId,
        userId: this.getUserIdFromSession(sessionId),
        companyId: this.getCompanyIdFromSession(sessionId),
        initialVariables: options.variables,
        trigger: options.intent.name
      });

      return flowState.history;
    } catch (error) {
      this.logger.error(`[Enhanced Orchestrator] Flow execution failed: ${flowId}`, error);
      return [];
    }
  }

  /**
   * 🤖 Trigger RPA workflows based on intent
   */
  private async triggerRPAWorkflows(intent: UserIntent, context: EnhancedConversationContext, sessionId: string): Promise<RPAExecution[]> {
    try {
      this.logger.log(`[Enhanced Orchestrator] Triggering RPA workflows for intent: ${intent.name}`);
      
      const workflowIds = this.getWorkflowsForIntent(intent);
      const executions: RPAExecution[] = [];

      for (const workflowId of workflowIds) {
        const workflowExecutions = await this.rpaService.executeWorkflow(sessionId, workflowId, {
          variables: context.variables
        });
        executions.push(...workflowExecutions);
      }

      return executions;
    } catch (error) {
      this.logger.error('[Enhanced Orchestrator] RPA workflow triggering failed:', error);
      return [];
    }
  }

  /**
   * 🔄 Update enhanced conversation context
   */
  private async updateEnhancedContext(sessionId: string, updates: any, context: EnhancedConversationContext): Promise<void> {
    const updatedContext: EnhancedConversationContext = {
      ...context,
      intents: [...context.intents, updates.intent],
      lastUpdated: new Date(),
      contextScore: this.calculateEnhancedContextScore(context, updates),
      performance: this.updatePerformanceMetrics(context, updates)
    };

    this.activeSessions.set(sessionId, updatedContext);
  }

  /**
   * 📱 Update side panel with latest information
   */
  private async updateSidePanel(sessionId: string, data: {
    context?: EnhancedConversationContext;
    intent?: UserIntent;
    ragResponse?: any;
    flowExecutions?: FlowExecution[];
    rpaExecutions?: RPAExecution[];
  }): Promise<void> {
    try {
      // Update conversation context
      if (data.context) {
        await this.sidePanelService.broadcastConversationUpdate(sessionId, data.context);
      }

      // Update flow executions
      if (data.flowExecutions) {
        for (const execution of data.flowExecutions) {
          await this.sidePanelService.broadcastFlowUpdate(sessionId, execution);
        }
      }

      // Update RPA executions
      if (data.rpaExecutions) {
        for (const execution of data.rpaExecutions) {
          await this.sidePanelService.broadcastRPAUpdate(sessionId, execution);
        }
      }

      // Send system alert if RAG was used
      if (data.ragResponse?.sources?.length > 0) {
        await this.sidePanelService.broadcastSystemAlert(sessionId, {
          type: 'info',
          title: 'Knowledge Retrieved',
          message: `Found ${data.ragResponse.sources.length} relevant knowledge items`,
          details: { sources: data.ragResponse.sources },
          priority: TaskPriority.LOW
        });
      }
    } catch (error) {
      this.logger.error(`[Enhanced Orchestrator] Side panel update failed for session ${sessionId}:`, error);
    }
  }

  /**
   * 📊 Generate enhanced recommendations
   */
  private async generateEnhancedActions(intent: UserIntent, context: EnhancedConversationContext, data: {
    ragResponse?: any;
    flowExecutions?: FlowExecution[];
    rpaExecutions?: RPAExecution[];
  }): Promise<RecommendedAction[]> {
    const actions: RecommendedAction[] = [];

    // Analyze RPA execution results
    if (data.rpaExecutions) {
      const failedRPA = data.rpaExecutions.filter(e => e.status === TaskStatus.FAILED);
      if (failedRPA.length > 0) {
        actions.push({
          id: `action_${Date.now()}_1`,
          type: 'rpa_recovery',
          description: 'Recover failed RPA executions',
          agentId: 'rpa-agent',
          priority: TaskPriority.HIGH,
          parameters: { failedExecutions: failedRPA },
          estimatedDuration: 5000,
          confidence: 0.90,
          reasoning: 'Some RPA workflows failed - attempting recovery'
        });
      }
    }

    // Analyze flow execution results
    if (data.flowExecutions) {
      const failedFlows = data.flowExecutions.filter(e => e.status === TaskStatus.FAILED);
      if (failedFlows.length > 0) {
        actions.push({
          id: `action_${Date.now()}_2`,
          type: 'flow_recovery',
          description: 'Recover failed flow executions',
          agentId: 'orchestrator-main',
          priority: TaskPriority.HIGH,
          parameters: { failedExecutions: failedFlows },
          estimatedDuration: 3000,
          confidence: 0.85,
          reasoning: 'Some flow steps failed - attempting recovery'
        });
      }
    }

    // Add response generation action
    if (data.ragResponse) {
      actions.push({
        id: `action_${Date.now()}_3`,
        type: 'response',
        description: 'Provide RAG-enhanced response to user',
        agentId: 'tts-specialist',
        priority: TaskPriority.NORMAL,
        parameters: { response: data.ragResponse.response },
        estimatedDuration: 2000,
        confidence: data.ragResponse.confidence,
        reasoning: 'Generated response using retrieved knowledge'
      });
    }

    return actions;
  }

  /**
   * 🤖 Coordinate agents with enhanced capabilities
   */
  private async coordinateAgents(intent: UserIntent, context: EnhancedConversationContext): Promise<AgentExecution[]> {
    const executions: AgentExecution[] = [];

    // RAG agent execution
    const ragExecution: AgentExecution = {
      agentId: 'rag-agent',
      agentType: AgentType.RAG_AGENT,
      task: 'knowledge_retrieval',
      status: TaskStatus.COMPLETED,
      startTime: new Date(),
      endTime: new Date(),
      confidence: 0.85,
      coordinationId: `coord_${context.sessionId}_${Date.now()}`,
      metadata: {
        knowledgeItems: context.vectorContext?.vectors?.length || 0,
        searchTime: context.vectorContext?.lastSearchTime || new Date()
      }
    };
    executions.push(ragExecution);

    // Orchestrator execution
    const orchestratorExecution: AgentExecution = {
      agentId: 'orchestrator-main',
      agentType: AgentType.ORCHESTRATOR,
      task: 'conversation_coordination',
      status: TaskStatus.COMPLETED,
      startTime: new Date(),
      endTime: new Date(),
      confidence: intent.confidence,
      coordinationId: `coord_${context.sessionId}_${Date.now()}`,
      metadata: {
        intent: intent.name,
        entities: intent.entities,
        contextScore: context.contextScore
      }
    };
    executions.push(orchestratorExecution);

    return executions;
  }

  /**
   * 🔧 Helper methods
   */
  private async initializeEnhancedContext(options: OrchestrationOptions): Promise<EnhancedConversationContext> {
    const context: EnhancedConversationContext = {
      sessionId: options.sessionId,
      userId: options.userId,
      companyId: options.companyId || 'default',
      telephonySession: options.telephonySession,
      conversationState: 'active',
      history: [],
      entities: {},
      intents: [],
      preferences: {
        voiceSpeed: 1.0,
        interactionStyle: 'friendly',
        preferredAgents: options.agents,
        privacySettings: {
          shareData: false,
          rememberHistory: true,
          allowPersonalization: true
        },
        accessibilitySettings: {
          screenReader: false,
          highContrast: false,
          largeText: false
        },
        automationSettings: {
          confirmationRequired: true,
          speedPreference: 'efficient',
          errorHandling: 'conservative'
        }
      },
      memory: [],
      vectorContext: { vectors: [], searchResults: [], embeddings: [], lastSearchTime: new Date(), searchHistory: [] },
      flowState: {
        flowId: options.flowId || '',
        currentNode: '',
        previousNodes: [],
        variables: {},
        history: [],
        status: 'idle',
        flowDefinition: null as any,
        context: {
          variables: {},
          history: [],
          environment: {
            sessionId: options.sessionId,
            userId: options.userId,
            companyId: options.companyId,
            timestamp: new Date()
          }
        }
      },
      rpaSession: {
        id: '',
        sessionId: options.sessionId,
        flowId: options.flowId,
        browserContext: {
          id: '',
          type: 'browser',
          pageUrl: '',
          pageTitle: '',
          elements: [],
          screenshot: '',
          metadata: {
            userAgent: '',
            viewport: { width: 1920, height: 1080 },
            timestamp: new Date()
          }
        },
        workflows: [],
        currentExecution: undefined,
        status: 'ready' as any,
        startTime: new Date(),
        metadata: {
          browserType: 'chromium',
          viewport: { width: 1920, height: 1080 },
          userAgent: '',
          capabilities: []
        }
      },
      sidePanelConnection: {
        id: '',
        sessionId: options.sessionId,
        socketId: '',
        status: 'connected' as any,
        lastActivity: new Date(),
        capabilities: ['websocket_connection', 'real_time_updates'],
        permissions: {
          canViewWorkflows: true,
          canExecuteRPA: true,
          canViewConversation: true,
          canControlFlow: true,
          canAccessAnalytics: true,
          canModifySettings: false
        },
        events: []
      },
      lastUpdated: new Date(),
      contextScore: 1.0,
      performance: {
        responseTime: 0,
        agentUtilization: {},
        taskSuccessRate: 1.0,
        rpaExecutionTime: 0,
        searchRelevanceScore: 0,
        errorCount: 0,
        bottleneck: null
      },
      security: {
        sessionId: options.sessionId,
        userId: options.userId,
        accessToken: '',
        refreshToken: '',
        permissions: ['conversation_access', 'rpa_execute'],
        roles: ['user'],
        companyId: options.companyId || 'default',
        securityLevel: 'medium',
        lastActivity: new Date(),
        ipAddress: '',
        userAgent: ''
      }
    };

    return context;
  }

  private shouldTriggerRPA(intent: UserIntent, context: EnhancedConversationContext): boolean {
    const rpaTriggers = ['account_update', 'payment_process', 'data_entry', 'form_filling', 'report_generation'];
    return rpaTriggers.includes(intent.name) && context.rpaSession.status === 'ready';
  }

  private getWorkflowsForIntent(intent: UserIntent): string[] {
    const intentToWorkflowMap: Record<string, string[]> = {
      'account_update': ['customer_account_update'],
      'payment_process': ['payment_processing_workflow'],
      'data_entry': ['data_entry_automation'],
      'form_filling': ['form_filling_workflow'],
      'report_generation': ['report_generation_workflow']
    };

    return intentToWorkflowMap[intent.name] || [];
  }

  private calculateOverallConfidence(intent: UserIntent, ragResponse: any, flowExecutions: FlowExecution[], rpaExecutions: RPAExecution[]): number {
    let confidence = intent.confidence * 0.3;
    
    confidence += ragResponse.confidence * 0.4;
    
    const flowSuccessRate = flowExecutions.length > 0 ? 
      flowExecutions.filter(f => f.status === TaskStatus.COMPLETED).length / flowExecutions.length : 0;
    confidence += flowSuccessRate * 0.2;
    
    const rpaSuccessRate = rpaExecutions.length > 0 ? 
      rpaExecutions.filter(r => r.status === TaskStatus.COMPLETED).length / rpaExecutions.length : 0;
    confidence += rpaSuccessRate * 0.1;
    
    return Math.max(0.1, Math.min(0.99, confidence));
  }

  private extractIntentFromRAG(ragContext: KnowledgeRetrieval[], userInput: string): string {
    // Simple intent extraction based on RAG context
    const contextText = ragContext.map(r => r.content.toLowerCase()).join(' ');
    
    if (contextText.includes('account') || contextText.includes('profile')) {
      return 'account_update';
    }
    if (contextText.includes('payment') || contextText.includes('billing')) {
      return 'payment_process';
    }
    if (contextText.includes('form') || contextText.includes('input')) {
      return 'form_filling';
    }
    
    return 'information_query';
  }

  private extractEntitiesFromRAG(ragContext: KnowledgeRetrieval[], userInput: string): any[] {
    // Extract entities from RAG context
    const entities: any[] = [];
    
    // Extract email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = userInput.match(emailRegex) || [];
    entities.push(...emails.map(email => ({
      name: 'email',
      value: email,
      type: 'contact',
      confidence: 0.95
    })));
    
    // Extract phone numbers
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const phones = userInput.match(phoneRegex) || [];
    entities.push(...phones.map(phone => ({
      name: 'phone',
      value: phone,
      type: 'contact',
      confidence: 0.90
    })));
    
    return entities;
  }

  private determineActionFromIntent(userInput: string, ragContext: KnowledgeRetrieval[]): string {
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'who', 'which', 'help', 'explain'];
    const hasQuestionWord = questionWords.some(word => userInput.toLowerCase().includes(word));
    
    if (hasQuestionWord) {
      return 'provide_information';
    }
    
    const commandWords = ['create', 'update', 'delete', 'start', 'stop', 'pause', 'run', 'execute'];
    const hasCommandWord = commandWords.some(word => userInput.toLowerCase().includes(word));
    
    if (hasCommandWord) {
      return 'execute_command';
    }
    
    return 'provide_information';
  }

  private generateIntentAlternatives(userInput: string, ragContext: KnowledgeRetrieval[]): UserIntent[] {
    // Generate alternative intents based on ambiguity
    return [];
  }

  private getIntentCategories(userInput: string): string[] {
    // Map input to intent categories
    if (userInput.toLowerCase().includes('account') || userInput.toLowerCase().includes('profile')) {
      return ['account_management'];
    }
    if (userInput.toLowerCase().includes('payment') || userInput.toLowerCase().includes('billing')) {
      return ['billing', 'payments'];
    }
    if (userInput.toLowerCase().includes('help') || userInput.toLowerCase().includes('support')) {
      return ['customer_service', 'support'];
    }
    
    return ['general'];
  }

  private selectBestEnhancedIntent(intents: UserIntent[], context: EnhancedConversationContext, options: OrchestrationOptions): UserIntent {
    // Select intent based on context score and confidence
    return intents.sort((a, b) => {
      const scoreA = a.confidence * (context.vectorContext.searchResults.length > 0 ? 1.2 : 1.0);
      const scoreB = b.confidence * (context.vectorContext.searchResults.length > 0 ? 1.2 : 1.0);
      return scoreB - scoreA;
    })[0];
  }

  private calculateEnhancedContextScore(context: EnhancedConversationContext, updates: any): number {
    let score = context.contextScore;
    
    // Increase score based on conversation depth
    if (context.history && context.history.length > 0) {
      score += context.history.length * 0.02;
    }
    
    // Increase score based on RAG context
    if (context.vectorContext.vectors && context.vectorContext.vectors.length > 5) {
      score += 0.2;
    }
    
    // Increase score based on entity understanding
    if (updates.intent?.entities && updates.intent.entities.length > 2) {
      score += 0.15;
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  private updatePerformanceMetrics(context: EnhancedConversationContext, updates: any): any {
    const performance = { ...context.performance };
    
    if (updates.ragResponse) {
      performance.searchRelevanceScore = updates.ragResponse.confidence;
    }
    
    if (updates.flowExecutions) {
      const flowSuccessRate = updates.flowExecutions.filter((f: any) => f.status === TaskStatus.COMPLETED).length / updates.flowExecutions.length;
      performance.taskSuccessRate = (performance.taskSuccessRate + flowSuccessRate) / 2;
    }
    
    return performance;
  }

  private async generateInsights(options: OrchestrationOptions, context: EnhancedConversationContext, data: any): Promise<string[]> {
    const insights: string[] = [];
    
    // RAG usage insights
    if (data.ragResponse?.sources?.length > 0) {
      insights.push(`Retrieved ${data.ragResponse.sources.length} knowledge items with ${data.ragResponse.confidence} average confidence`);
    }
    
    // Flow execution insights
    if (data.flowExecutions?.length > 0) {
      const successRate = data.flowExecutions.filter((f: any) => f.status === TaskStatus.COMPLETED).length / data.flowExecutions.length;
      insights.push(`Flow execution success rate: ${Math.round(successRate * 100)}%`);
    }
    
    // RPA execution insights
    if (data.rpaExecutions?.length > 0) {
      const successRate = data.rpaExecutions.filter((r: any) => r.status === TaskStatus.COMPLETED).length / data.rpaExecutions.length;
      insights.push(`RPA automation success rate: ${Math.round(successRate * 100)}%`);
    }
    
    return insights;
  }

  private async generateRecommendations(options: OrchestrationOptions, context: EnhancedConversationContext): Promise<string[]> {
    const recommendations: string[] = [];
    
    recommendations.push('Consider enabling more specific intent training for better accuracy');
    recommendations.push('Regular RAG knowledge base updates improve response quality');
    
    if (context.vectorContext.vectors.length < 10) {
      recommendations.push('Expand knowledge base with more domain-specific information');
    }
    
    if (context.rpaSession.status === 'ready') {
      recommendations.push('Enable RPA automation for repetitive tasks to improve efficiency');
    }
    
    return recommendations;
  }

  private async processSTTInput(telephonySession: TelephonySession): Promise<string> {
    // In production, this would interface with the STT service
    // For now, return placeholder
    return 'Transcribed audio from telephony session';
  }

  private async broadcastOrchestrationComplete(sessionId: string, result: OrchestrationResult): Promise<void> {
    await this.sidePanelService.broadcastToSession(sessionId, 'orchestration_complete', {
      result,
      processingTime: result.processingTime,
      confidence: result.confidence,
      timestamp: new Date()
    });
  }

  private async broadcastError(sessionId: string, error: Error): Promise<void> {
    await this.sidePanelService.broadcastSystemAlert(sessionId, {
      type: 'error',
      title: 'Orchestration Error',
      message: error.message,
      details: { stack: error.stack },
      priority: TaskPriority.HIGH
    });
  }

  private getUserIdFromSession(sessionId: string): string {
    // In production, this would get from session store or JWT
    return `user_${sessionId}`;
  }

  private getCompanyIdFromSession(sessionId: string): string {
    // In production, this would get from session store or JWT
    return `company_${sessionId}`;
  }

  private initializeEventListeners(): void {
    // Listen to flow events
    this.flowEngine.on('flow:started', (data: any) => {
      this.logger.log(`[Enhanced Orchestrator] Flow started:`, data);
    });

    // Listen to RPA events
    this.rpaService.on('session:created', (data: any) => {
      this.logger.log(`[Enhanced Orchestrator] RPA session created:`, data);
    });

    // Listen to side panel events
    this.sidePanelService.on('client:connected', (data: any) => {
      this.logger.log(`[Enhanced Orchestrator] Side panel client connected:`, data);
    });
  }

  /**
   * 📊 Get orchestration statistics
   */
  getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    averageProcessingTime: number;
    successRate: number;
  } {
    const totalSessions = this.activeSessions.size;
    const sessions = Array.from(this.activeSessions.values());
    const averageProcessingTime = sessions.reduce((sum, session) => sum + session.performance.responseTime, 0) / totalSessions;
    const successRate = sessions.reduce((sum, session) => sum + session.performance.taskSuccessRate, 0) / totalSessions;
    
    return {
      totalSessions,
      activeSessions: sessions.filter(s => s.conversationState === 'active').length,
      averageProcessingTime,
      successRate
    };
  }

  /**
   * 🔄 Get session context
   */
  async getSessionContext(sessionId: string): Promise<EnhancedConversationContext | undefined> {
    return this.activeSessions.get(sessionId);
  }

  /**
   * 📋 Get all active sessions
   */
  getActiveSessions(): Map<string, EnhancedConversationContext> {
    return new Map(this.activeSessions);
  }
}