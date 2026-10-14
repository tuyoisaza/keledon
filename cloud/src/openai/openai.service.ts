import { Injectable } from '@nestjs/common';

export interface OpenAICompletionOptions {
  model?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

@Injectable()
export class OpenAIService {
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';

    if (!this.apiKey) {
      console.warn(
        '[OpenAI] No API key configured. Please set OPENAI_API_KEY environment variable.',
      );
    }
  }

  /**
   * Generate text completion
   */
  async generateCompletion(
    options: OpenAICompletionOptions,
  ): Promise<{ content: string; usage?: unknown }> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4o-mini',
          messages: options.messages || [],
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: unknown = await response.json();
      const payload = asRecord(data);
      const firstChoice = asRecord(asArray(payload.choices)[0]);
      const message = asRecord(firstChoice.message);
      const content =
        typeof message.content === 'string' ? message.content : '';
      return {
        content,
        usage: payload.usage,
      };
    } catch (error) {
      console.error('[OpenAI] Error generating completion');
      throw error;
    }
  }

  /**
   * Generate embeddings for vector search
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI embeddings error: ${response.status} ${response.statusText}`,
        );
      }

      const data: unknown = await response.json();
      const payload = asRecord(data);
      const first = asRecord(asArray(payload.data)[0]);
      if (
        !Array.isArray(first.embedding) ||
        !first.embedding.every(
          (value): value is number =>
            typeof value === 'number' && Number.isFinite(value),
        )
      ) {
        throw new Error('OpenAI returned an invalid embedding payload');
      }
      return first.embedding;
    } catch (error) {
      console.error('[OpenAI] Error generating embedding');
      throw error;
    }
  }

  /**
   * Generate structured response
   */
  async generateStructuredResponse(
    prompt: string,
    schema?: unknown,
  ): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: schema
            ? { type: 'json_schema', json_schema: schema }
            : undefined,
          max_tokens: 1000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI structured response error: ${response.status} ${response.statusText}`,
        );
      }

      const data: unknown = await response.json();
      const payload = asRecord(data);
      const firstChoice = asRecord(asArray(payload.choices)[0]);
      const message = asRecord(firstChoice.message);
      const content =
        typeof message.content === 'string' ? message.content : '{}';
      return JSON.parse(content) as unknown;
    } catch (error) {
      console.error('[OpenAI] Error generating structured response');
      throw error;
    }
  }

  /**
   * Get model info and pricing
   */
  async getModelInfo(): Promise<{ models: string[] }> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `OpenAI models error: ${response.status} ${response.statusText}`,
        );
      }

      const data: unknown = await response.json();
      const payload = asRecord(data);
      const models = asArray(payload.data)
        .map((item) => asRecord(item).id)
        .filter((id): id is string => typeof id === 'string');
      return {
        models,
      };
    } catch (error) {
      console.error('[OpenAI] Error getting model info');
      throw error;
    }
  }
}
