import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KnowledgeBase, KnowledgeDocument } from '@prisma/client';
import { QdrantClient } from '@qdrant/qdrant-js';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { CreateKnowledgeDocumentDto } from './dto/create-knowledge-document.dto';
import { IngestKnowledgeBaseDto } from './dto/ingest-knowledge-base.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';

type KnowledgeMetadata = Record<string, unknown>;

interface KnowledgeChunkPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

@Injectable()
export class KnowledgeService {
  private readonly qdrant: QdrantClient;
  private readonly vectorSize = 768;

  constructor(private readonly prisma: PrismaService) {
    const qdrantUrl = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
    const qdrantApiKey = process.env.QDRANT_API_KEY || undefined;
    this.qdrant = new QdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey });
  }

  async createKnowledgeBase(body: CreateKnowledgeBaseDto) {
    this.assertBody(body, 'Request body is required');
    this.assertNonEmpty(body.companyId, 'companyId is required');
    this.assertNonEmpty(body.name, 'name is required');

    const knowledgeBase = await this.prisma.knowledgeBase.create({
      data: {
        companyId: body.companyId.trim(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
      },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    return {
      ...knowledgeBase,
      collectionName: this.getCollectionName(knowledgeBase.id),
    };
  }

  async createKnowledgeDocument(knowledgeBaseId: string, body: CreateKnowledgeDocumentDto) {
    this.assertBody(body, 'Request body is required');
    this.assertNonEmpty(knowledgeBaseId, 'knowledge base ID is required');
    this.assertNonEmpty(body.companyId, 'companyId is required');
    this.assertNonEmpty(body.title, 'title is required');
    this.assertNonEmpty(body.content, 'content is required');
    this.assertOptionalString(body.companyId, 'companyId must be a non-empty string when provided');
    this.assertOptionalPlainObject(body.metadata, 'metadata must be an object when provided');

    const knowledgeBase = await this.requireKnowledgeBase(knowledgeBaseId, body.companyId);
    const metadata = this.normalizeMetadata(body.metadata, knowledgeBase.companyId);

    return this.prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        title: body.title.trim(),
        content: body.content.trim(),
        metadata: JSON.stringify(metadata),
      },
    });
  }

  async ingestKnowledgeBase(knowledgeBaseId: string, body: IngestKnowledgeBaseDto) {
    const requestBody = body ?? {};
    this.assertNonEmpty(requestBody.companyId, 'companyId is required');
    this.assertOptionalString(requestBody.companyId, 'companyId must be a non-empty string when provided');
    this.assertOptionalStringArray(requestBody.documentIds, 'documentIds must be an array of non-empty strings');
    this.assertOptionalNumber(requestBody.chunkSize, 'chunkSize must be a finite number when provided');
    this.assertOptionalNumber(requestBody.chunkOverlap, 'chunkOverlap must be a finite number when provided');

    const knowledgeBase = await this.requireKnowledgeBase(knowledgeBaseId, requestBody.companyId);
    const documents = await this.loadKnowledgeDocuments(knowledgeBase.id, requestBody.documentIds);

    if (documents.length === 0) {
      throw new BadRequestException('No matching knowledge documents found for ingestion');
    }

    const chunkSize = this.normalizeChunkSize(requestBody.chunkSize);
    const chunkOverlap = this.normalizeChunkOverlap(requestBody.chunkOverlap, chunkSize);
    const collectionName = this.getCollectionName(knowledgeBase.id);

    await this.ensureCollection(collectionName);

    const points: KnowledgeChunkPoint[] = [];
    const vectorIdsByDocument = new Map<string, string[]>();

    for (const document of documents) {
      const metadata = this.parseMetadata(document.metadata, knowledgeBase.companyId);
      const chunks = this.chunkContent(document.content, chunkSize, chunkOverlap);

      vectorIdsByDocument.set(document.id, []);

      chunks.forEach((chunkText, index) => {
        const chunkId = `${document.id}:chunk:${index + 1}`;
        const pointId = this.getChunkPointId(document.id, index);
        vectorIdsByDocument.get(document.id)?.push(pointId);
        points.push({
          id: pointId,
          vector: this.textToVector(chunkText),
          payload: {
            knowledgeBaseId: knowledgeBase.id,
            documentId: document.id,
            chunkId,
            companyId: knowledgeBase.companyId,
            teamId: this.optionalString(metadata.teamId),
            brandId: this.optionalString(metadata.brandId),
            country: this.optionalString(metadata.country),
            category: this.optionalString(metadata.category),
            language: this.optionalString(metadata.language),
            source: this.optionalString(metadata.source) || 'manual',
            effectiveDate: this.optionalString(metadata.effectiveDate),
            title: document.title,
            text: chunkText,
            createdAt: document.createdAt.toISOString(),
          },
        });
      });
    }

    if (points.length === 0) {
      throw new BadRequestException('Documents produced no indexable chunks');
    }

    await this.qdrant.upsert(collectionName, { points });

    for (const document of documents) {
      const existingIds = this.parseVectorIds(document.vectorIds);
      const ingestedIds = vectorIdsByDocument.get(document.id) || [];
      await this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: {
          vectorIds: this.mergeVectorIds(existingIds, ingestedIds).join(','),
        },
      });
    }

    return {
      knowledgeBaseId: knowledgeBase.id,
      collectionName,
      ingestedDocuments: documents.length,
      ingestedChunks: points.length,
      chunkSize,
      chunkOverlap,
    };
  }

  async searchKnowledge(body: SearchKnowledgeDto) {
    this.assertBody(body, 'Request body is required');
    this.assertNonEmpty(body.query, 'query is required');
    this.assertNonEmpty(body.companyId, 'companyId is required');
    this.assertOptionalString(body.knowledgeBaseId, 'knowledgeBaseId must be a non-empty string when provided');
    this.assertOptionalString(body.companyId, 'companyId must be a non-empty string when provided');
    this.assertOptionalString(body.teamId, 'teamId must be a non-empty string when provided');
    this.assertOptionalString(body.language, 'language must be a non-empty string when provided');
    this.assertOptionalNumber(body.limit, 'limit must be a finite number when provided');
    this.assertOptionalNumber(
      body.scoreThreshold,
      'scoreThreshold must be a finite number when provided',
    );
    this.assertOptionalPlainObject(body.filters, 'filters must be an object when provided');
    this.assertOptionalString(body.filters?.country, 'filters.country must be a non-empty string when provided');
    this.assertOptionalString(body.filters?.language, 'filters.language must be a non-empty string when provided');
    this.assertOptionalString(body.filters?.source, 'filters.source must be a non-empty string when provided');
    this.assertOptionalString(body.filters?.brandId, 'filters.brandId must be a non-empty string when provided');
    this.assertOptionalStringArray(
      body.filters?.category,
      'filters.category must be an array of non-empty strings when provided',
    );

    const limit = this.normalizeLimit(body.limit);
    const scoreThreshold = typeof body.scoreThreshold === 'number' ? body.scoreThreshold : undefined;
    const knowledgeBases = await this.resolveSearchKnowledgeBases(body);
    const searchVector = this.textToVector(body.query.trim());
    const filter = this.buildFilter(body);
    const aggregatedResults: Array<Record<string, unknown>> = [];

    for (const knowledgeBase of knowledgeBases) {
      const collectionName = this.getCollectionName(knowledgeBase.id);
      const collectionExists = await this.collectionExists(collectionName);
      if (!collectionExists) {
        continue;
      }

      const results = await this.qdrant.search(collectionName, {
        vector: searchVector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        filter,
      });

      for (const result of results as Array<Record<string, any>>) {
        const payload = result.payload || {};
        aggregatedResults.push({
          knowledgeBaseId: knowledgeBase.id,
          collectionName,
          pointId: String(result.id),
          score: typeof result.score === 'number' ? result.score : 0,
          documentId: String(payload.documentId || ''),
          chunkId: String(payload.chunkId || ''),
          title: String(payload.title || ''),
          text: String(payload.text || ''),
          metadata: {
            companyId: String(payload.companyId || knowledgeBase.companyId),
            teamId: String(payload.teamId || ''),
            brandId: String(payload.brandId || ''),
            country: String(payload.country || ''),
            category: String(payload.category || ''),
            language: String(payload.language || ''),
            source: String(payload.source || ''),
            effectiveDate: String(payload.effectiveDate || ''),
          },
        });
      }
    }

    aggregatedResults.sort((left, right) => Number(right.score || 0) - Number(left.score || 0));

    return {
      query: body.query.trim(),
      limit,
      results: aggregatedResults.slice(0, limit),
      searchedKnowledgeBases: knowledgeBases.map((knowledgeBase) => ({
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        collectionName: this.getCollectionName(knowledgeBase.id),
      })),
    };
  }

  async getKnowledgeBaseStats(knowledgeBaseId: string, companyId?: string) {
    this.assertNonEmpty(companyId, 'companyId is required');
    this.assertOptionalString(companyId, 'companyId must be a non-empty string when provided');
    const knowledgeBase = await this.requireKnowledgeBase(knowledgeBaseId, companyId);
    const collectionName = this.getCollectionName(knowledgeBase.id);
    const documents = await this.prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId: knowledgeBase.id },
      select: { id: true, vectorIds: true, createdAt: true, updatedAt: true },
    });

    const vectorCount = documents.reduce((sum, document) => {
      return sum + this.parseVectorIds(document.vectorIds).length;
    }, 0);

    const qdrantStats = await this.safeGetCollectionStats(collectionName);

    return {
      knowledgeBase: {
        id: knowledgeBase.id,
        companyId: knowledgeBase.companyId,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        createdAt: knowledgeBase.createdAt,
        updatedAt: knowledgeBase.updatedAt,
      },
      collectionName,
      documents: documents.length,
      storedVectorIds: vectorCount,
      collection: qdrantStats,
    };
  }

  private async requireKnowledgeBase(
    knowledgeBaseId: string,
    companyId?: string,
  ): Promise<KnowledgeBase> {
    this.assertNonEmpty(knowledgeBaseId, 'knowledge base ID is required');
    this.assertNonEmpty(companyId, 'companyId is required');
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!knowledgeBase) {
      throw new NotFoundException(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    if (companyId && knowledgeBase.companyId !== companyId.trim()) {
      throw new NotFoundException(
        `Knowledge base ${knowledgeBaseId} does not belong to company ${companyId.trim()}`,
      );
    }

    return knowledgeBase;
  }

  private async loadKnowledgeDocuments(knowledgeBaseId: string, documentIds?: string[]): Promise<KnowledgeDocument[]> {
    return this.prisma.knowledgeDocument.findMany({
      where: {
        knowledgeBaseId,
        ...(documentIds && documentIds.length > 0 ? { id: { in: documentIds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async resolveSearchKnowledgeBases(body: SearchKnowledgeDto): Promise<KnowledgeBase[]> {
    const knowledgeBaseId = body.knowledgeBaseId?.trim();
    const companyId = body.companyId?.trim();

    this.assertNonEmpty(companyId, 'companyId is required');

    if (knowledgeBaseId) {
      return [await this.requireKnowledgeBase(knowledgeBaseId, companyId)];
    }

    return this.prisma.knowledgeBase.findMany({
      where: { companyId: companyId as string },
      orderBy: { createdAt: 'asc' },
    });
  }

  private buildFilter(body: SearchKnowledgeDto): Record<string, unknown> | undefined {
    const must: Array<Record<string, unknown>> = [];
    const companyId = this.optionalString(body.companyId);
    const teamId = this.optionalString(body.teamId);
    const brandId = this.optionalString(body.filters?.brandId);
    const country = this.optionalString(body.filters?.country);
    const language = this.optionalString(body.filters?.language) || this.optionalString(body.language);
    const source = this.optionalString(body.filters?.source);

    if (companyId) {
      must.push({ key: 'companyId', match: { value: companyId } });
    }
    if (teamId) {
      must.push({ key: 'teamId', match: { value: teamId } });
    }
    if (brandId) {
      must.push({ key: 'brandId', match: { value: brandId } });
    }
    if (country) {
      must.push({ key: 'country', match: { value: country } });
    }
    if (language) {
      must.push({ key: 'language', match: { value: language } });
    }
    if (source) {
      must.push({ key: 'source', match: { value: source } });
    }
    if (body.filters?.category && body.filters.category.length > 0) {
      must.push({ key: 'category', match: { any: body.filters.category } });
    }

    return must.length > 0 ? { must } : undefined;
  }

  private chunkContent(content: string, chunkSize: number, chunkOverlap: number): string[] {
    const normalized = content.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      return [];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < normalized.length) {
      const end = Math.min(normalized.length, start + chunkSize);
      const slice = normalized.slice(start, end).trim();
      if (slice) {
        chunks.push(slice);
      }
      if (end >= normalized.length) {
        break;
      }
      start = Math.max(end - chunkOverlap, start + 1);
    }

    return chunks;
  }

  private textToVector(text: string): number[] {
    const hash = createHash('sha256').update(text).digest();
    const vector = new Array<number>(this.vectorSize);

    for (let index = 0; index < this.vectorSize; index += 1) {
      vector[index] = hash[index % hash.length] / 255;
    }

    return vector;
  }

  private getCollectionName(knowledgeBaseId: string): string {
    return `knowledge-base-${knowledgeBaseId}`;
  }

  private normalizeMetadata(metadata: Record<string, unknown> | undefined, companyId: string): KnowledgeMetadata {
    return {
      ...(metadata || {}),
      companyId,
    };
  }

  private parseMetadata(metadata: string | null, companyId: string): KnowledgeMetadata {
    if (!metadata) {
      return { companyId };
    }

    try {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...(parsed as KnowledgeMetadata), companyId };
      }
    } catch {
      return { companyId };
    }

    return { companyId };
  }

  private parseVectorIds(vectorIds: string | null): string[] {
    if (!vectorIds) {
      return [];
    }

    return vectorIds
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private mergeVectorIds(existingIds: string[], ingestedIds: string[]): string[] {
    return Array.from(new Set([...existingIds, ...ingestedIds]));
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private getChunkPointId(documentId: string, chunkIndex: number): string {
    const digest = createHash('sha256')
      .update(`${documentId}:chunk:${chunkIndex + 1}`)
      .digest('hex')
      .slice(0, 32);

    return `kbdoc-${digest}`;
  }

  private normalizeChunkSize(chunkSize?: number): number {
    if (typeof chunkSize !== 'number' || !Number.isFinite(chunkSize)) {
      return 900;
    }
    return Math.min(4000, Math.max(200, Math.floor(chunkSize)));
  }

  private normalizeChunkOverlap(chunkOverlap: number | undefined, chunkSize: number): number {
    if (typeof chunkOverlap !== 'number' || !Number.isFinite(chunkOverlap)) {
      return Math.min(120, Math.floor(chunkSize / 4));
    }
    return Math.max(0, Math.min(Math.floor(chunkOverlap), Math.floor(chunkSize / 2)));
  }

  private normalizeLimit(limit?: number): number {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
      return 5;
    }
    return Math.min(20, Math.max(1, Math.floor(limit)));
  }

  private assertNonEmpty(value: string | undefined, message: string): void {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(message);
    }
  }

  private assertBody<T>(value: T | null | undefined, message: string): asserts value is T {
    if (value == null) {
      throw new BadRequestException(message);
    }
  }

  private assertOptionalString(value: unknown, message: string): void {
    if (typeof value === 'undefined') {
      return;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(message);
    }
  }

  private assertOptionalStringArray(value: unknown, message: string): void {
    if (typeof value === 'undefined') {
      return;
    }

    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
      throw new BadRequestException(message);
    }
  }

  private assertOptionalNumber(value: unknown, message: string): void {
    if (typeof value === 'undefined') {
      return;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(message);
    }
  }

  private assertOptionalPlainObject(value: unknown, message: string): void {
    if (typeof value === 'undefined') {
      return;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(message);
    }
  }

  private async ensureCollection(collectionName: string): Promise<void> {
    const exists = await this.collectionExists(collectionName);
    if (exists) {
      return;
    }

    await this.qdrant.createCollection(collectionName, {
      vectors: {
        size: this.vectorSize,
        distance: 'Cosine',
      },
    });
  }

  private async collectionExists(collectionName: string): Promise<boolean> {
    try {
      await this.qdrant.getCollection(collectionName);
      return true;
    } catch {
      return false;
    }
  }

  private async safeGetCollectionStats(collectionName: string) {
    try {
      const collection = await this.qdrant.getCollection(collectionName);
      const details = collection as Record<string, any>;
      return {
        exists: true,
        pointsCount: Number(details.points_count || details.points || 0),
        indexedVectorsCount: Number(details.indexed_vectors_count || 0),
        status: String(details.status || 'green'),
        vectorSize: Number(details.config?.params?.vectors?.size || this.vectorSize),
        distance: String(details.config?.params?.vectors?.distance || 'Cosine'),
      };
    } catch {
      return {
        exists: false,
        pointsCount: 0,
        indexedVectorsCount: 0,
        status: 'missing',
        vectorSize: this.vectorSize,
        distance: 'Cosine',
      };
    }
  }
}
