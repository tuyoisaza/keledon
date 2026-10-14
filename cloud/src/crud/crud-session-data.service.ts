import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/qdrant-js';
import { PrismaService } from '../prisma/prisma.service';

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
      where: { OR: [{ userId: null }, { teamId: null }] },
    });
    return { deleted: result.count };
  }

  async getOrphanedSessionCount(): Promise<number> {
    return this.prisma.session.count({
      where: { OR: [{ userId: null }, { teamId: null }] },
    });
  }

  async getKnowledgeBases(companyId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { companyId },
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createKnowledgeBase(data: {
    companyId: string;
    name: string;
    description?: string;
  }) {
    return this.prisma.knowledgeBase.create({ data });
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
