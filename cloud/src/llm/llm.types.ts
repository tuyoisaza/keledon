export interface LLMRequest {
  prompt: string;
  actorId?: string;
  feature?: 'brain-chat' | 'decision-engine';
  requestId?: string;
  correlationId?: string;
  teamId?: string;
  context?: string[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  provider?: string;
  requestedModel?: string;
  responseModel?: string;
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

export type UIStepAction =
  | 'navigate'
  | 'click'
  | 'type'
  | 'fill'
  | 'wait'
  | 'extract'
  | 'select'
  | 'hover'
  | 'scroll'
  | 'screenshot';

export interface UIStep {
  action: UIStepAction;
  selector?: string;
  value?: string;
  url?: string;
  description?: string;
}

export type CommandType = 'say' | 'ui_steps' | 'mode' | 'stop' | 'ask';

export interface CommandDecision {
  type: CommandType;
  text?: string;
  steps?: UIStep[];
  interruptible?: boolean;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  flow_id?: string | null;
  flow_run_id?: string | null;
  mode?: 'normal' | 'safe' | 'silent';
  reasoning?: string;
  confidence?: number;
  context?: Record<string, unknown>;
}
