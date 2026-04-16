import { Injectable, Logger } from '@nestjs/common';
import { LLMRequest, LLMResponse } from './llm.types';

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
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
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

  async generate(request: LLMRequest): Promise<LLMResponse> {
    if (!this.isInitialized || !this.openai) {
      this.logger.warn('LLM not initialized, returning fallback');
      return {
        text: this.generateFallback(request.prompt),
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.context || []);
      
      const response = await this.openai.chat.completions.create({
        model: request.model || this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.prompt }
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
          totalTokens: usage ? usage.total_tokens : 0
        }
      };
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      return {
        text: this.generateFallback(request.prompt),
        finishReason: 'content_filter',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    }
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
    return this.isInitialized && !!this.config.apiKey;
  }
}