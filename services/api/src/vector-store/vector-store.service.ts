import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { QdrantClient } from '@qdrant/qdrant-js';
import * as crypto from 'crypto';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private qdrant: QdrantClient;
  private readonly collectionName = 'keledon';
  private readonly vectorSize = 768;

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
    const qdrantApiKey = process.env.QDRANT_API_KEY || undefined;
    this.qdrant = new QdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey });
  }

  private deterministicHash(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector = new Array(this.vectorSize).fill(0);
    for (let i = 0; i < Math.min(hash.length, this.vectorSize); i++) {
      vector[i] = (hash[i] / 255) * 2 - 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) {
      return vector;
    }
    return vector.map((v) => v / norm);
  }

  private logVectorStoreUnavailable(operation: string, error: unknown): void {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    this.logger.warn(
      `[VectorStore] ${operation} unavailable; returning empty degraded response (${message})`,
    );
  }

  async getStatus() {
    try {
      const collection = await this.qdrant.getCollection(this.collectionName);
      const result = collection as any;
      return {
        collectionExists: true,
        documentCount: result.points_count || result.points || 0,
        collectionSize: `${(result.points_count || result.points || 0) * 768 * 4} B`,
        dimensions: result.config?.params?.vectors?.size || this.vectorSize,
        distance: result.config?.params?.vectors?.distance || 'Cosine',
      };
    } catch (error) {
      this.logVectorStoreUnavailable('status', error);
      return {
        collectionExists: false,
        documentCount: 0,
        collectionSize: '0 B',
        dimensions: this.vectorSize,
        distance: 'Cosine',
      };
    }
  }

  async getCollections(prefix?: string) {
    const normalizedPrefix = this.normalizeAllowedCollectionPrefix(prefix);
    try {
      const response = await this.qdrant.getCollections();
      const collections = (response as any)?.collections || [];

      return {
        collections: collections
          .map((collection: any) => ({
            name: String(collection.name || ''),
          }))
          .filter((collection: { name: string }) => {
            if (normalizedPrefix) {
              return collection.name.startsWith(normalizedPrefix);
            }

            return collection.name === this.collectionName;
          }),
      };
    } catch (error) {
      this.logVectorStoreUnavailable('collections', error);
      return { collections: [] };
    }
  }

  async getCollectionStats(name: string) {
    this.assertSafeCollectionName(name);
    const normalizedName = name.trim();
    try {
      const collection = await this.qdrant.getCollection(normalizedName);
      const result = collection as any;

      return {
        name: normalizedName,
        pointsCount: result.points_count || result.points || 0,
        indexedVectorsCount: result.indexed_vectors_count || 0,
        vectorSize: result.config?.params?.vectors?.size || this.vectorSize,
        distance: result.config?.params?.vectors?.distance || 'Cosine',
        status: result.status || 'green',
        optimizerStatus: result.optimizer_status || null,
      };
    } catch (error) {
      this.logVectorStoreUnavailable(
        `collection stats for ${normalizedName}`,
        error,
      );
      return {
        name: normalizedName,
        pointsCount: 0,
        indexedVectorsCount: 0,
        vectorSize: this.vectorSize,
        distance: 'Cosine',
        status: 'unavailable',
        optimizerStatus: null,
      };
    }
  }

  async addDocument(document: any) {
    const vector = this.deterministicHash(document.content);
    const id = document.id || `doc-${Date.now()}`;

    await this.qdrant.upsert(this.collectionName, {
      points: [
        {
          id,
          vector,
          payload: {
            title: document.title,
            content: document.content,
            category: document.category,
            metadata: document.metadata || {},
            company_id: document.company_id || '',
            brand_id: document.brand_id || '',
            team_id: document.team_id || '',
            created_by: document.created_by || 'user',
            created_at: document.created_at || new Date().toISOString(),
            updated_at: document.updated_at || new Date().toISOString(),
          },
        },
      ],
    });

    return { id, success: true };
  }

  async updateDocument(id: string, document: any) {
    await this.deleteDocument(id);
    return this.addDocument({ ...document, id });
  }

  async deleteDocument(id: string) {
    await this.qdrant.delete(this.collectionName, {
      points: [id],
    });
    return { success: true };
  }

  async search(
    query: string,
    options: {
      limit?: number;
      scoreThreshold?: number;
      category?: string[];
      company_id?: string;
      brand_id?: string;
      team_id?: string;
    } = {},
  ) {
    try {
      const queryVector = this.deterministicHash(query);

      const filter: any = { must: [] };

      if (options.category && options.category.length > 0) {
        filter.must.push({
          key: 'category',
          match: { any: options.category },
        });
      }

      if (options.company_id) {
        filter.must.push({
          key: 'company_id',
          match: { value: options.company_id },
        });
      }

      if (filter.must.length === 0) {
        delete filter.must;
      }

      const results = await this.qdrant.search(this.collectionName, {
        vector: queryVector,
        limit: options.limit || 5,
        score_threshold: options.scoreThreshold || 0.3,
        filter: filter.must ? filter : undefined,
        with_payload: true,
      });

      return {
        results: results.map((r: any) => ({
          document: {
            id: r.id,
            ...r.payload,
          },
          score: r.score,
          relevance:
            r.score >= 0.8 ? 'high' : r.score >= 0.6 ? 'medium' : 'low',
        })),
      };
    } catch (error) {
      this.logVectorStoreUnavailable('search', error);
      return { results: [] };
    }
  }

  async listDocuments() {
    try {
      const results = await this.qdrant.scroll(this.collectionName, {
        limit: 1000,
        with_payload: true,
      });

      return {
        documents: (results.points || []).map((p: any) => ({
          id: p.id,
          ...p.payload,
        })),
      };
    } catch (error) {
      this.logVectorStoreUnavailable('documents list', error);
      return { documents: [] };
    }
  }

  private normalizeAllowedCollectionPrefix(
    prefix?: string,
  ): string | undefined {
    if (typeof prefix !== 'string' || prefix.trim().length === 0) {
      return undefined;
    }

    const normalizedPrefix = prefix.trim();
    if (
      normalizedPrefix === 'knowledge-base-' ||
      normalizedPrefix.startsWith('knowledge-base-')
    ) {
      throw new BadRequestException(
        'Tenant knowledge-base collections are not exposed by this endpoint',
      );
    }

    if (normalizedPrefix !== this.collectionName) {
      throw new BadRequestException(
        `Unsupported collection prefix. Allowed prefix: ${this.collectionName}`,
      );
    }

    return normalizedPrefix;
  }

  private assertSafeCollectionName(name: string): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('Collection name is required');
    }

    const normalizedName = name.trim();

    if (
      normalizedName === 'knowledge-base-' ||
      normalizedName.startsWith('knowledge-base-')
    ) {
      throw new BadRequestException(
        'Tenant knowledge-base collections are not exposed by this endpoint',
      );
    }

    if (normalizedName !== this.collectionName) {
      throw new BadRequestException(
        `Collection name must be ${this.collectionName}`,
      );
    }
  }
}
