import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/qdrant-js';
import * as crypto from 'crypto';

@Injectable()
export class VectorStoreService {
  private qdrant: QdrantClient;
  private readonly collectionName = 'keledon';
  private readonly vectorSize = 768;

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
    this.qdrant = new QdrantClient({ url: qdrantUrl });
  }

  private deterministicHash(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector = new Array(this.vectorSize).fill(0);
    for (let i = 0; i < Math.min(hash.length, this.vectorSize); i++) {
      vector[i] = (hash[i] / 255) * 2 - 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(v => v / norm);
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
    } catch {
      return {
        collectionExists: false,
        documentCount: 0,
        collectionSize: '0 B',
        dimensions: this.vectorSize,
        distance: 'Cosine',
      };
    }
  }

  async addDocument(document: any) {
    const vector = this.deterministicHash(document.content);
    const id = document.id || `doc-${Date.now()}`;
    
    await this.qdrant.upsert(this.collectionName, {
      points: [{
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
      }],
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

  async search(query: string, options: {
    limit?: number;
    scoreThreshold?: number;
    category?: string[];
    company_id?: string;
    brand_id?: string;
    team_id?: string;
  } = {}) {
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
        relevance: r.score >= 0.8 ? 'high' : r.score >= 0.6 ? 'medium' : 'low',
      })),
    };
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
      return { documents: [] };
    }
  }
}
