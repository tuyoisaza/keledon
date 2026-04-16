export interface LLMRequest {
  prompt: string;
  context?: string[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  text: string;
  finishReason: 'stop' | 'length' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}