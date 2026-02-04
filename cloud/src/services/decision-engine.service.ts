import { Injectable } from '@nestjs/common';
import { SessionService } from './session.service';
import { AgentEvent, CloudCommand } from '../contracts/events';

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
}

@Injectable()
export class DecisionEngineService {
  constructor(private sessionService: SessionService) {}

  /**
   * Process text_input event and generate canonical brain command
   * This is the core "Cloud decides" functionality per canonical specs
   */
  async processTextInput(sessionId: string, text: string, confidence: number, provider: string, metadata: Record<string, any> = {}): Promise<DecisionResult> {
    const startTime = Date.now();
    
    try {
      // Validate session exists (canonical rule: if no session_id, it does not exist)
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} does not exist - cannot process text input`);
      }

      // Get session context for decision making
      const sessionEvents = await this.sessionService.getSessionEvents(sessionId);
      const context = await this.buildDecisionContext(sessionId, text, sessionEvents, metadata);

      // Core decision logic (Cloud decides)
      const decision = await this.makeDecision(context);
      
      // Generate canonical brain command
      const command = await this.generateCommand(decision, sessionId);
      
      // Persist the decision
      await this.persistDecision(sessionId, text, command, decision);

      const processingTime = Date.now() - startTime;
      
      console.log(`[DecisionEngine] Processed text_input: "${text}" -> command: ${command.type} (confidence: ${command.confidence})`);
      
      return {
        command,
        confidence: command.confidence,
        reasoning: decision.reasoning,
        context: decision.context,
        processingTime
      };

    } catch (error) {
      console.error('[DecisionEngine] Error processing text input:', error);
      
      // Return error command (anti-demo rule: show failure)
      const errorCommand: CloudCommand = {
        command_id: crypto.randomUUID(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        type: 'error',
        payload: {
          type: 'mode',
          payload: {
            mode: 'error',
            confidence: 0,
            reason: `Decision processing failed: ${error.message}`
          }
        }
      };

      return {
        command: errorCommand,
        confidence: 0,
        reasoning: `Error: ${error.message}`,
        context: { error: error.message },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Build decision context from session history and current input
   */
  private async buildDecisionContext(sessionId: string, currentText: string, sessionEvents: AgentEvent[], metadata: Record<string, any>): Promise<DecisionContext> {
    const previousTextInputs = sessionEvents
      .filter(event => event.event_type === 'text_input')
      .slice(-5); // Last 5 text inputs for context

    return {
      sessionId,
      agentId: metadata.agent_id || 'unknown',
      previousEvents: previousTextInputs,
      currentTranscript: currentText,
      confidence: metadata.confidence || 0.8,
      metadata
    };
  }

  /**
   * Core decision making logic
   * This implements "Cloud decides" principle with real reasoning
   */
  private async makeDecision(context: DecisionContext): Promise<any> {
    const text = context.currentTranscript.toLowerCase().trim();
    
    // Intent recognition with confidence scoring
    const intentAnalysis = this.analyzeIntent(text);
    
    // Context-aware decision making
    const contextAnalysis = this.analyzeContext(context);
    
    // Generate decision with reasoning
    const decision = {
      intent: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
      reasoning: this.generateReasoning(text, intentAnalysis, contextAnalysis),
      context: {
        ...contextAnalysis,
        userIntent: intentAnalysis.intent,
        keywords: intentAnalysis.keywords
      },
      actions: this.determineActions(intentAnalysis.intent, context)
    };

    console.log(`[DecisionEngine] Decision: ${decision.intent} (confidence: ${decision.confidence})`);
    return decision;
  }

  /**
   * Analyze user intent from text input
   */
  private analyzeIntent(text: string): { intent: string; confidence: number; keywords: string[] } {
    const normalizedText = text.toLowerCase();
    
    // Define intent patterns with confidence scoring
    const intentPatterns = [
      {
        intent: 'greeting',
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        patterns: [/^(hello|hi|hey)/i, /^(good\s+(morning|afternoon))/i],
        confidence: 0.9
      },
      {
        intent: 'help_request',
        keywords: ['help', 'what can you do', 'assist', 'support'],
        patterns: [/(help|what\s+can\s+you\s+do|assist|support)/i],
        confidence: 0.8
      },
      {
        intent: 'task_execution',
        keywords: ['create', 'make', 'do', 'execute', 'start', 'open', 'close', 'search'],
        patterns: [/(create|make|do|execute|start|open|close|search)/i],
        confidence: 0.7
      },
      {
        intent: 'information_query',
        keywords: ['what', 'where', 'when', 'how', 'who', 'why'],
        patterns: [/(what|where|when|how|who|why)/i],
        confidence: 0.6
      },
      {
        intent: 'conversation',
        keywords: ['thanks', 'ok', 'sure', 'yes', 'no', 'maybe'],
        patterns: [/(thanks|ok|sure|yes|no|maybe)/i],
        confidence: 0.5
      }
    ];

    // Match patterns and calculate confidence
    let bestMatch = { intent: 'conversation', confidence: 0.3, keywords: [] };
    
    for (const pattern of intentPatterns) {
      for (const patternRegex of pattern.patterns) {
        if (patternRegex.test(normalizedText)) {
          if (pattern.confidence > bestMatch.confidence) {
            bestMatch = {
              intent: pattern.intent,
              confidence: pattern.confidence,
              keywords: pattern.keywords.filter(keyword => normalizedText.includes(keyword))
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Analyze session context for decision making
   */
  private analyzeContext(context: DecisionContext): any {
    // Analyze previous events for patterns
    const recentIntents = context.previousEvents
      .filter(event => event.event_type === 'text_input')
      .slice(-3)
      .map(event => event.payload.intent || 'unknown');

    // Time-based context analysis
    const currentTime = new Date();
    const hourOfDay = currentTime.getHours();
    const isBusinessHours = hourOfDay >= 9 && hourOfDay <= 17;
    
    return {
      recentIntents,
      hourOfDay,
      isBusinessHours,
      sessionDuration: context.previousEvents.length > 0 ? 
        Date.now() - new Date(context.previousEvents[0].ts).getTime() : 0
    };
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(text: string, intentAnalysis: any, contextAnalysis: any): string {
    return `Intent detected: "${intentAnalysis.intent}" (confidence: ${(intentAnalysis.confidence * 100).toFixed(1)}%). ` +
           `Context: ${contextAnalysis.recentIntents.length > 0 ? 'Previous intents: ' + contextAnalysis.recentIntents.join(', ') : 'No previous context'}. ` +
           `Actions determined: ${contextAnalysis.actions ? contextAnalysis.actions.join(', ') : 'Wait for input'}.`;
  }

  /**
   * Determine appropriate actions based on intent
   */
  private determineActions(intent: string, context: any): string[] {
    const actions = [];

    switch (intent) {
      case 'greeting':
        actions.push('respond_greeting');
        break;
      case 'help_request':
        actions.push('provide_assistance');
        break;
      case 'task_execution':
        actions.push('execute_task');
        break;
      case 'information_query':
        actions.push('provide_information');
        break;
      case 'conversation':
        actions.push('acknowledge');
        break;
      default:
        actions.push('clarify_request');
        break;
    }

    return actions;
  }

  /**
   * Generate canonical brain command from decision
   */
  private async generateCommand(decision: any, sessionId: string): Promise<CloudCommand> {
    const commandId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    let payload: any;
    let confidence = decision.confidence || 0.5;

    // Generate command payload based on intent
    switch (decision.intent) {
      case 'greeting':
        payload = {
          type: 'say',
          payload: {
            text: 'Hello! I\'m here to help you.',
            interruptible: true
          }
        };
        confidence = 0.95;
        break;

      case 'help_request':
        payload = {
          type: 'say',
          payload: {
            text: 'I can help you with various tasks. What do you need assistance with?',
            interruptible: true
          }
        };
        confidence = 0.9;
        break;

      case 'task_execution':
        payload = {
          type: 'ui_steps',
          payload: {
            flow_id: 'user_task_flow',
            steps: ['execute_user_request']
          }
        };
        confidence = 0.8;
        break;

      case 'information_query':
        payload = {
          type: 'say',
          payload: {
            text: 'I understand you\'re looking for information. Let me help you with that.',
            interruptible: true
          }
        };
        confidence = 0.75;
        break;

      case 'conversation':
        payload = {
          type: 'say',
          payload: {
            text: 'I understand. How can I assist you further?',
            interruptible: true
          }
        };
        confidence = 0.85;
        break;

      default:
        payload = {
          type: 'say',
          payload: {
            text: 'I\'m not sure how to help with that. Could you please clarify?',
            interruptible: true
          }
        };
        confidence = 0.4;
        break;
    }

    const command: CloudCommand = {
      command_id: commandId,
      session_id: sessionId,
      timestamp,
      type: payload.type,
      confidence,
      mode: 'normal',
      flow_id: payload.flow_id || null,
      flow_run_id: payload.flow_run_id || null,
      say: payload.say || null,
      ui_steps: payload.ui_steps || null
    };

    return command;
  }

  /**
   * Persist decision for traceability
   */
  private async persistDecision(sessionId: string, text: string, command: CloudCommand, decision: any): Promise<void> {
    try {
      // Store the original text_input event
      await this.sessionService.persistEvent(sessionId, {
        event_type: 'text_input',
        payload: {
          text,
          confidence: decision.confidence,
          provider: 'deepgram',
          metadata: decision.context.metadata || {}
        },
        ts: new Date().toISOString(),
        agent_id: decision.context.agentId
      });

      console.log(`[DecisionEngine] Decision persisted for session ${sessionId}`);
    } catch (error) {
      console.error('[DecisionEngine] Failed to persist decision:', error);
    }
  }
}