# OpenAI LLM Integration to Decision Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate OpenAI GPT as the actual LLM for the decision engine, replacing the placeholder "I heard: {text}" responses with real AI-generated responses

**Architecture:** 
- Create LLM service module with OpenAI client
- Wire to decision engine's `makeDecision()` method
- Use vector context from Qdrant for grounding
- Configurable via environment variables (API key, model)

**Tech Stack:** OpenAI Node.js SDK, NestJS, ConfigService

---

## Task 1: Create LLM Module Structure

**Files:**
- Create: `cloud/src/llm/llm.module.ts`
- Create: `cloud/src/llm/llm.service.ts`
- Create: `cloud/src/llm/llm.types.ts`

- [ ] **Step 1: Create llm.types.ts**

```typescript
// cloud/src/llm/llm.types.ts
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
```

- [ ] **Step 2: Create llm.service.ts**

```typescript
// cloud/src/llm/llm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { LLMRequest, LLMResponse, LLMConfig } from './llm.types';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private openai: any;
  private config: LLMConfig;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
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
      return {
        text: choice.message.content,
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        };
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
    return `I understand you're asking about "${prompt.substring(0, 50)}...". Let me help you with that. Could you provide more details?`;
  }

  isEnabled(): boolean {
    return this.isInitialized && !!this.config.apiKey;
  }
}
```

- [ ] **Step 3: Create llm.module.ts**

```typescript
// cloud/src/llm/llm.module.ts
import { Module } from '@nestjs/common';
import { LLMService } from './llm.service';

@Module({
  providers: [LLMService],
  exports: [LLMService]
})
export class LLMModule {}
```

- [ ] **Step 4: Commit**

```bash
git add cloud/src/llm/
git commit -m "feat(llm): add OpenAI LLM service module"
```

---

## Task 2: Wire LLM to Decision Engine

**Files:**
- Modify: `cloud/src/app.module.ts` - Add LLMModule
- Modify: `cloud/src/services/decision-engine.service.ts` - Use LLM in makeDecision

- [ ] **Step 1: Register LLMModule in app.module.ts**

Add to imports: `LLMModule`

- [ ] **Step 2: Update decision-engine.service.ts to use LLM**

In constructor, add:
```typescript
constructor(
  private prisma: PrismaService,
  private sessionService: SessionService,
  private ragService: RAGService,
  private flowService: FlowService,
  private subAgentService: SubAgentService,
  private llmService: LLMService,  // Add this
) {}
```

Find `makeDecision()` method and update to use LLM:

```typescript
private async makeDecision(context: DecisionContext): Promise<any> {
  const { currentTranscript, confidence, previousEvents, metadata } = context;
  
  // Get vector context from RAG
  const vectorContext = await this.retrieveVectorContext(
    context.sessionId, 
    currentTranscript, 
    metadata,
    'decision-' + Date.now()
  );
  
  const contextText = vectorContext.map(v => v.document.content).join('\n');
  
  // If LLM is enabled, use it for decision making
  if (this.llmService.isEnabled()) {
    try {
      const llmResponse = await this.llmService.generate({
        prompt: currentTranscript,
        context: vectorContext.map(v => v.document.content),
        maxTokens: 300,
        temperature: 0.7
      });
      
      // Map LLM response to command
      return this.mapLLMResponseToCommand(llmResponse.text, confidence);
    } catch (error) {
      this.logger.error('LLM decision failed, falling back to rule-based:', error);
    }
  }
  
  // Fallback to rule-based decisions
  // ... existing code ...
}
```

- [ ] **Step 3: Add helper method for mapping LLM response**

Add to decision-engine.service.ts:

```typescript
private mapLLMResponseToCommand(responseText: string, confidence: number): any {
  const text = responseText.toLowerCase().trim();
  
  // Check for explicit commands
  if (text.includes('stop') || text.includes('cancel')) {
    return { type: 'stop', text: responseText, confidence: 0.9, mode: 'normal' };
  }
  
  if (text.includes('click') || text.includes('type') || text.includes('select')) {
    return { 
      type: 'ui_steps', 
      text: responseText, 
      confidence: 0.7, 
      mode: 'normal',
      steps: this.parseUISteps(text)
    };
  }
  
  // Default to say command
  return { type: 'say', text: responseText, confidence, mode: 'normal' };
}
```

- [ ] **Step 4: Commit**

```bash
git add cloud/src/app.module.ts cloud/src/services/decision-engine.service.ts
git commit -m "feat(decision): wire LLM service to decision engine"
```

---

## Verification

```bash
# Test LLM service initialization
curl -s https://keledon.tuyoisaza.com/health | grep -A5 services

# Expected: Should show if LLM is enabled based on OPENAI_API_KEY env var
```

---

**End of LLM Integration Plan**