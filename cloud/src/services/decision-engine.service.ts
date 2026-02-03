import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { SessionService } from './session.service';
import { AgentGateway } from '../gateways/agent.gateway';
import { v4 as uuidv4 } from 'uuid';

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
  payload?: {
    reason?: string;
    graceful?: boolean;
  };
}

type BrainCommand = SayCommand | UIStepsCommand | ModeCommand | StopCommand;

// Event interfaces per canonical contract
interface TextInputEvent {
  event_id: string;
  session_id: string;
  timestamp: string;
  type: 'text_input';
  payload: {
    text: string;
    confidence: number;
    provider: string;
    metadata?: Record<string, any>;
  };
}

interface UIResultEvent {
  event_id: string;
  session_id: string;
  timestamp: string;
  type: 'ui_result';
  payload: {
    flow_id: string;
    step_id: string;
    status: 'success' | 'failure' | 'timeout';
    result?: any;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
    duration_ms?: number;
  };
}

interface SystemEvent {
  event_id: string;
  session_id: string;
  timestamp: string;
  type: 'system';
  payload: {
    event: 'call_started' | 'call_ended' | 'error' | 'connection_lost' | 'connection_restored';
    data?: any;
  };
}

type BrainEvent = TextInputEvent | UIResultEvent | SystemEvent;

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);

  constructor(
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => AgentGateway))
    private readonly agentGateway: AgentGateway,
  ) {
    this.logger.log('DecisionEngineService: Initialized');
  }

  /**
   * Process incoming brain event and generate appropriate command
   */
  async processEvent(event: BrainEvent): Promise<BrainCommand | null> {
    this.logger.log(`Processing event: ${event.type} for session: ${event.session_id}`);

    try {
      // Store event in database
      if (event.type !== 'system') {
        await this.sessionService.addEvent(event.session_id, {
          type: event.type,
          payload: event.payload,
          agent_id: (event as any).agent_id,
          timestamp: new Date(event.timestamp)
        });
      }

      // Generate command based on event type
      let command: BrainCommand | null = null;

      switch (event.type) {
        case 'text_input':
          command = await this.processTextInput(event as TextInputEvent);
          break;
        case 'ui_result':
          command = await this.processUIResult(event as UIResultEvent);
          break;
        case 'system':
          command = await this.processSystemEvent(event as SystemEvent);
          break;
        default:
          this.logger.warn(`Unknown event type: ${(event as any).type}`);
      }

      // Send command to agent if generated
      if (command) {
        await this.sendCommandToAgent(event.session_id, command);
      }

      return command;

    } catch (error) {
      this.logger.error(`Failed to process event: ${event.event_id}`, error);
      
      // Send error command to agent
      const errorCommand: ModeCommand = {
        command_id: uuidv4(),
        session_id: event.session_id,
        timestamp: new Date().toISOString(),
        type: 'mode',
        payload: {
          mode: 'safe',
          reason: `Error processing event: ${error.message}`
        }
      };

      await this.sendCommandToAgent(event.session_id, errorCommand);
      return null;
    }
  }

  /**
   * Process text input event and generate response
   */
  private async processTextInput(event: TextInputEvent): Promise<SayCommand | null> {
    this.logger.log(`Processing text input: "${event.payload.text}"`);

    // Simple text processing for V1
    // In production, this would use AI/LLM to understand intent
    const responseText = this.generateTextResponse(event.payload.text);

    const command: SayCommand = {
      command_id: uuidv4(),
      session_id: event.session_id,
      timestamp: new Date().toISOString(),
      type: 'say',
      payload: {
        text: responseText,
        interruptible: true,
        provider: 'local', // Use local TTS for now
        metadata: {
          original_text: event.payload.text,
          confidence: event.payload.confidence,
          response_type: 'text_reply'
        }
      }
    };

    return command;
  }

  /**
   * Process UI result event and determine next steps
   */
  private async processUIResult(event: UIResultEvent): Promise<UIStepsCommand | SayCommand | null> {
    this.logger.log(`Processing UI result: ${event.payload.status} for step: ${event.payload.step_id}`);

    // For now, acknowledge the result
    // In production, this would continue the flow or handle errors
    if (event.payload.status === 'success') {
      const command: SayCommand = {
        command_id: uuidv4(),
        session_id: event.session_id,
        timestamp: new Date().toISOString(),
        type: 'say',
        payload: {
          text: `Step "${event.payload.step_id}" completed successfully`,
          interruptible: true,
          metadata: {
            result_type: 'step_acknowledgment',
            step_id: event.payload.step_id,
            flow_id: event.payload.flow_id
          }
        }
      };

      return command;
    } else if (event.payload.status === 'failure') {
      const command: SayCommand = {
        command_id: uuidv4(),
        session_id: event.session_id,
        timestamp: new Date().toISOString(),
        type: 'say',
        payload: {
          text: `Step "${event.payload.step_id}" failed: ${event.payload.error?.message || 'Unknown error'}`,
          interruptible: true,
          metadata: {
            result_type: 'step_error',
            step_id: event.payload.step_id,
            flow_id: event.payload.flow_id,
            error: event.payload.error
          }
        }
      };

      return command;
    }

    return null;
  }

  /**
   * Process system event
   */
  private async processSystemEvent(event: SystemEvent): Promise<ModeCommand | null> {
    this.logger.log(`Processing system event: ${event.payload.event}`);

    switch (event.payload.event) {
      case 'call_started':
        // Acknowledge call start
        const startCommand: ModeCommand = {
          command_id: uuidv4(),
          session_id: event.session_id,
          timestamp: new Date().toISOString(),
          type: 'mode',
          payload: {
            mode: 'normal',
            reason: 'Call started'
          }
        };
        return startCommand;

      case 'call_ended':
        // Switch to safe mode on call end
        const endCommand: ModeCommand = {
          command_id: uuidv4(),
          session_id: event.session_id,
          timestamp: new Date().toISOString(),
          type: 'mode',
          payload: {
            mode: 'safe',
            reason: 'Call ended'
          }
        };
        return endCommand;

      case 'error':
        // Switch to safe mode on errors
        const errorCommand: ModeCommand = {
          command_id: uuidv4(),
          session_id: event.session_id,
          timestamp: new Date().toISOString(),
          type: 'mode',
          payload: {
            mode: 'safe',
            reason: `System error: ${event.payload.data?.message || 'Unknown error'}`
          }
        };
        return errorCommand;

      default:
        return null;
    }
  }

  /**
   * Generate simple text response (placeholder for AI/LLM)
   */
  private generateTextResponse(inputText: string): string {
    const text = inputText.toLowerCase().trim();
    
    // Simple keyword-based responses for V1
    if (text.includes('hello') || text.includes('hi')) {
      return 'Hello! How can I help you today?';
    } else if (text.includes('help')) {
      return 'I can help you with web automation tasks. What would you like me to do?';
    } else if (text.includes('thank')) {
      return "You're welcome!";
    } else if (text.includes('bye') || text.includes('goodbye')) {
      return 'Goodbye! Have a great day!';
    } else if (text.includes('what can you do')) {
      return 'I can help you automate tasks on web pages, fill forms, click buttons, and navigate websites.';
    } else if (text.includes('stop') || text.includes('cancel')) {
      return 'I will stop what I\'m doing.';
    } else {
      // Default response
      return `I heard you say: "${inputText}". What would you like me to do with that?`;
    }
  }

  /**
   * Send command to agent via WebSocket
   */
  private async sendCommandToAgent(sessionId: string, command: BrainCommand): Promise<void> {
    try {
      // Get agent ID from session
      const session = await this.sessionService.findById(sessionId);
      const agentId = session.agent_id;

      if (!agentId) {
        this.logger.warn(`No agent ID found for session: ${sessionId}`);
        return;
      }

      // Send command through agent gateway
      this.agentGateway.sendCommand(agentId, {
        command_id: command.command_id,
        session_id: command.session_id,
        timestamp: command.timestamp,
        type: command.type,
        payload: command.payload
      });

      this.logger.log(`Sent ${command.type} command to agent ${agentId}`);

    } catch (error) {
      this.logger.error(`Failed to send command to agent: ${sessionId}`, error);
      throw error;
    }
  }

  /**
   * Get decision engine statistics
   */
  async getStatistics(): Promise<any> {
    return {
      service: 'DecisionEngineService',
      timestamp: new Date().toISOString(),
      capabilities: [
        'text_input_processing',
        'ui_result_processing', 
        'system_event_processing',
        'command_generation',
        'agent_communication'
      ],
      supported_commands: ['say', 'ui_steps', 'mode', 'stop'],
      supported_events: ['text_input', 'ui_result', 'system']
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const stats = await this.getStatistics();
      
      return {
        healthy: true,
        details: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}