# KELEDON Vector Store Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Qdrant vector store for cloud brain context grounding, enabling semantic search for decision-making

**Architecture:** 
- Qdrant running as service (local or managed)
- Cloud fetches context from Qdrant based on user query
- LLM generates response grounded in retrieved context
- Response sent to desktop agent with optional RPA steps

**Tech Stack:** NestJS, Qdrant client, OpenAI (for embeddings)

---

## Task 1: Qdrant Connection Setup

**Files:**
- Create: `cloud/src/vector/vector.module.ts`
- Create: `cloud/src/vector/vector.service.ts`
- Modify: `cloud/src/app.module.ts`

- [ ] **Step 1: Create vector service**

```typescript
// cloud/src/vector/vector.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '../config/config.service';

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private client: QdrantClient;
  private collectionName = 'keledon-knowledge';
  private isConnected = false;

  constructor(private config: ConfigService) {
    const qdrantUrl = this.config.get('QDRANT_URL') || 'http://localhost:6333';
    this.client = new QdrantClient({ url: qdrantUrl });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: { size: 1536, distance: 'Cosine' }
        });
        console.log('[VectorService] Collection created:', this.collectionName);
      }
      
      this.isConnected = true;
      console.log('[VectorService] Connected to Qdrant');
    } catch (error) {
      console.error('[VectorService] Failed to connect:', error);
      this.isConnected = false;
    }
  }

  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.isConnected) {
      console.warn('[VectorService] Not connected, returning empty');
      return [];
    }

    try {
      // TODO: Generate embedding from OpenAI
      // For now, return mock results
      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        with_payload: true
      });

      return results.map(r => ({
        id: r.id as string,
        score: r.score,
        payload: r.payload as Record<string, any>
      }));
    } catch (error) {
      console.error('[VectorService] Search error:', error);
      return [];
    }
  }

  async addDocument(id: string, content: string, metadata: Record<string, any>): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const embedding = await this.generateEmbedding(content);
      
      await this.client.upsert(this.collectionName, {
        points: [{
          id,
          vector: embedding,
          payload: { content, ...metadata }
        }]
      });
      
      return true;
    } catch (error) {
      console.error('[VectorService] Add document error:', error);
      return false;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Use OpenAI to generate embeddings
    // const response = await this.openai.createEmbedding({
    //   model: 'text-embedding-ada-002',
    //   input: text
    // });
    // return response.data.data[0].embedding;
    
    // Placeholder: random vector
    return Array(1536).fill(0).map(() => Math.random());
  }
}
```

- [ ] **Step 2: Create vector module**

```typescript
// cloud/src/vector/vector.module.ts
import { Module, Global } from '@nestjs/common';
import { VectorService } from './vector.service';

@Global()
@Module({
  providers: [VectorService],
  exports: [VectorService]
})
export class VectorModule {}
```

- [ ] **Step 3: Register in app.module.ts**

Add to imports: `VectorModule`

- [ ] **Step 4: Commit**

```bash
git add cloud/src/vector/ cloud/src/app.module.ts
git commit -m "feat(vector): add Qdrant vector store integration"
```

---

## Task 2: RAG Service Integration

**Files:**
- Create: `cloud/src/rag/rag.service.ts`
- Modify: `cloud/src/decision/decision.service.ts`
- Test: Verify context retrieval

- [ ] **Step 1: Create RAG service**

```typescript
// cloud/src/rag/rag.service.ts
import { Injectable } from '@nestjs/common';
import { VectorService, SearchResult } from '../vector/vector.service';
import { ConfigService } from '../config/config.service';

export interface RagContext {
  query: string;
  results: SearchResult[];
  contextText: string;
}

@Injectable()
export class RagService {
  constructor(
    private vectorService: VectorService,
    private config: ConfigService
  ) {}

  async retrieveContext(query: string, teamId?: string): Promise<RagContext> {
    const results = await this.vectorService.search(query, 5);
    
    const contextText = results
      .map(r => r.payload.content)
      .join('\n\n');
    
    return {
      query,
      results,
      contextText
    };
  }

  async addKnowledge(text: string, metadata: Record<string, any>): Promise<boolean> {
    const id = `doc-${Date.now()}`;
    return this.vectorService.addDocument(id, text, metadata);
  }
}
```

- [ ] **Step 2: Modify decision service to use RAG**

In decision.service.ts, add:

```typescript
constructor(
  private prisma: PrismaService,
  private ragService: RagService,
  // ... other dependencies
) {}

async decide(text: string, context: { sessionId: string }): Promise<Decision> {
  // Get context from vector store
  const ragContext = await this.ragService.retrieveContext(text);
  
  // Generate response with LLM using ragContext
  const response = await this.generateWithContext(text, ragContext);
  
  return response;
}
```

- [ ] **Step 3: Commit**

```bash
git add cloud/src/rag/ cloud/src/decision/
git commit -m "feat(rag): integrate vector retrieval in decision engine"
```

---

## Task 3: Knowledge Base Management API

**Files:**
- Create: `cloud/src/rag/rag.controller.ts`
- Modify: `cloud/src/rag/rag.module.ts`
- Test: Add and search knowledge

- [ ] **Step 1: Create RAG controller**

```typescript
// cloud/src/rag/rag.controller.ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('api/rag')
export class RagController {
  constructor(private ragService: RagService) {}

  @Post('knowledge')
  async addKnowledge(
    @Body() body: { text: string; metadata?: Record<string, any> }
  ) {
    const success = await this.ragService.addKnowledge(body.text, body.metadata || {});
    return { success };
  }

  @Get('search')
  async search(@Query('q') query: string) {
    const context = await this.ragService.retrieveContext(query);
    return context;
  }
}
```

- [ ] **Step 2: Update module**

Add controller to RagModule

- [ ] **Step 3: Commit**

```bash
git add cloud/src/rag/
git commit -m "feat(api): add knowledge management endpoints"
```

---

## Task 4: Environment Configuration

**Files:**
- Modify: `cloud/.env.example`
- Modify: `cloud/src/config/config.service.ts`

- [ ] **Step 1: Add Qdrant config**

```typescript
// In config.service.ts
getQdrantUrl(): string {
  return this.config.get('QDRANT_URL') || 'http://localhost:6333';
}

getOpenAiKey(): string {
  return this.config.get('OPENAI_API_KEY') || '';
}
```

- [ ] **Step 2: Commit**

```bash
git commit -m "config: add Qdrant and OpenAI environment variables"
```

---

## Verification

```bash
# Test 1: Cloud builds
cd cloud && npm run build

# Test 2: Query health endpoint
curl https://keledon.tuyoisaza.com/health

# Test 3: Add test knowledge (requires auth)
curl -X POST https://keledon.tuyoisaza.com/api/rag/knowledge \
  -H "Content-Type: application/json" \
  -d '{"text": "Our return policy is 30 days", "metadata": {"type": "policy"}}'
```

---

**End of Vector Store Integration Plan**