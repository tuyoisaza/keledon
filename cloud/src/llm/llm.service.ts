import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LLMRequest, LLMResponse, CommandDecision, UIStep } from './llm.types';
import { PrismaService } from '../prisma/prisma.service';
import { ManagedAiRuntime } from './managed-ai-runtime';
import { runtimeAiBudget } from './runtime-ai-budget';

type LLMProvider = 'anthropic' | 'google' | 'openai' | 'ollama' | 'none';

const CONFIGURED_PROVIDERS: LLMProvider[] = [
  'anthropic',
  'google',
  'openai',
  'ollama',
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function validateCommandDecision(value: unknown): CommandDecision | null {
  const input = asRecord(value);
  const types = ['say', 'ui_steps', 'mode', 'stop', 'ask'] as const;
  if (!types.some((type) => input.type === type)) return null;
  const type = input.type as CommandDecision['type'];
  const decision: CommandDecision = { type };
  if (input.text !== undefined) {
    if (typeof input.text !== 'string') return null;
    decision.text = input.text.slice(0, 4000);
  }
  if (type === 'say' || type === 'ask') {
    if (typeof input.text !== 'string') return null;
    decision.text = input.text.slice(0, 4000);
  }
  if (type === 'ui_steps') {
    if (!Array.isArray(input.steps) || input.steps.length > 100) return null;
    const allowedActions: UIStep['action'][] = [
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
    ];
    const steps = input.steps.map((value) => {
      const step = asRecord(value);
      if (
        typeof step.action !== 'string' ||
        !allowedActions.includes(step.action as UIStep['action'])
      )
        return null;
      const result: UIStep = { action: step.action as UIStep['action'] };
      for (const key of ['selector', 'value', 'url', 'description'] as const) {
        const item = step[key];
        if (item !== undefined) {
          if (typeof item !== 'string') return null;
          result[key] = item.slice(0, 2000);
        }
      }
      return result;
    });
    const validSteps = steps.filter((step): step is UIStep => step !== null);
    if (validSteps.length !== steps.length) return null;
    decision.steps = validSteps;
  }
  if (type === 'mode') {
    if (
      typeof input.mode !== 'string' ||
      !['normal', 'safe', 'silent'].includes(input.mode)
    )
      return null;
    decision.mode = input.mode as NonNullable<CommandDecision['mode']>;
  }
  if (input.reasoning !== undefined) {
    if (typeof input.reasoning !== 'string') return null;
    decision.reasoning = input.reasoning.slice(0, 1000);
  }
  if (input.confidence !== undefined) {
    if (
      typeof input.confidence !== 'number' ||
      !Number.isFinite(input.confidence) ||
      input.confidence < 0 ||
      input.confidence > 1
    )
      return null;
    decision.confidence = input.confidence;
  }
  return decision;
}

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private provider: LLMProvider;
  private model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly managedAi: ManagedAiRuntime,
  ) {}

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
      LLMProvider | undefined;
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
    const context = request?.context ?? [];
    if (
      !request ||
      typeof request.prompt !== 'string' ||
      request.prompt.length > 20000 ||
      !Array.isArray(context) ||
      context.length > 64 ||
      context.some((item) => typeof item !== 'string') ||
      context.reduce((total, item) => total + item.length, 0) > 20000
    )
      throw new Error('Invalid AI input size');

    const feature = request.feature || 'brain-chat';
    const actor = request.actorId || request.teamId || 'system';
    return runtimeAiBudget.run(
      actor,
      request.requestId ? `${feature}:${request.requestId}` : undefined,
      async () => {
        const managedInput = {
          context: JSON.stringify({
            userInput: request.prompt,
            untrustedContext: context,
          }),
        };
        const { definition } = await this.managedAi.prepare(
          feature,
          managedInput,
        );
        const startedAt = Date.now();
        const attempted: { provider?: string; requestedModel?: string } = {};
        let response: LLMResponse | undefined;
        let failure: string | undefined;
        let providerSucceeded = false;
        try {
          const systemPrompt = [
            definition.personalityPrompt,
            definition.executionPrompt,
            'Return ONLY JSON conforming exactly to this output schema:',
            JSON.stringify(definition.outputSchemaJson),
          ].join('\n\n');
          response = await this.generateUnchecked(
            {
              ...request,
              prompt: managedInput.context,
              context: [],
              maxTokens: Math.min(Math.max(request.maxTokens || 500, 1), 2000),
            },
            systemPrompt,
            attempted,
          );
          providerSucceeded = true;
          const output = this.managedAi.validateOutput(
            definition,
            JSON.parse(response.text),
          ) as Record<string, unknown>;
          if (feature === 'brain-chat') {
            if (typeof output.reply !== 'string')
              throw new Error('Managed reply contract mismatch');
            response.text = output.reply;
          } else {
            response.text = JSON.stringify(output);
          }
          return response;
        } catch {
          failure = 'AI_EXECUTION_OR_SCHEMA_FAILURE';
          throw new Error('Managed AI execution failed');
        } finally {
          if (attempted.provider) {
            runtimeAiBudget.recordMeteredOutcome({
              provider: attempted.provider,
              success: providerSucceeded,
              retryCount: 0,
              ...(providerSucceeded
                ? {}
                : { failureCode: 'AI_PROVIDER_CALL_FAILED' }),
              correlationId: request.correlationId,
            });
          }
          await this.managedAi.recordUsage({
            definition,
            feature,
            teamId: request.teamId,
            provider: response?.provider || attempted.provider || 'unknown',
            requestedModel:
              response?.requestedModel ||
              attempted.requestedModel ||
              request.model ||
              'unknown',
            responseModel: response?.responseModel,
            inputTokens: response?.usage?.promptTokens,
            outputTokens: response?.usage?.completionTokens,
            latencyMs: Date.now() - startedAt,
            errorCode: failure,
          });
        }
      },
    );
  }

  private async resolveTeamProvider(
    teamId: string,
  ): Promise<{ provider: LLMProvider; apiKey: string } | null> {
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
      if (
        !team ||
        !CONFIGURED_PROVIDERS.includes(team.llmProvider as LLMProvider)
      )
        return null;
      const provider = team.llmProvider as LLMProvider;
      const apiKey =
        provider === 'openai'
          ? team.openaiApiKey
          : provider === 'google'
            ? team.googleAiApiKey
            : provider === 'anthropic'
              ? team.anthropicApiKey
              : null;
      if (!apiKey && provider !== 'ollama') return null;
      return { provider, apiKey: apiKey || '' };
    } catch {
      return null;
    }
  }

  private async generateUnchecked(
    request: LLMRequest,
    systemPrompt: string,
    attempted: { provider?: string; requestedModel?: string },
  ): Promise<LLMResponse> {
    let provider = this.provider;
    let apiKey: string | undefined;
    let model = this.model;
    if (request.teamId) {
      const teamProvider = await this.resolveTeamProvider(request.teamId);
      if (!teamProvider)
        throw new Error('Configured team AI provider unavailable');
      provider = teamProvider.provider;
      apiKey = teamProvider.apiKey;
      model = this.resolveModel(provider);
    }
    if (provider === 'none')
      throw new Error('Configured AI provider unavailable');
    const providerRequest = { ...request, model: request.model || model };
    attempted.provider = provider;
    attempted.requestedModel = providerRequest.model;
    try {
      switch (provider) {
        case 'anthropic':
          return await this.generateWithAnthropic(
            providerRequest,
            systemPrompt,
            apiKey,
          );
        case 'google':
          return await this.generateWithGoogle(
            providerRequest,
            systemPrompt,
            apiKey,
          );
        case 'openai':
          return await this.generateWithOpenAI(
            providerRequest,
            systemPrompt,
            apiKey,
          );
        case 'ollama':
          return await this.generateWithOllama(providerRequest, systemPrompt);
      }
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'ai.call.failed',
          provider,
          teamId: request.teamId,
        }),
      );
      throw new Error('Configured AI provider request failed', {
        cause: error,
      });
    }
  }

  private async generateWithAnthropic(
    request: LLMRequest,
    systemPrompt: string,
    apiKey?: string,
  ): Promise<LLMResponse> {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      timeout: 30000,
      maxRetries: 0,
    });

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
      provider: 'anthropic',
      requestedModel: request.model,
      responseModel: response.model,
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
    const genAI = new GoogleGenerativeAI(
      apiKey || process.env.GOOGLE_AI_API_KEY,
    );
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
      provider: 'google',
      requestedModel: request.model,
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
      provider: 'openai',
      requestedModel: request.model,
      responseModel: response.model,
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

    const data: unknown = await res.json();
    const payload = asRecord(data);
    const promptTokens =
      typeof payload.prompt_eval_count === 'number' &&
      Number.isFinite(payload.prompt_eval_count)
        ? payload.prompt_eval_count
        : 0;
    const completionTokens =
      typeof payload.eval_count === 'number' &&
      Number.isFinite(payload.eval_count)
        ? payload.eval_count
        : 0;

    return {
      text: typeof payload.response === 'string' ? payload.response : '',
      provider: 'ollama',
      requestedModel: request.model,
      responseModel:
        typeof payload.model === 'string' ? payload.model : undefined,
      finishReason: payload.done === true ? 'stop' : 'length',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }

  async generateCommand(
    transcript: string,
    context: string[] = [],
    teamId?: string,
    actorId?: string,
  ): Promise<CommandDecision> {
    const response = await this.generate({
      prompt: transcript,
      context,
      teamId,
      actorId,
      feature: 'decision-engine',
      maxTokens: 1000,
    });
    const decision = validateCommandDecision(JSON.parse(response.text));
    if (!decision) throw new Error('Managed decision output is invalid');
    return decision;
  }

  isEnabled(): boolean {
    // Team-scoped provider credentials can enable this path without a global key.
    return true;
  }
}
