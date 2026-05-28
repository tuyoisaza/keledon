import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { KELEDON_TRACE_SPANS } from '../telemetry/trace-model';
import { createHash } from 'crypto';

export interface RAGContextOptions {
  sessionId: string;
  companyId: string;
  decisionId?: string;
  brandId?: string;
  teamId?: string;
  categories?: string[];
  maxResults?: number;
  minScore?: number;
}

export interface KnowledgePattern {
  id: string;
  sessionId: string;
  query: string;
  context: string;
  response: string;
  success: boolean;
  timestamp: string;
  relevanceScore?: number;
  feedback?: 'helpful' | 'not_helpful';
  usageCount: number;
}

export interface SessionContext {
  sessionId: string;
  companyId: string;
  context: KnowledgePattern[];
  lastUpdated: string;
}

export interface RetrievalResult {
  id: string;
  score: number;
  document: {
    id: string;
    content: string;
    metadata: {
      category: string;
      source: string;
      company_id: string;
      created_at: string;
    };
  };
}

@Injectable()
export class RAGService {
  private readonly tracer = trace.getTracer('keledon-cloud-rag');

  constructor() {
    console.log('[RAG] Service initialized (Qdrant-backed, deterministic)');
  }

  /**
   * Retrieve knowledge based on query.
   * Canon: vector retrieval is mandatory; no mock data.
   * MVP: if collection has no docs, caller must handle deterministic empty/fail-fast.
   */
  async retrieveKnowledge(query: string, options: RAGContextOptions): Promise<RetrievalResult[]> {
    return this.tracer.startActiveSpan(KELEDON_TRACE_SPANS.VECTOR_RETRIEVE, async (span) => {
      const startedAt = Date.now();
      const topK = options.maxResults || 3;
      const qdrantUrl = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '');
      const collection = process.env.QDRANT_COLLECTION || 'keledon';

      span.setAttribute('vector.collection', collection);
      span.setAttribute('topK', topK);
      if (options.decisionId) {
        span.setAttribute('decision.id', options.decisionId);
      }

      try {
        if (process.env.KELEDON_REQUIRE_QDRANT === 'true') {
          // Fail-fast if Qdrant is unreachable.
          const health = await fetch(`${qdrantUrl}/collections`);
          if (!health.ok) {
            throw new Error(`Qdrant unreachable: HTTP ${health.status}`);
          }
        }

        // Determine vector size from collection config so we never guess dimensions.
        const infoResponse = await fetch(`${qdrantUrl}/collections/${encodeURIComponent(collection)}`);
        if (!infoResponse.ok) {
          throw new Error(`Qdrant collection lookup failed: HTTP ${infoResponse.status}`);
        }

        const infoJson: any = await infoResponse.json();
        const vectorSize = Number(infoJson?.result?.config?.params?.vectors?.size);
        if (!Number.isFinite(vectorSize) || vectorSize <= 0) {
          throw new Error('Qdrant collection vector size is invalid');
        }

        const vector = this.queryToDeterministicVector(query, vectorSize);
        const body: any = {
          vector,
          limit: topK,
          with_payload: true,
        };
        if (typeof options.minScore === 'number') {
          body.score_threshold = options.minScore;
        }

        const searchResponse = await fetch(
          `${qdrantUrl}/collections/${encodeURIComponent(collection)}/points/search`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );

        if (!searchResponse.ok) {
          const detail = await searchResponse.text();
          throw new Error(`Qdrant search failed: HTTP ${searchResponse.status} ${detail}`);
        }

        const searchJson: any = await searchResponse.json();
        const results: RetrievalResult[] = (searchJson?.result || []).map((point: any) => {
          const payload = (point?.payload || {}) as Record<string, any>;
          const docId = String(payload.doc_id || payload.id || point?.id || '');
          const content = String(payload.text || payload.content || '');

          return {
            id: String(point?.id ?? docId),
            score: typeof point?.score === 'number' ? point.score : 0,
            document: {
              id: docId,
              content,
              metadata: {
                category: String(payload.category || ''),
                source: String(payload.source || ''),
                company_id: String(payload.company_id || options.companyId || ''),
                created_at: String(payload.created_at || ''),
              },
            },
          };
        });

        let filtered = results;
        if (options.categories && options.categories.length > 0) {
          filtered = filtered.filter((result) => options.categories?.includes(result.document.metadata.category));
        }

        const limitedResults = filtered.slice(0, topK);
        const latencyMs = Date.now() - startedAt;
        const docIds = limitedResults.map((result) => result.document.id);

        span.setAttribute('latency_ms', latencyMs);
        span.setAttribute('vector.results', limitedResults.length);
        span.setAttribute('vector.doc_ids', docIds);
        return limitedResults;
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        span.setAttribute('latency_ms', latencyMs);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private queryToDeterministicVector(text: string, size: number): number[] {
    // Deterministic vector generator for MVP: no embedding model in this tier.
    // Uses SHA256 bytes expanded to requested dimension.
    const hash = createHash('sha256').update(text).digest();
    const vector = new Array<number>(size);
    for (let i = 0; i < size; i += 1) {
      const b = hash[i % hash.length];
      vector[i] = b / 255;
    }
    return vector;
  }

  /**
   * Evaluate RAG response quality.
   * MVP: deterministic empty (no simulated scoring).
   */
  async evaluateResponse(
    sessionId: string,
    originalQuery: string,
    response: string,
    usedContext?: string[],
  ): Promise<{ success: boolean; feedback: string; analysis: any }> {
    return {
      success: false,
      feedback: 'RAG response evaluation not implemented (real though empty)',
      analysis: null,
    };
  }

  /**
   * Get session context.
   * MVP: deterministic empty state.
   */
  async getSessionContext(sessionId: string): Promise<SessionContext> {
    return {
      sessionId,
      companyId: '',
      context: [],
      lastUpdated: '',
    };
  }

  /**
   * Update session context.
   * MVP: not implemented (no simulated success).
   */
  async updateSessionContext(
    sessionId: string,
    pattern: Partial<KnowledgePattern>,
  ): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Session context update not implemented (real though empty)',
    };
  }

  /**
   * Get knowledge gaps.
   * MVP: deterministic empty.
   */
  async getKnowledgeGaps(sessionId: string): Promise<string[]> {
    return [];
  }

  /**
   * Get query suggestions.
   * MVP: deterministic empty.
   */
  async getQuerySuggestions(sessionId: string): Promise<string[]> {
    return [];
  }
}
