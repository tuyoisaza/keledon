import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QdrantClient } from '@qdrant/qdrant-js';
import { PrismaService } from '../prisma/prisma.service';

function emptyEndedOrphanSessionWhere() {
  return {
    userId: null,
    teamId: null,
    status: 'ended',
    metadata: null,
    events: { none: {} },
    flowRuns: { none: {} },
    subAgents: { none: {} },
  };
}

@Injectable()
export class CrudSessionDataService {
  private readonly qdrant: QdrantClient;

  constructor(private readonly prisma: PrismaService) {
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
      apiKey: process.env.QDRANT_API_KEY || undefined,
    });
  }

  async getSessions(companyId?: string, limit = 100) {
    const teams = companyId
      ? await this.prisma.team.findMany({
          where: { brand: { companyId } },
          select: { id: true },
        })
      : null;

    return this.prisma.session.findMany({
      where: companyId
        ? { teamId: { in: teams?.map((team) => team.id) } }
        : undefined,
      include: {
        user: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getSession(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createSession(data: {
    userId?: string;
    teamId?: string;
    status?: string;
    metadata?: string;
  }) {
    return this.prisma.session.create({ data });
  }

  async updateSession(
    id: string,
    data: { status?: string; metadata?: string },
  ) {
    return this.prisma.session.update({ where: { id }, data });
  }

  async deleteOrphanedSessions(): Promise<{ deleted: number }> {
    const result = await this.prisma.session.deleteMany({
      where: emptyEndedOrphanSessionWhere(),
    });
    return { deleted: result.count };
  }

  async getOrphanedSessionCount(): Promise<number> {
    return this.prisma.session.count({
      where: emptyEndedOrphanSessionWhere(),
    });
  }

  async getKnowledgeBases(companyId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { companyId },
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getKnowledgeBase(id: string, companyId?: string) {
    const knowledgeBase = await this.prisma.knowledgeBase.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
      include: { _count: { select: { documents: true } } },
    });
    if (!knowledgeBase) throw new NotFoundException('Knowledge base not found');
    return knowledgeBase;
  }

  async createKnowledgeBase(data: {
    companyId: string;
    name: string;
    description?: string;
  }) {
    return this.prisma.knowledgeBase.create({ data });
  }

  async updateKnowledgeBase(
    id: string,
    data: { name?: string; description?: string | null },
    companyId?: string,
  ) {
    const updateData: { name?: string; description?: string | null } = {};
    if (data.name !== undefined) {
      if (
        typeof data.name !== 'string' ||
        !data.name.trim() ||
        data.name.trim().length > 200
      )
        throw new BadRequestException(
          'Knowledge base name must be 1–200 characters',
        );
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      if (data.description !== null && typeof data.description !== 'string')
        throw new BadRequestException(
          'Knowledge base description must be text',
        );
      if (
        typeof data.description === 'string' &&
        data.description.length > 4000
      )
        throw new BadRequestException('Knowledge base description is too long');
      updateData.description = data.description?.trim() || null;
    }
    if (Object.keys(updateData).length === 0)
      throw new BadRequestException(
        'At least one knowledge base field is required',
      );

    const existing = await this.prisma.knowledgeBase.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Knowledge base not found');
    return this.prisma.knowledgeBase.update({
      where: { id: existing.id },
      data: updateData,
      include: { _count: { select: { documents: true } } },
    });
  }

  async deleteKnowledgeBase(id: string) {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id },
      select: { id: true },
    });
    if (knowledgeBase) {
      const collectionName = this.getKnowledgeCollectionName(knowledgeBase.id);
      const { exists } = await this.qdrant.collectionExists(collectionName);
      if (exists) await this.qdrant.deleteCollection(collectionName);
    }
    return this.prisma.knowledgeBase.delete({ where: { id } });
  }

  async getKnowledgeDocuments(knowledgeBaseId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createKnowledgeDocument(data: {
    knowledgeBaseId: string;
    title: string;
    content: string;
    metadata?: string;
  }) {
    return this.prisma.knowledgeDocument.create({ data });
  }

  async deleteKnowledgeDocument(id: string) {
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
      select: { id: true, knowledgeBaseId: true },
    });
    if (document) {
      const collectionName = this.getKnowledgeCollectionName(
        document.knowledgeBaseId,
      );
      const { exists } = await this.qdrant.collectionExists(collectionName);
      if (exists) {
        await this.qdrant.delete(collectionName, {
          filter: {
            must: [{ key: 'documentId', match: { value: document.id } }],
          },
          wait: true,
        });
      }
    }
    return this.prisma.knowledgeDocument.delete({ where: { id } });
  }

  private getKnowledgeCollectionName(knowledgeBaseId: string): string {
    return `knowledge-base-${knowledgeBaseId}`;
  }
}
