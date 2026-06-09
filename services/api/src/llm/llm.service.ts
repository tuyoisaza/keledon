import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LLMRequest, LLMResponse, CommandDecision } from './llm.types';
import { PrismaService } from '../prisma/prisma.service';

type LLMProvider = 'anthropic' | 'google' | 'openai' | 'ollama' | 'none';

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
        },
        text: {
          type: 'string',
          description:
            'Text to speak aloud (required for "say" and "ask" types)',
        },
        steps: {
          type: 'array',
          description:
            'Browser automation steps (required for "ui_steps" type)',
          items: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: [
                  'navigate',
                  'click',
                  'type',
                  'fill',
                  'wait',
                  'extract',
                  'select',
                  'hover',
                  'scroll',
                  'screenshot',
                ],
              },
              selector: { type: 'string' },
              value: { type: 'string' },
              url: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['action'],
          },
        },
        mode: { type: 'string', enum: ['normal', 'safe', 'silent'] },
        reasoning: { type: 'string' },
      },
      required: ['type'],
    },
  },
};

const CONFIGURED_PROVIDERS: LLMProvider[] = [
  'anthropic',
  'google',
  'openai',
  'ollama',
];

function isOpenAIFunctionToolCall(toolCall: unknown): toolCall is {
  type: 'function';
  function: { name: string; arguments: string };
} {
  return (
    typeof toolCall === 'object' &&
    toolCall !== null &&
    'type' in toolCall &&
    (toolCall as { type?: unknown }).type === 'function' &&
    'function' in toolCall &&
    typeof (toolCall as { function?: unknown }).function === 'object' &&
    (toolCall as { function?: { name?: unknown; arguments?: unknown } })
      .function !== null &&
    typeof (toolCall as { function?: { name?: unknown; arguments?: unknown } })
      .function?.name === 'string' &&
    typeof (toolCall as { function?: { name?: unknown; arguments?: unknown } })
      .function?.arguments === 'string'
  );
}

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private provider: LLMProvider;
  private model: string;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.provider = this.resolveProvider();
    if (this.provider === 'none') {
      this.logger.warn(
        '[LLM] WARNING: No LLM provider configured. Set ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, OPENAI_API_KEY, or OLLAMA_URL to enable AI responses. Running in degraded mode.',
      );
      return;
    }
    this.model = this.resolveModel(this.provider);
    this.logger.log(`LLM provider: ${this.provider}, model: ${this.model}`);
  }

  private resolveProvider(): LLMProvider {
    const forced = process.env.LLM_PROVIDER?.toLowerCase() as
      | LLMProvider
      | undefined;
    if (forced && forced !== 'none') {
      if (!CONFIGURED_PROVIDERS.includes(forced)) {
        this.logger.warn(
          `Unknown LLM_PROVIDER: "${forced}". Valid values: ${CONFIGURED_PROVIDERS.join(', ')}. Running in degraded mode.`,
        );
        return 'none';
      }
      return forced;
    }

    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.GOOGLE_AI_API_KEY) return 'google';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.OLLAMA_URL) return 'ollama';

    return 'none';
  }

  private async resolveTeamProvider(teamId: string): Promise<{ provider: LLMProvider; apiKey: string } | null> {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        select: {
          llmProvider: true,
          openaiApiKey: true,
          googleAiApiKey: true,
          anthropicApiKey: true,
        },
      });
      if (!team || !team.llmProvider) return null;
      
      const provider = team.llmProvider as LLMProvider;
      if (!CONFIGURED_PROVIDERS.includes(provider)) return null;
      
      // Check if the selected provider has a key configured (either in DB or env)
      const dbApiKey = provider === 'openai' ? team.openaiApiKey
        : provider === 'google' ? team.googleAiApiKey
        : provider === 'anthropic' ? team.anthropicApiKey
        : null;
      
      const effectiveKey = dbApiKey || 
        (provider === 'openai' ? process.env.OPENAI_API_KEY
          : provider === 'google' ? process.env.GOOGLE_AI_API_KEY
          : provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY
          : null);
      
      if (!effectiveKey && provider !== 'ollama') return null;
      
      return { provider, apiKey: effectiveKey || '' };
    } catch (error) {
      this.logger.warn(`Failed to resolve team provider for ${teamId}:`, error);
      return null;
    }
  }

  private resolveModel(provider: LLMProvider): string {
    switch (provider) {
      case 'anthropic':
        return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
      case 'google':
        return process.env.GOOGLE_AI_MODEL || 'gemini-1.5-pro';
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4o';
      case 'ollama':
        return process.env.OLLAMA_MODEL || 'llama3';
      default:
        return '';
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    // If teamId is provided, try to use the team's configured LLM provider
    let activeProvider = this.provider;
    let activeApiKey: string | undefined;
    let activeModel = this.model;

    if (request.teamId) {
      const teamConfig = await this.resolveTeamProvider(request.teamId);
      if (teamConfig) {
        activeProvider = teamConfig.provider;
        activeApiKey = teamConfig.apiKey;
        activeModel = this.resolveModel(teamConfig.provider);
        this.logger.log(`[LLM] Using team provider: ${activeProvider} for team ${request.teamId}`);
      }
    }

    if (activeProvider === 'none') {
      return {
        text: this.generateFallback(request.prompt),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    const systemPrompt = this.buildSystemPrompt(request.context || []);
    try {
      switch (activeProvider) {
        case 'anthropic':
          return await this.generateWithAnthropic(request, systemPrompt, activeApiKey);
        case 'google':
          return await this.generateWithGoogle(request, systemPrompt, activeApiKey);
        case 'openai':
          return await this.generateWithOpenAI(request, systemPrompt, activeApiKey);
        case 'ollama':
          return await this.generateWithOllama(request, systemPrompt);
      }
    } catch (error) {
      this.logger.error(`LLM [${activeProvider}] error:`, error);
      return {
        text: this.generateFallback(request.prompt),
        finishReason: 'content_filter',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  private async generateWithAnthropic(
    request: LLMRequest,
    systemPrompt: string,
    apiKey?: string,
  ): Promise<LLMResponse> {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: request.model || this.model,
      max_tokens: request.maxTokens || 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: request.prompt }],
    });

    const block = response.content[0];
    const text = block.type === 'text' ? block.text : '';

    return {
      text,
      finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  private async generateWithGoogle(
    request: LLMRequest,
    systemPrompt: string,
    apiKey?: string,
  ): Promise<LLMResponse> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_AI_API_KEY);
    const genModel = genAI.getGenerativeModel({
      model: request.model || this.model,
    });

    const result = await genModel.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        maxOutputTokens: request.maxTokens || 500,
        temperature: request.temperature || 0.7,
      },
    });

    const resp = result.response;
    return {
      text: resp.text(),
      finishReason: 'stop',
      usage: {
        promptTokens: resp.usageMetadata?.promptTokenCount || 0,
        completionTokens: resp.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: resp.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  private async generateWithOpenAI(
    request: LLMRequest,
    systemPrompt: string,
    apiKey?: string,
  ): Promise<LLMResponse> {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: request.model || this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.prompt },
      ],
      max_tokens: request.maxTokens || 500,
      temperature: request.temperature || 0.7,
    });

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      text: choice.message.content || '',
      finishReason: choice.finish_reason === 'stop' ? 'stop' : 'length',
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      },
    };
  }

  private async generateWithOllama(
    request: LLMRequest,
    systemPrompt: string,
  ): Promise<LLMResponse> {
    const ollamaUrl = process.env.OLLAMA_URL;

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || this.model,
        prompt: `${systemPrompt}\n\n${request.prompt}`,
        stream: false,
        options: {
          num_predict: request.maxTokens || 500,
          temperature: request.temperature || 0.7,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();

    return {
      text: data.response || '',
      finishReason: data.done ? 'stop' : 'length',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
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
    const truncated =
      prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
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

Always prefer "ui_steps" over "say" when the user is asking you to DO something in the browser.
Always prefer "say" for questions, confirmations, and conversational responses.`;
  }

  async generateCommand(
    transcript: string,
    context: string[] = [],
    teamId?: string,
  ): Promise<CommandDecision> {
    // Resolve team provider if available
    let activeProvider = this.provider;
    let activeApiKey: string | undefined;

    if (teamId) {
      const teamConfig = await this.resolveTeamProvider(teamId);
      if (teamConfig) {
        activeProvider = teamConfig.provider;
        activeApiKey = teamConfig.apiKey;
      }
    }

    if (activeProvider === 'none') {
      return this.fallbackCommand(transcript);
    }

    // Structured tool_calls only supported for OpenAI; other providers fall back to generate()
    if (activeProvider === 'openai') {
      try {
        const { OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: activeApiKey || process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
          model: this.model || 'gpt-4o',
          messages: [
            { role: 'system', content: this.buildCommandSystemPrompt(context) },
            { role: 'user', content: transcript },
          ],
          tools: [DECIDE_ACTION_TOOL],
          tool_choice: {
            type: 'function',
            function: { name: 'decide_action' },
          },
          max_tokens: 500,
          temperature: 0.7,
        });

        const toolCall = response.choices[0]?.message?.tool_calls?.[0];
        if (
          !isOpenAIFunctionToolCall(toolCall) ||
          toolCall.function.name !== 'decide_action'
        ) {
          this.logger.warn('LLM did not return a tool call, using fallback');
          return this.fallbackCommand(transcript);
        }

        const decision: CommandDecision = JSON.parse(
          toolCall.function.arguments,
        );
        this.logger.log(
          `[LLM] Decision: ${decision.type}${decision.reasoning ? ' — ' + decision.reasoning : ''}`,
        );
        return decision;
      } catch (error) {
        this.logger.error('OpenAI function calling error:', error);
        return this.fallbackCommand(transcript);
      }
    }

    // Non-OpenAI: generate a text response and wrap as a say command
    try {
      const response = await this.generate({
        prompt: transcript,
        context,
        maxTokens: 300,
        temperature: 0.7,
        teamId, // Pass teamId for team provider resolution
      });
      return {
        type: 'say',
        text: response.text,
        reasoning: `${activeProvider} text response`,
      };
    } catch (error) {
      this.logger.error('generateCommand fallback error:', error);
      return this.fallbackCommand(transcript);
    }
  }

  isEnabled(): boolean {
    return this.provider !== 'none' && !!this.provider;
  }
}
