import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { KELEDON_TRACE_SPANS } from '../telemetry/trace-model';
import { createHash } from 'crypto';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return '';
}

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
  async retrieveKnowledge(
    query: string,
    options: RAGContextOptions,
  ): Promise<RetrievalResult[]> {
    return this.tracer.startActiveSpan(
      KELEDON_TRACE_SPANS.VECTOR_RETRIEVE,
      async (span) => {
        const startedAt = Date.now();
        const topK = Math.max(
          1,
          Math.min(50, Math.floor(options.maxResults ?? 3)),
        );
        const qdrantUrl = (
          process.env.QDRANT_URL || 'http://localhost:6333'
        ).replace(/\/$/, '');
        const collection = process.env.QDRANT_COLLECTION || 'keledon';

        span.setAttribute('vector.collection', collection);
        span.setAttribute('topK', topK);
        if (options.decisionId) {
          span.setAttribute('decision.id', options.decisionId);
        }

        try {
          if (!options.companyId || !options.sessionId) {
            throw new Error('RAG tenant scope is required');
          }
          if (
            options.minScore !== undefined &&
            (!Number.isFinite(options.minScore) ||
              options.minScore < 0 ||
              options.minScore > 1)
          ) {
            throw new Error('RAG score threshold is invalid');
          }
          if (process.env.KELEDON_REQUIRE_QDRANT === 'true') {
            // Fail-fast if Qdrant is unreachable.
            const health = await fetch(`${qdrantUrl}/collections`);
            if (!health.ok) {
              throw new Error('Qdrant health check failed');
            }
          }

          // Determine vector size from collection config so we never guess dimensions.
          const infoResponse = await fetch(
            `${qdrantUrl}/collections/${encodeURIComponent(collection)}`,
          );
          if (!infoResponse.ok) {
            throw new Error('Qdrant collection lookup failed');
          }

          const infoJson: unknown = await infoResponse.json();
          const infoResult = asRecord(
            asRecord(asRecord(infoJson).result).config,
          );
          const vectors = asRecord(asRecord(infoResult.params).vectors);
          const vectorSize = Number(vectors.size);
          if (!Number.isFinite(vectorSize) || vectorSize <= 0) {
            throw new Error('Qdrant collection vector size is invalid');
          }

          const vector = this.queryToDeterministicVector(query, vectorSize);
          const filter: Record<string, unknown>[] = [
            { key: 'company_id', match: { value: options.companyId } },
          ];
          if (options.teamId)
            filter.push({ key: 'team_id', match: { value: options.teamId } });
          if (options.brandId)
            filter.push({ key: 'brand_id', match: { value: options.brandId } });
          const body: Record<string, unknown> = {
            vector,
            limit: topK,
            with_payload: true,
            filter: { must: filter },
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
            throw new Error('Qdrant search failed');
          }

          const searchJson: unknown = await searchResponse.json();
          const rawResults = asRecord(searchJson).result;
          const points = Array.isArray(rawResults) ? rawResults : [];
          const results: RetrievalResult[] = points.flatMap((rawPoint) => {
            const point = asRecord(rawPoint);
            const payload = asRecord(point.payload);
            const companyId = safeText(payload.company_id);
            if (companyId !== options.companyId) return [];
            if (options.teamId && safeText(payload.team_id) !== options.teamId)
              return [];
            if (
              options.brandId &&
              safeText(payload.brand_id) !== options.brandId
            )
              return [];
            const docId =
              safeText(payload.doc_id) ||
              safeText(payload.id) ||
              safeText(point.id);
            const score = typeof point.score === 'number' ? point.score : 0;
            if (!docId || score < (options.minScore ?? 0)) return [];
            return [
              {
                id: safeText(point.id) || docId,
                score,
                document: {
                  id: docId,
                  content: safeText(payload.text) || safeText(payload.content),
                  metadata: {
                    category: safeText(payload.category),
                    source: safeText(payload.source),
                    company_id: companyId,
                    created_at: safeText(payload.created_at),
                  },
                },
              },
            ];
          });

          let filtered = results;
          if (options.categories && options.categories.length > 0) {
            filtered = filtered.filter((result) =>
              options.categories?.includes(result.document.metadata.category),
            );
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
            message: error instanceof Error ? error.name : 'Error',
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
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
  evaluateResponse(
    _sessionId: string,
    _originalQuery: string,
    _response: string,
    _usedContext?: string[],
  ): Promise<{ success: boolean; feedback: string; analysis: unknown }> {
    void _sessionId;
    void _originalQuery;
    void _response;
    void _usedContext;
    return Promise.resolve({
      success: false,
      feedback: 'RAG response evaluation not implemented (real though empty)',
      analysis: null,
    });
  }

  /**
   * Get session context.
   * MVP: deterministic empty state.
   */
  getSessionContext(sessionId: string): Promise<SessionContext> {
    return Promise.resolve({
      sessionId,
      companyId: '',
      context: [],
      lastUpdated: '',
    });
  }

  /**
   * Update session context.
   * MVP: not implemented (no simulated success).
   */
  updateSessionContext(
    _sessionId: string,
    _pattern: Partial<KnowledgePattern>,
  ): Promise<{ success: boolean; message: string }> {
    void _sessionId;
    void _pattern;
    return Promise.resolve({
      success: false,
      message: 'Session context update not implemented (real though empty)',
    });
  }

  /**
   * Get knowledge gaps.
   * MVP: deterministic empty.
   */
  getKnowledgeGaps(_sessionId: string): Promise<string[]> {
    void _sessionId;
    return Promise.resolve<string[]>([]);
  }

  /**
   * Get query suggestions.
   * MVP: deterministic empty.
   */
  getQuerySuggestions(_sessionId: string): Promise<string[]> {
    void _sessionId;
    return Promise.resolve<string[]>([]);
  }
}
