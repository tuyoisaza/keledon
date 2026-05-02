import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LLMRequest, LLMResponse } from './llm.types';

type LLMProvider = 'anthropic' | 'google' | 'openai' | 'ollama';

const VALID_PROVIDERS: LLMProvider[] = ['anthropic', 'google', 'openai', 'ollama'];

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private provider: LLMProvider;
  private model: string;

  onModuleInit() {
    this.provider = this.resolveProvider();
    this.model = this.resolveModel(this.provider);
    this.logger.log(`LLM provider: ${this.provider}, model: ${this.model}`);
  }

  private resolveProvider(): LLMProvider {
    const forced = process.env.LLM_PROVIDER?.toLowerCase() as LLMProvider | undefined;
    if (forced) {
      if (!VALID_PROVIDERS.includes(forced)) {
        throw new Error(
          `Unknown LLM_PROVIDER: "${forced}". Valid values: ${VALID_PROVIDERS.join(', ')}`
        );
      }
      return forced;
    }

    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.GOOGLE_AI_API_KEY) return 'google';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.OLLAMA_URL) return 'ollama';

    throw new Error(
      'No LLM provider configured. Set ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, OPENAI_API_KEY, or OLLAMA_URL.'
    );
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
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request.context || []);
    try {
      switch (this.provider) {
        case 'anthropic':
          return await this.generateWithAnthropic(request, systemPrompt);
        case 'google':
          return await this.generateWithGoogle(request, systemPrompt);
        case 'openai':
          return await this.generateWithOpenAI(request, systemPrompt);
        case 'ollama':
          return await this.generateWithOllama(request, systemPrompt);
      }
    } catch (error) {
      this.logger.error(`LLM [${this.provider}] error:`, error);
      return {
        text: this.generateFallback(request.prompt),
        finishReason: 'content_filter',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }
  }

  private async generateWithAnthropic(request: LLMRequest, systemPrompt: string): Promise<LLMResponse> {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  private async generateWithGoogle(request: LLMRequest, systemPrompt: string): Promise<LLMResponse> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const genModel = genAI.getGenerativeModel({ model: request.model || this.model });

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

  private async generateWithOpenAI(request: LLMRequest, systemPrompt: string): Promise<LLMResponse> {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  private async generateWithOllama(request: LLMRequest, systemPrompt: string): Promise<LLMResponse> {
    const ollamaUrl = process.env.OLLAMA_URL!;

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
    const contextSection = context.length > 0
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

  isEnabled(): boolean {
    return !!this.provider;
  }
}
