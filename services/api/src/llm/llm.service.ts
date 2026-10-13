import { AiAdminService } from '../ai-admin/ai-admin.service';
import { runtimeAiBudget } from './runtime-ai-budget';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LLMRequest, LLMResponse, CommandDecision } from './llm.types';
import { PrismaService } from '../prisma/prisma.service';

type LLMProvider = 'anthropic' | 'google' | 'openai' | 'ollama' | 'none';

const CONFIGURED_PROVIDERS: LLMProvider[] = [
  'anthropic',
  'google',
  'openai',
  'ollama',
];

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private provider: LLMProvider;
  private model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAdmin: AiAdminService,
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
      if (!team) {
        this.logger.warn(
          `[LLM] resolveTeamProvider(${teamId}): team not found`,
        );
        return null;
      }
      if (!team.llmProvider) {
        this.logger.warn(
          `[LLM] resolveTeamProvider(${teamId}): llmProvider is ${team.llmProvider}`,
        );
        return null;
      }

      const provider = team.llmProvider as LLMProvider;
      if (!CONFIGURED_PROVIDERS.includes(provider)) {
        this.logger.warn(
          `[LLM] resolveTeamProvider(${teamId}): provider ${provider} not in configured list`,
        );
        return null;
      }

      const dbApiKey =
        provider === 'openai'
          ? team.openaiApiKey
          : provider === 'google'
            ? team.googleAiApiKey
            : provider === 'anthropic'
              ? team.anthropicApiKey
              : null;

      const effectiveKey = dbApiKey;

      if (!effectiveKey && provider !== 'ollama') {
        this.logger.warn(
          `[LLM] resolveTeamProvider(${teamId}): no effective key for ${provider} (dbApiKey=${!!dbApiKey}, env=not set)`,
        );
        return null;
      }

      this.logger.log(
        `[LLM] resolveTeamProvider(${teamId}): resolved to ${provider} (key=${!!effectiveKey})`,
      );
      return { provider, apiKey: effectiveKey || '' };
    } catch (error) {
      this.logger.warn(
        `[LLM] Failed to resolve team provider for ${teamId}:`,
        error,
      );
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
    if (
      !request ||
      typeof request.prompt !== 'string' ||
      request.prompt.length > 20000 ||
      (request.context || []).join('').length > 20000
    )
      throw new Error('Invalid AI input size');
    const feature = request.feature || 'brain-chat';
    const actor = request.actorId || request.teamId || 'system';
    return runtimeAiBudget.run(
      actor,
      request.requestId ? `${feature}:${request.requestId}` : undefined,
      async () => {
        const prepared = await this.aiAdmin.prepare(feature, {
          teamId: request.teamId,
        });
        const startedAt = Date.now();
        let response: LLMResponse | undefined;
        const attempted: { provider?: string; requestedModel?: string } = {};
        let failure: string | undefined;
        let providerSucceeded = false;
        try {
          const system = [
            prepared.personalityPrompt,
            prepared.executionPrompt,
            'Return ONLY JSON conforming exactly to this output schema:',
            JSON.stringify(prepared.outputSchemaJson),
          ].join('\n\n');
          response = await this.generateUnchecked(
            {
              ...request,
              prompt: JSON.stringify({
                userInput: request.prompt,
                untrustedContext: request.context || [],
              }),
              maxTokens: Math.min(Math.max(request.maxTokens || 500, 1), 2000),
            },
            system,
            attempted,
          );
          providerSucceeded = true;
          const parsed = JSON.parse(response.text);
          const validated: any = this.aiAdmin.validateOutput(prepared, parsed);
          if (feature === 'brain-chat' || feature === 'voice-reply') {
            if (typeof validated.reply !== 'string')
              throw new Error('Managed reply contract mismatch');
            response.text = validated.reply;
          } else response.text = JSON.stringify(validated);
          this.logger.log(
            JSON.stringify({
              event: 'ai.call',
              actor,
              teamId: request.teamId,
              promptId: prepared.id,
              revision: prepared.revision,
              usage: response.usage,
            }),
          );
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
          await this.aiAdmin.recordUsage({
            prepared,
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

  private async generateUnchecked(
    request: LLMRequest,
    systemPrompt: string,
    attempted: { provider?: string; requestedModel?: string },
  ): Promise<LLMResponse> {
    // If teamId is provided, try to use the team's configured LLM provider
    let activeProvider = this.provider;
    let activeApiKey: string | undefined;
    let activeModel = this.model;

    if (request.teamId) {
      const teamConfig = await this.resolveTeamProvider(request.teamId);
      if (!teamConfig)
        throw new Error('Configured team AI provider unavailable');
      if (teamConfig) {
        activeProvider = teamConfig.provider;
        activeApiKey = teamConfig.apiKey;
        activeModel = this.resolveModel(teamConfig.provider);
        this.logger.log(
          `[LLM] Using team provider: ${activeProvider} for team ${request.teamId}`,
        );
      }
    }

    if (activeProvider === 'none')
      throw new Error('Configured AI provider unavailable');

    const providerRequest: LLMRequest = {
      ...request,
      model: request.model || activeModel,
    };
    attempted.provider = activeProvider;
    attempted.requestedModel = providerRequest.model;
    try {
      switch (activeProvider) {
        case 'anthropic':
          return await this.generateWithAnthropic(
            providerRequest,
            systemPrompt,
            activeApiKey,
          );
        case 'google':
          return await this.generateWithGoogle(
            providerRequest,
            systemPrompt,
            activeApiKey,
          );
        case 'openai':
          return await this.generateWithOpenAI(
            providerRequest,
            systemPrompt,
            activeApiKey,
          );
        case 'ollama':
          return await this.generateWithOllama(providerRequest, systemPrompt);
      }
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'ai.call.failed',
          provider: activeProvider,
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

    const result = await genModel.generateContent(
      {
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens || 500,
          temperature: request.temperature || 0.7,
        },
      },
      { timeout: 30000 },
    );

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
    const client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 0,
    });

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
      signal: AbortSignal.timeout(30000),
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
      provider: 'ollama',
      requestedModel: request.model,
      responseModel: typeof data.model === 'string' ? data.model : undefined,
      finishReason: data.done ? 'stop' : 'length',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }

  async generateCommand(
    transcript: string,
    context: string[] = [],
    teamId?: string,
  ): Promise<CommandDecision> {
    const response = await this.generate({
      prompt: transcript,
      context,
      teamId,
      feature: 'decision-engine',
      maxTokens: 1000,
    });
    return JSON.parse(response.text) as CommandDecision;
  }

  isEnabled(): boolean {
    return this.provider !== 'none' && !!this.provider;
  }
}
