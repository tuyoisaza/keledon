/**
 * OpenAI Provider Configuration
 * 
 * Configuration interface and schemas for OpenAI LLM provider
 */

export interface OpenAIConfig {
  /** OpenAI API key - required */
  apiKey: string;
  
  /** OpenAI organization ID - optional */
  organization?: string;
  
  /** OpenAI project ID - optional */
  project?: string;
  
  /** Custom OpenAI API base URL - optional */
  apiUrl?: string;
  
  /** Default model to use */
  model?: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini';
  
  /** Default temperature (0-2) */
  temperature?: number;
  
  /** Default max tokens */
  maxTokens?: number;
  
  /** Maximum retries for API calls */
  maxRetries?: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

export const DEFAULT_OPENAI_CONFIG: Partial<OpenAIConfig> = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  maxRetries: 3,
  timeout: 30000,
};

export const OPENAI_MODELS = {
  /** Fast, efficient model for simple tasks */
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    description: 'Fast and efficient for most tasks',
    maxTokens: 4096,
    contextWindow: 16385,
  },
  
  /** Capable model for complex tasks */
  'gpt-4': {
    name: 'GPT-4',
    description: 'Most capable model for complex tasks',
    maxTokens: 8192,
    contextWindow: 8192,
  },
  
  /** Faster version of GPT-4 */
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    description: 'Faster version of GPT-4',
    maxTokens: 4096,
    contextWindow: 128000,
  },
  
  /** Latest GPT-4 model with vision */
  'gpt-4o': {
    name: 'GPT-4o',
    description: 'Latest GPT-4 model with improved capabilities',
    maxTokens: 4096,
    contextWindow: 128000,
  },
  
  /** Smaller, faster version of GPT-4o */
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    description: 'Smaller, faster version of GPT-4o',
    maxTokens: 16384,
    contextWindow: 128000,
  },
} as const;

export const OPENAI_TTS_VOICES = {
  /** Male voice */
  alloy: 'Alloy',
  
  /** Female voice */
  echo: 'Echo',
  
  /** Male voice */
  fable: 'Fable',
  
  /** Female voice */
  onyx: 'Onyx',
  
  /** Male voice */
  nova: 'Nova',
  
  /** Female voice */
  shimmer: 'Shimmer',
} as const;

export const OPENAI_ERRORS = {
  /** Invalid API key */
  INVALID_API_KEY: 'invalid_api_key',
  
  /** API key not found */
  API_KEY_NOT_FOUND: 'api_key_not_found',
  
  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  /** Insufficient quota */
  INSUFFICIENT_QUOTA: 'insufficient_quota',
  
  /** Model not found */
  MODEL_NOT_FOUND: 'model_not_found',
  
  /** Content policy violation */
  CONTENT_POLICY_VIOLATION: 'content_policy_violation',
  
  /** Server error */
  SERVER_ERROR: 'server_error',
  
  /** Network timeout */
  NETWORK_TIMEOUT: 'network_timeout',
} as const;

/**
 * Validate OpenAI configuration
 */
export function validateOpenAIConfig(config: OpenAIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('API key is required');
  }
  
  if (config.temperature !== undefined) {
    if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
      errors.push('Temperature must be a number between 0 and 2');
    }
  }
  
  if (config.maxTokens !== undefined) {
    if (typeof config.maxTokens !== 'number' || config.maxTokens < 1 || config.maxTokens > 128000) {
      errors.push('Max tokens must be a number between 1 and 128000');
    }
  }
  
  if (config.maxRetries !== undefined) {
    if (typeof config.maxRetries !== 'number' || config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('Max retries must be a number between 0 and 10');
    }
  }
  
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 300000) {
      errors.push('Timeout must be a number between 1000 and 300000 milliseconds');
    }
  }
  
  if (config.model && !(config.model in OPENAI_MODELS)) {
    errors.push(`Invalid model: ${config.model}. Must be one of: ${Object.keys(OPENAI_MODELS).join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get model information
 */
export function getModelInfo(model: keyof typeof OPENAI_MODELS) {
  return OPENAI_MODELS[model] || null;
}

/**
 * Format OpenAI error for user display
 */
export function formatOpenAIError(error: any): string {
  if (error?.type === 'invalid_request_error') {
    if (error?.message?.includes('API key')) {
      return 'Invalid OpenAI API key. Please check your configuration.';
    }
    if (error?.message?.includes('model')) {
      return 'Invalid OpenAI model selected. Please choose a valid model.';
    }
  }
  
  if (error?.type === 'insufficient_quota') {
    return 'OpenAI quota exceeded. Please check your billing and usage limits.';
  }
  
  if (error?.type === 'rate_limit_exceeded') {
    return 'OpenAI rate limit exceeded. Please try again later.';
  }
  
  if (error?.code === OPENAI_ERRORS.RATE_LIMIT_EXCEEDED) {
    return 'OpenAI rate limit exceeded. Please try again later.';
  }
  
  if (error?.code === OPENAI_ERRORS.INSUFFICIENT_QUOTA) {
    return 'OpenAI quota exceeded. Please check your billing and usage limits.';
  }
  
  // Default error
  return error?.message || 'Unknown OpenAI error occurred.';
}