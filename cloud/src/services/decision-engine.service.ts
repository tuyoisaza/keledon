import { Injectable, Logger } from '@nestjs/common';
import { SessionService } from './session.service';
import { AgentEvent, CloudCommand } from '../contracts/events';
import { v4 as uuidv4 } from 'uuid';

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
  private readonly logger = new Logger(DecisionEngineService.name);

  constructor(
    private sessionService: SessionService
  ) {}

  /**
   * Process text_input event and generate canonical brain command
   * This is core "Cloud decides" functionality per canonical specs
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
        command_id: uuidv4(),
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        type: 'say',
        confidence: 0,
        mode: 'normal',
        flow_id: null,
        flow_run_id: null,
        say: {
          text: `Decision processing failed: ${error.message}`,
          interruptible: true
        },
        ui_steps: []
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
   * Generate canonical brain command from decision
   */
  async generateCommand(decision: any, sessionId: string): Promise<CloudCommand> {
    const commandId = uuidv4();
    const timestamp = new Date().toISOString();

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
          say: {
            text: decision.text,
            interruptible: decision.interruptible || true
          },
          ui_steps: []
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
          say: {
            text: '',
            interruptible: true
          },
          ui_steps: decision.steps || []
        };

      case 'mode':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'say', // Convert mode to say for now
          confidence: decision.confidence || 0.8,
          mode: decision.mode || 'normal',
          flow_id: null,
          flow_run_id: null,
          say: {
            text: `Mode changed to: ${decision.mode}`,
            interruptible: true
          },
          ui_steps: []
        };

      case 'stop':
        return {
          command_id: commandId,
          session_id: sessionId,
          timestamp,
          type: 'say', // Convert stop to say for now
          confidence: decision.confidence || 1.0,
          mode: decision.mode || 'normal',
          flow_id: null,
          flow_run_id: null,
          say: {
            text: 'Stopping.',
            interruptible: true
          },
          ui_steps: []
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
          say: {
            text: `I understand you said: ${decision.text || 'something'}`,
            interruptible: true
          },
          ui_steps: []
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
    const { currentTranscript, confidence } = context;

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
   * Persist decision for audit trail
   */
  private async persistDecision(sessionId: string, text: string, command: CloudCommand, decision: any): Promise<void> {
    // Create a synthetic event to persist the decision
    const decisionEvent: AgentEvent = {
      event_id: uuidv4(),
      session_id: sessionId,
      event_type: 'system', // Use 'system' instead of 'decision'
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
}