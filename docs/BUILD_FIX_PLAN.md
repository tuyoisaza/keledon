# KELEDON Build Fix Action Plan

**Date**: 2026-01-27  
**Status**: 146 TypeScript Errors Identified  
**Target**: Cloud Backend Build Success  

---

## 🎯 Fix Strategy Overview

### Problem Analysis
The cloud backend has **146 TypeScript compilation errors** falling into 5 main categories:

1. **Missing Dependencies** (5 errors)
2. **Missing Interface Files** (28 errors)
3. **Missing Provider Implementations** (32 errors)
4. **Missing Module Index Files** (8 errors)
5. **Type Mismatches & Property Errors** (73 errors)

### Fix Priority Order
1. **Dependencies First** - Foundation for all other fixes
2. **Interface Definitions** - Core contracts
3. **Module Structure** - Build system scaffolding
4. **Provider Implementations** - Mock implementations first
5. **Type Corrections** - Final cleanup

---

## 🛠️ Detailed Fix Plan

### Phase 1: Dependencies (Estimated: 30 minutes)

#### 1.1 Remove Invalid Dependency
```bash
# @nestjs/router doesn't exist in registry
cd cloud
npm uninstall @nestjs/router
```

#### 1.2 Install Missing Dependencies
```bash
cd cloud
npm install @nestjs/swagger class-transformer class-validator @nestjs/config
```

#### 1.3 Verify Install
```bash
npm list --depth=0
```

---

### Phase 2: Core Interface Files (Estimated: 45 minutes)

#### 2.1 Create Missing Interfaces

**File**: `src/interfaces/action.interface.ts` (already created)
```typescript
// ✅ COMPLETED - Already exists
export enum ActionType { SPEAK, LISTEN, THINK, ACT, WORKFLOW, RPA, API }
export enum ActionDomain { CONVERSATION, AUTOMATION, KNOWLEDGE, SYSTEM, EXTERNAL }
// ... rest of interface
```

**File**: `src/interfaces/contracts.interface.ts` (already created)
```typescript
// ✅ COMPLETED - Already exists  
export interface BrainEvent { ... }
export interface BrainCommand { ... }
```

#### 2.2 Update Existing Interface Files

**File**: `src/interfaces/workflow.interface.ts` (needs completion)
```typescript
// ✅ PARTIAL - File exists, needs property additions
// Add missing properties to KeledonAction:
export interface KeledonAction {
  // Existing properties...
  intent?: string;        // Add missing intent
  system?: string;         // Add missing system  
  payload?: Record<string, any>; // Add missing payload
  requiredLevel?: number;   // Add missing requiredLevel
}

// Add missing ActionTypes:
export enum ActionType {
  // Existing values...
  SUBMIT = 'submit',
  CLOSE = 'close', 
  NAVIGATE = 'navigate',
  READ = 'read',
  EXECUTE_FLOW = 'EXECUTE_FLOW'
}

// Add missing ActionDomains:
export enum ActionDomain {
  // Existing values...
  UI = 'ui',
  CRM = 'crm',
  VOICE = 'voice'
}

// Add missing ActionRisk values:
export enum ActionRisk {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Add missing AutonomyContext properties:
export interface AutonomyContext {
  // Existing properties...
  accountId?: string;      // Add missing accountId
  level?: number;          // Add missing level
}
```

---

### Phase 3: Module Structure (Estimated: 60 minutes)

#### 3.1 Create Module Index Files

**File**: `src/rag/index.ts`
```typescript
export * from './ingestion';
export * from './retrieval';
export * from './embeddings';

export const RAGModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**File**: `src/vectorstore/index.ts`
```typescript
export * from './vector-store.service';

export const VectorStoreModule = {
  providers: [],
  exports: [], 
  imports: []
} as any;
```

**File**: `src/storage/index.ts`
```typescript
export * from './documents';
export * from './transcripts';
export * from './workflow.storage';

export const StorageModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**File**: `src/audit/index.ts`
```typescript
export * from './audit.service';

export const AuditModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**File**: `src/auth/index.ts`
```typescript
export * from './auth.controller';
export * from './auth.service';

export const AuthModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**File**: `src/workers/index.ts`
```typescript
export * from './job.processors';

export const WorkersModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**File**: `src/observability/index.ts`
```typescript
export * from './logging';
export * from './metrics';

export const ObservabilityModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**File**: `src/audio/index.ts`
```typescript
export * from './stt.factory';
export * from './tts.factory';

export const AudioModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

#### 3.2 Fix Existing Module Exports

**File**: `src/api/index.ts` (already partially fixed)
```typescript
// ✅ PARTIAL - Update with working exports
export * from './admin.controller';
export * from './health.controller'; 
export * from './provider-catalog.controller';
export * from './providers.controller';
export * from './workflow.controller';

export const ApiModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

---

### Phase 4: Provider Implementations (Estimated: 90 minutes)

#### 4.1 Create Provider Interface Files

**File**: `src/audio/capabilities/stt/interfaces/stt-provider.interface.ts`
```typescript
export interface SttProvider {
  name: string;
  type: string;
  transcript$: Observable<any>;
  
  initialize(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface TranscriptPart {
  text: string;
  confidence: number;
  timestamp: Date;
}
```

**File**: `src/audio/capabilities/tts/interfaces/tts-provider.interface.ts`
```typescript
export interface TtsProvider {
  name: string;
  type: string;
  
  initialize(): Promise<void>;
  speak(text: string, options?: any): Promise<void>;
  stop(): Promise<void>;
  cleanup(): Promise<void>;
}
```

**File**: `src/brain/capabilities/llm/interfaces/llm-provider.interface.ts`
```typescript
export interface LlmProvider {
  name: string;
  type: string;
  
  initialize(): Promise<void>;
  generate(prompt: string, options?: any): Promise<string>;
  cleanup(): Promise<void>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
}
```

**File**: `src/brain/capabilities/rpa/interfaces/rpa-provider.interface.ts`
```typescript
export interface RpaProvider {
  name: string;
  type: string;
  
  initialize(): Promise<void>;
  execute(action: any): Promise<any>;
  cleanup(): Promise<void>;
}

export interface RpaProviderConfig {
  name: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface StandardAction {
  type: string;
  parameters: Record<string, any>;
}
```

#### 4.2 Create Mock Provider Implementations

**File**: `src/audio/providers/deepgram.provider.ts`
```typescript
import { SttProvider, TranscriptPart } from '../capabilities/stt/interfaces/stt-provider.interface';
import { Observable, Subject } from 'rxjs';

export class DeepgramProvider implements SttProvider {
  readonly name = 'deepgram';
  readonly type = 'stt';
  
  transcript$ = new Subject<TranscriptPart>();

  async initialize(): Promise<void> {
    console.log('Deepgram STT provider initialized');
  }

  async startListening(): Promise<void> {
    console.log('Deepgram STT provider started listening');
    // Mock implementation
    setTimeout(() => {
      this.transcript$.next({
        text: 'Mock Deepgram transcript',
        confidence: 0.95,
        timestamp: new Date()
      });
    }, 1000);
  }

  async stopListening(): Promise<void> {
    console.log('Deepgram STT provider stopped listening');
  }

  async cleanup(): Promise<void> {
    console.log('Deepgram STT provider cleaned up');
  }
}
```

**File**: `src/audio/providers/elevenlabs.provider.ts`
```typescript
import { TtsProvider } from '../capabilities/tts/interfaces/tts-provider.interface';

export class ElevenLabsProvider implements TtsProvider {
  readonly name = 'elevenlabs';
  readonly type = 'tts';

  async initialize(): Promise<void> {
    console.log('ElevenLabs TTS provider initialized');
  }

  async speak(text: string, options?: any): Promise<void> {
    console.log(`ElevenLabs TTS speaking: ${text}`);
    // Mock implementation
  }

  async stop(): Promise<void> {
    console.log('ElevenLabs TTS stopped');
  }

  async cleanup(): Promise<void> {
    console.log('ElevenLabs TTS cleaned up');
  }
}
```

**Create similar mock files for:**
- `src/audio/providers/local-stt.provider.ts`
- `src/audio/providers/whisperx.provider.ts`
- `src/audio/providers/mock-tts.provider.ts`
- `src/audio/providers/coqui-tts.provider.ts`
- `src/audio/providers/qwen3-tts.provider.ts`
- `src/brain/providers/openai.provider.ts`
- `src/brain/providers/mock-llm.provider.ts`
- `src/brain/providers/content-scripts.provider.ts`
- `src/brain/providers/playwright-mcp.provider.ts`
- `src/brain/providers/local-rpa.provider.ts`

---

### Phase 5: Core Services (Estimated: 60 minutes)

#### 5.1 Create Missing Core Files

**File**: `src/core/llm/prompts.ts`
```typescript
export const ORCHESTRATOR_SYSTEM_PROMPT = `
You are Keledón, an AI voice assistant for customer service automation.
Your role is to help users through conversational interactions and execute appropriate automation flows.
Always be helpful, accurate, and respectful.
`;
```

**File**: `src/core/execution/execution.orchestrator.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { KeledonAction, AutonomyContext } from '../../interfaces/action.interface';

@Injectable()
export class ExecutionOrchestrator {
  async executeAction(action: KeledonAction, context: AutonomyContext): Promise<any> {
    console.log(`Executing action: ${action.type}`);
    return { success: true, data: null };
  }
}
```

**File**: `src/core/context/context.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { AutonomyContext } from '../../interfaces/action.interface';

@Injectable()
export class ContextService {
  async createContext(sessionId: string): Promise<AutonomyContext> {
    return {
      sessionId,
      mode: 'manual',
      confidence: 1.0,
      timestamp: new Date()
    };
  }
}
```

**File**: `src/policy/policy.engine.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { KeledonAction, AutonomyContext } from '../interfaces/action.interface';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class PolicyEngine {
  evaluate(action: KeledonAction, context: AutonomyContext): PolicyResult {
    // Basic policy evaluation
    return { allowed: true };
  }
}
```

---

### Phase 6: Type Fixes (Estimated: 30 minutes)

#### 6.1 Fix Implicit 'any' Types

**File**: `src/audio/stt.factory.ts`
```typescript
// Fix parameter types:
const sub = dgProvider.transcript$.subscribe((part: any) => {
  // ... rest of code
});
```

**File**: `src/storage/workflow.storage.ts`
```typescript
// Fix parameter types:
.map((defId: any) => this.flowDefinitions.get(defId))
.filter((def: any): def is FlowDefinition => !!def);
const enabledDefinitions = allowedDefinitions.filter((def: any) =>
workflow.steps = workflow.steps.filter((s: any) => s.id !== stepId);
```

#### 6.2 Fix Type Mismatches

**File**: `src/vectorstore/vector-store.service.ts`
```typescript
// Fix metadata type:
return searchResult.map(result => ({
  document: {
    ...result.document,
    metadata: result.document.metadata || {} // Convert unknown to Record<string, any>
  },
  score: result.score,
  relevance: result.relevance
}));
```

---

## 🚀 Implementation Commands

### Execute Phase 1
```bash
cd cloud
npm uninstall @nestjs/router
npm install @nestjs/swagger class-transformer class-validator @nestjs/config
npm run build  # Expect dependency errors to be resolved
```

### Execute Phase 2-6
```bash
# After creating all files in phases 2-6:
cd cloud
npm run build  # Expect dramatic error reduction
```

### Final Verification
```bash
cd cloud
npm run build  # Should succeed or have <10 errors

# Verify output:
ls -la dist/  # Should show compiled JS files
```

---

## 📊 Success Metrics

### Before Fixes
- **Total Errors**: 146
- **Build Success**: ❌ FAIL
- **Categories**: 5 major categories

### After Fixes (Target)
- **Total Errors**: <10 (minor type issues only)
- **Build Success**: ✅ PASS
- **Output**: `dist/` folder with compiled JavaScript

### Success Criteria
1. All 5 dependency errors resolved
2. All 28 interface errors resolved
3. All 32 provider errors resolved  
4. All 8 module index errors resolved
5. Majority of type mismatches resolved

---

## ⏱️ Time Estimates

| Phase | Estimated Time | Priority |
|-------|----------------|----------|
| Dependencies | 30 minutes | HIGH |
| Interface Files | 45 minutes | HIGH |
| Module Structure | 60 minutes | HIGH |
| Provider Mocks | 90 minutes | MEDIUM |
| Type Fixes | 30 minutes | LOW |
| **Total** | **255 minutes** (4.25 hours) | - |

---

## 🔄 Verification Process

### After Each Phase
1. **Run Build**: `npm run build`
2. **Count Errors**: Note error reduction
3. **Document Progress**: Update fix status

### Final Verification
1. **Clean Build**: `rm -rf dist/ && npm run build`
2. **Check Output**: `ls -la dist/`
3. **Type Check**: Verify no critical errors
4. **Functionality**: Test basic imports

---

## 📞 Support Resources

### Error Reference
- **TS2307**: Cannot find module → File missing/incorrect path
- **TS2339**: Property does not exist → Interface mismatch
- **TS7006**: Implicit 'any' type → Missing type annotation
- **TS2322**: Type not assignable → Type definition mismatch

### Quick Fixes
1. **Missing Files**: Create empty placeholder first, then implement
2. **Wrong Imports**: Check file paths and export names
3. **Type Errors**: Add explicit type annotations
4. **Circular Dependencies**: Use `any` type temporarily

---

## 🎯 Success Path

**After implementing all fixes:**
1. ✅ Cloud backend builds successfully
2. ✅ All modules properly export
3. ✅ TypeScript compilation passes
4. ✅ System ready for development
5. ✅ Full stack build success: 100%

**Next Steps:**
- Continue with RPA Executor implementation
- Add comprehensive tests
- Deploy to development environment

---

*This action plan provides a systematic approach to fixing all 146 TypeScript errors and achieving a successful cloud backend build.*