import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { QdrantClient } from '@qdrant/qdrant-js';
import * as crypto from 'crypto';

type JsonRecord = Record<string, unknown>;
type VectorDocument = {
  id?: string;
  title?: string;
  content: string;
  category?: string;
  metadata?: JsonRecord;
  company_id?: string;
  brand_id?: string;
  team_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};
type SearchOptions = {
  limit: number;
  scoreThreshold: number;
  category?: string[];
  company_id?: string;
  brand_id?: string;
  team_id?: string;
};
type FilterCondition = {
  key: string;
  match: { any?: string[]; value?: string };
};
export type VectorStoreScope = { companyId: string; teamId?: string };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseDocument(value: unknown, forcedId?: string): VectorDocument {
  if (!isRecord(value)) throw new BadRequestException('Invalid document');
  const content = optionalString(value, 'content');
  if (!content) throw new BadRequestException('Document content is required');
  const id = forcedId ?? optionalString(value, 'id');
  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  return {
    ...(id ? { id } : {}),
    ...(optionalString(value, 'title')
      ? { title: optionalString(value, 'title') }
      : {}),
    content,
    ...(optionalString(value, 'category')
      ? { category: optionalString(value, 'category') }
      : {}),
    ...(metadata ? { metadata } : {}),
    ...(optionalString(value, 'company_id')
      ? { company_id: optionalString(value, 'company_id') }
      : {}),
    ...(optionalString(value, 'brand_id')
      ? { brand_id: optionalString(value, 'brand_id') }
      : {}),
    ...(optionalString(value, 'team_id')
      ? { team_id: optionalString(value, 'team_id') }
      : {}),
    ...(optionalString(value, 'created_by')
      ? { created_by: optionalString(value, 'created_by') }
      : {}),
    ...(optionalString(value, 'created_at')
      ? { created_at: optionalString(value, 'created_at') }
      : {}),
    ...(optionalString(value, 'updated_at')
      ? { updated_at: optionalString(value, 'updated_at') }
      : {}),
  };
}

function parseSearchOptions(value: unknown): SearchOptions {
  const options = isRecord(value) ? value : {};
  const rawLimit = options.limit;
  const limit =
    typeof rawLimit === 'number' && Number.isInteger(rawLimit)
      ? Math.min(100, Math.max(1, rawLimit))
      : 5;
  const rawThreshold = options.scoreThreshold;
  const scoreThreshold =
    typeof rawThreshold === 'number' && Number.isFinite(rawThreshold)
      ? Math.min(1, Math.max(0, rawThreshold))
      : 0.3;
  const categories = Array.isArray(options.category)
    ? options.category.filter(
        (item): item is string => typeof item === 'string' && !!item.trim(),
      )
    : undefined;
  return {
    limit,
    scoreThreshold,
    ...(categories?.length ? { category: categories } : {}),
    ...(optionalString(options, 'company_id')
      ? { company_id: optionalString(options, 'company_id') }
      : {}),
    ...(optionalString(options, 'brand_id')
      ? { brand_id: optionalString(options, 'brand_id') }
      : {}),
    ...(optionalString(options, 'team_id')
      ? { team_id: optionalString(options, 'team_id') }
      : {}),
  };
}

function readPointId(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : undefined;
}

function readPayload(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

@Injectable()
export class VectorStoreService {
  private readonly qdrant: QdrantClient;
  private readonly collectionName = 'keledon';
  private readonly vectorSize = 768;

  constructor() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
    this.qdrant = new QdrantClient({ url: qdrantUrl });
  }

  private deterministicHash(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector = Array<number>(this.vectorSize).fill(0);
    for (
      let index = 0;
      index < Math.min(hash.length, this.vectorSize);
      index++
    ) {
      vector[index] = (hash[index] / 255) * 2 - 1;
    }
    const norm = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );
    return vector.map((value) => value / norm);
  }

  async getStatus(scope?: VectorStoreScope): Promise<{
    collectionExists: boolean;
    documentCount: number;
    collectionSize: string;
    dimensions: number;
    distance: string;
  }> {
    try {
      const result: unknown = await this.qdrant.getCollection(
        this.collectionName,
      );
      const collection = readPayload(result);
      const config = readPayload(collection.config);
      const params = readPayload(config.params);
      const vectors = readPayload(params.vectors);
      const documentCount = scope
        ? (
            await this.qdrant.count(this.collectionName, {
              filter: this.buildScopeFilter(scope),
              exact: true,
            })
          ).count
        : typeof collection.points_count === 'number'
          ? collection.points_count
          : typeof collection.points === 'number'
            ? collection.points
            : 0;
      return {
        collectionExists: true,
        documentCount,
        collectionSize: `${documentCount * this.vectorSize * 4} B`,
        dimensions:
          typeof vectors.size === 'number' ? vectors.size : this.vectorSize,
        distance:
          typeof vectors.distance === 'string' ? vectors.distance : 'Cosine',
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

  async addDocument(input: unknown): Promise<{ id: string; success: true }> {
    const document = parseDocument(input);
    const vector = this.deterministicHash(document.content);
    const numericId =
      document.id && /^\d+$/.test(document.id) ? Number(document.id) : NaN;
    const id =
      document.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        document.id,
      )
        ? document.id
        : Number.isSafeInteger(numericId) && numericId >= 0
          ? numericId
          : crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await this.qdrant.upsert(this.collectionName, {
      points: [
        {
          id,
          vector,
          payload: {
            title: document.title ?? '',
            content: document.content,
            category: document.category ?? '',
            metadata: document.metadata ?? {},
            company_id: document.company_id ?? '',
            brand_id: document.brand_id ?? '',
            team_id: document.team_id ?? '',
            created_by: document.created_by ?? 'user',
            created_at: document.created_at ?? timestamp,
            updated_at: document.updated_at ?? timestamp,
          },
        },
      ],
    });

    return { id: String(id), success: true };
  }

  async updateDocument(
    id: string,
    input: unknown,
    scope?: VectorStoreScope,
  ): Promise<{ id: string; success: true }> {
    if (!id.trim()) throw new BadRequestException('Document id is required');
    if (scope) await this.assertPointScope(id, scope);
    const document = parseDocument(input, id);
    return this.addDocument({
      ...document,
      ...(scope ? { company_id: scope.companyId } : {}),
    });
  }

  async deleteDocument(
    id: string,
    scope?: VectorStoreScope,
  ): Promise<{ success: true }> {
    if (!id.trim()) throw new BadRequestException('Document id is required');
    if (scope) await this.assertPointScope(id, scope);
    const pointId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    await this.qdrant.delete(this.collectionName, { points: [pointId] });
    return { success: true };
  }

  async search(
    query: unknown,
    optionsInput: unknown = {},
  ): Promise<{
    results: Array<{
      document: JsonRecord;
      score: number;
      relevance: 'high' | 'medium' | 'low';
    }>;
  }> {
    if (typeof query !== 'string' || !query.trim()) {
      throw new BadRequestException('Search query is required');
    }
    const options = parseSearchOptions(optionsInput);
    const conditions: FilterCondition[] = [];
    if (options.category) {
      conditions.push({ key: 'category', match: { any: options.category } });
    }
    for (const key of ['company_id', 'brand_id', 'team_id'] as const) {
      const value = options[key];
      if (value) conditions.push({ key, match: { value } });
    }
    const filter = conditions.length > 0 ? { must: conditions } : undefined;
    const rawResults: unknown = await this.qdrant.search(this.collectionName, {
      vector: this.deterministicHash(query.trim()),
      limit: options.limit,
      score_threshold: options.scoreThreshold,
      filter,
      with_payload: true,
    });
    const results = Array.isArray(rawResults) ? rawResults : [];

    return {
      results: results.flatMap((raw) => {
        if (!isRecord(raw)) return [];
        const id = readPointId(raw.id);
        if (id === undefined) return [];
        const payload = readPayload(raw.payload);
        const score = typeof raw.score === 'number' ? raw.score : 0;
        return [
          {
            document: { id, ...payload },
            score,
            relevance: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low',
          },
        ];
      }),
    };
  }

  async listDocuments(
    scope?: VectorStoreScope,
  ): Promise<{ documents: JsonRecord[] }> {
    try {
      const rawResult: unknown = await this.qdrant.scroll(this.collectionName, {
        limit: 1000,
        with_payload: true,
        ...(scope ? { filter: this.buildScopeFilter(scope) } : {}),
      });
      const result = readPayload(rawResult);
      const points = Array.isArray(result.points) ? result.points : [];
      return {
        documents: points.flatMap((raw) => {
          if (!isRecord(raw)) return [];
          const id = readPointId(raw.id);
          return id === undefined ? [] : [{ id, ...readPayload(raw.payload) }];
        }),
      };
    } catch {
      return { documents: [] };
    }
  }

  private buildScopeFilter(scope: VectorStoreScope) {
    const must: FilterCondition[] = [
      { key: 'company_id', match: { value: scope.companyId } },
      ...(scope.teamId
        ? [{ key: 'team_id', match: { value: scope.teamId } }]
        : []),
    ];
    return { must };
  }

  private async assertPointScope(
    id: string,
    scope: VectorStoreScope,
  ): Promise<void> {
    const pointId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    const points = await this.qdrant.retrieve(this.collectionName, {
      ids: [pointId],
      with_payload: true,
    });
    const payload = readPayload(points[0]?.payload);
    if (
      !points.length ||
      payload.company_id !== scope.companyId ||
      (scope.teamId && payload.team_id !== scope.teamId)
    )
      throw new ForbiddenException('Vector document access denied');
  }
}
