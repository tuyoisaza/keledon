import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { SessionService } from './session.service';
import { AgentGateway } from '../gateways/agent.gateway';
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

  constructor(
    @Inject(forwardRef(() => SessionService))
    private sessionService: SessionService,
    @Inject(forwardRef(() => AgentGateway))
    private agentGateway: AgentGateway
  ) {}

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
            interruptible: decision.interruptible || true,
            voice: decision.voice,
            language: decision.language,
            speed: decision.speed,
            pitch: decision.pitch,
            volume: decision.volume
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
          flow_run_id: null
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
          flow_run_id: null
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
      event_type: 'decision',
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