import { Injectable } from '@nestjs/common';

export interface OpenAICompletionOptions {
  model?: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

@Injectable()
export class OpenAIService {
  private readonly apiKey: string;
  private readonly baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[OpenAI] No API key configured. Please set OPENAI_API_KEY environment variable.');
    }
  }

  /**
   * Generate text completion
   */
  async generateCompletion(options: OpenAICompletionOptions): Promise<{ content: string; usage?: any }> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4o-mini',
          messages: options.messages || [],
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage
      };

    } catch (error) {
      console.error('[OpenAI] Error generating completion:', error.message);
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
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI embeddings error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.data?.[0]?.embedding;

    } catch (error) {
      console.error('[OpenAI] Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Generate structured response
   */
  async generateStructuredResponse(
    prompt: string,
    schema?: any
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: schema ? { type: 'json_schema', json_schema: schema } : undefined,
          max_tokens: 1000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI structured response error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return JSON.parse(data.choices?.[0]?.message?.content || '{}');

    } catch (error) {
      console.error('[OpenAI] Error generating structured response:', error.message);
      throw error;
    }
  }

  /**
   * Get model info and pricing
   */
  async getModelInfo(): Promise<{ models: string[]; pricing?: any }> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI models error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      return {
        models: data.data?.map((model: any) => model.id) || [],
      };

    } catch (error) {
      console.error('[OpenAI] Error getting model info:', error.message);
      throw error;
    }
  }
}