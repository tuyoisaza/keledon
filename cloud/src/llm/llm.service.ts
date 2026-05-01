import { Injectable, Logger } from '@nestjs/common';
import { LLMRequest, LLMResponse, CommandDecision } from './llm.types';

const DECIDE_ACTION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'decide_action',
    description:
      'Decide what KELEDON should do in response to the user voice command. ' +
      'Use "say" for conversational responses. Use "ui_steps" for browser automation. ' +
      'Use "mode" to change operating mode. Use "stop" to halt. Use "ask" to request clarification.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['say', 'ui_steps', 'mode', 'stop', 'ask'],
          description: 'Command type',
        },
        text: {
          type: 'string',
          description: 'Text to speak aloud (required for "say" and "ask" types)',
        },
        steps: {
          type: 'array',
          description: 'Browser automation steps (required for "ui_steps" type)',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['navigate', 'click', 'type', 'fill', 'wait', 'extract', 'select', 'hover', 'scroll', 'screenshot'],
              },
              selector: {
                type: 'string',
                description: 'CSS selector or descriptive text for the target element',
              },
              value: {
                type: 'string',
                description: 'Value to type or fill into a field',
              },
              url: {
                type: 'string',
                description: 'Full URL for navigate action',
              },
              description: {
                type: 'string',
                description: 'Human-readable description of this step',
              },
            },
            required: ['action'],
          },
        },
        mode: {
          type: 'string',
          enum: ['normal', 'safe', 'silent'],
          description: 'Operating mode (required for "mode" type)',
        },
        reasoning: {
          type: 'string',
          description: 'Brief internal reasoning (not spoken aloud)',
        },
      },
      required: ['type'],
    },
  },
};

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private openai: any;
  private config: { apiKey: string; model: string; maxTokens: number; temperature: number };
  private isInitialized = false;

  constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    };

    if (this.config.apiKey) {
      this.initialize();
    } else {
      this.logger.warn('OpenAI API key not configured, LLM will be disabled');
    }
  }

  private initialize() {
    try {
      const { OpenAI } = require('openai');
      this.openai = new OpenAI({ apiKey: this.config.apiKey });
      this.isInitialized = true;
      this.logger.log('LLM Service initialized with model: ' + this.config.model);
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Generate a structured command decision using OpenAI function calling.
   * Returns a CommandDecision with type + payload, never free-form text that needs re-parsing.
   */
  async generateCommand(transcript: string, context: string[] = []): Promise<CommandDecision> {
    if (!this.isInitialized || !this.openai) {
      this.logger.warn('LLM not initialized, returning fallback command');
      return this.fallbackCommand(transcript);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.buildCommandSystemPrompt(context) },
          { role: 'user', content: transcript },
        ],
        tools: [DECIDE_ACTION_TOOL],
        tool_choice: { type: 'function', function: { name: 'decide_action' } },
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== 'decide_action') {
        this.logger.warn('LLM did not return a tool call, using fallback');
        return this.fallbackCommand(transcript);
      }

      const decision: CommandDecision = JSON.parse(toolCall.function.arguments);
      this.logger.log(`[LLM] Decision: ${decision.type}${decision.reasoning ? ' — ' + decision.reasoning : ''}`);
      return decision;
    } catch (error) {
      this.logger.error('OpenAI function calling error:', error);
      return this.fallbackCommand(transcript);
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isInitialized || !this.openai) {
      this.logger.warn('LLM not initialized, returning fallback');
      return {
        text: this.generateFallback(request.prompt),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.context || []);

      const response = await this.openai.chat.completions.create({
        model: request.model || this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature,
      });

      const choice = response.choices[0];
      const usage = response.usage;

      return {
        text: choice.message.content,
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: usage ? usage.prompt_tokens : 0,
          completionTokens: usage ? usage.completion_tokens : 0,
          totalTokens: usage ? usage.total_tokens : 0,
        },
      };
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      return {
        text: this.generateFallback(request.prompt),
        finishReason: 'content_filter',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  private buildCommandSystemPrompt(context: string[]): string {
    const contextSection =
      context.length > 0
        ? `\nRelevant knowledge:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`
        : '';

    return `You are KELEDON, an AI agent controlling a Windows desktop browser (Electron-based Chrome).
You receive voice commands and decide what action to take.
${contextSection}
Command types:
- "say": Speak a response to the user. Keep it concise (1-2 sentences), spoken-word friendly.
- "ui_steps": Automate the browser. Use when the user asks you to navigate, click, fill forms, or interact with web pages.
- "mode": Change operating mode (normal/safe/silent).
- "stop": Stop current operation.
- "ask": Ask the user a clarifying question when the intent is ambiguous.

For "ui_steps", generate precise steps:
- navigate: { action: "navigate", url: "https://..." }
- click: { action: "click", selector: "CSS selector or button text", description: "..." }
- type: { action: "type", selector: "input selector", value: "text to type" }
- fill: { action: "fill", selector: "form field selector", value: "value" }
- wait: { action: "wait", description: "what to wait for" }
- extract: { action: "extract", selector: "element to read", description: "what to extract" }

Always prefer "ui_steps" over "say" when the user is asking you to DO something in the browser.
Always prefer "say" for questions, confirmations, and conversational responses.`;
  }

  private buildSystemPrompt(context: string[]): string {
    const contextSection =
      context.length > 0
        ? `Context from knowledge base:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n`
        : '';

    return `You are KELEDON, an AI voice agent for customer service.

${contextSection}Your role:
- Listen to customer inquiries
- Provide helpful, accurate responses
- Escalate to human when necessary
- Execute UI automation when requested

Guidelines:
- Be conversational and friendly
- Keep responses concise (2-3 sentences max)
- If you don't know something, say so
- Don't make up information

Always respond in a way that can be spoken aloud.`;
  }

  private generateFallback(prompt: string): string {
    const truncated = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
    return `I understand you're asking about "${truncated}". Let me help you with that. Could you provide more details?`;
  }

  private fallbackCommand(transcript: string): CommandDecision {
    const lower = transcript.toLowerCase();
    if (lower.includes('stop') || lower.includes('cancel')) {
      return { type: 'stop', reasoning: 'keyword fallback' };
    }
    return {
      type: 'say',
      text: `I heard: "${transcript}". I'm having trouble connecting to my decision engine right now.`,
      reasoning: 'LLM unavailable fallback',
    };
  }

  isEnabled(): boolean {
    return this.isInitialized && !!this.config.apiKey;
  }
}
