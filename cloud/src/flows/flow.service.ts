import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type FlowWithSteps = Prisma.FlowGetPayload<{ include: { steps: true } }>;

export type FlowStepInput = {
  order: number;
  type: string;
  selector?: string;
  selectorType?: string;
  value?: string;
  extract?: string;
  waitFor?: string;
  condition?: string;
  timeout?: number;
  optional?: boolean;
  nextStepId?: string;
};

export type FlowCreateInput = {
  name: string;
  description?: string;
  triggerKeywords?: string[];
  category?: string;
  tool?: string;
  teamId?: string;
  createdBy?: string;
  steps?: FlowStepInput[];
};

export type FlowUpdateInput = Omit<
  Partial<FlowCreateInput>,
  'teamId' | 'createdBy'
> & {
  isActive?: boolean;
};

export type FlowStepUpdateInput = Partial<FlowStepInput>;

type QdrantResult = {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeQdrantResults(value: unknown): QdrantResult[] {
  if (!isRecord(value) || !Array.isArray(value.result)) return [];
  return value.result.flatMap((entry): QdrantResult[] => {
    if (!isRecord(entry)) return [];
    const id = entry.id;
    const score = entry.score;
    if (
      (typeof id !== 'string' && typeof id !== 'number') ||
      typeof score !== 'number' ||
      !Number.isFinite(score)
    )
      return [];
    return [
      {
        id,
        score,
        ...(isRecord(entry.payload) ? { payload: entry.payload } : {}),
      },
    ];
  });
}

@Injectable()
export class FlowService {
  private readonly qdrantUrl =
    process.env.QDRANT_URL || 'http://127.0.0.1:6333';
  private readonly collectionName = 'keledon-flows';
  private readonly vectorSize = 768;

  constructor(private readonly prisma: PrismaService) {}

  private deterministicHash(text: string): number[] {
    const hash = createHash('sha256').update(text).digest();
    const vector = new Array<number>(this.vectorSize).fill(0);
    for (let i = 0; i < Math.min(hash.length, this.vectorSize); i++) {
      vector[i] = (hash[i] / 255) * 2 - 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm === 0 ? vector : vector.map((v) => v / norm);
  }

  private async ensureCollection(): Promise<void> {
    const url = `${this.qdrantUrl}/collections/${this.collectionName}`;
    const response = await fetch(url);
    if (response.ok) return;
    if (response.status !== 404) {
      throw new Error('Vector collection check failed');
    }
    const createResponse = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: { size: this.vectorSize, distance: 'Cosine' },
      }),
    });
    if (!createResponse.ok) throw new Error('Vector collection setup failed');
  }

  private async indexFlow(flow: FlowWithSteps): Promise<void> {
    if (!flow.teamId) return;
    await this.ensureCollection();
    const keywords = this.parseKeywords(flow.triggerKeywords);
    const text = `${flow.name} ${flow.description || ''} ${keywords.join(' ')} ${flow.category}`;
    const response = await fetch(
      `${this.qdrantUrl}/collections/${this.collectionName}/points`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [
            {
              id: flow.id,
              vector: this.deterministicHash(text),
              payload: {
                id: flow.id,
                name: flow.name,
                description: flow.description,
                triggerKeywords: keywords,
                category: flow.category,
                tool: flow.tool,
                teamId: flow.teamId,
                isActive: flow.isActive,
                stepCount: flow.steps.length,
              },
            },
          ],
        }),
      },
    );
    if (!response.ok) throw new Error('Flow indexing failed');
  }

  private parseKeywords(value: string): string[] {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private mapSteps(
    steps: FlowStepInput[],
  ): Prisma.FlowStepCreateWithoutFlowInput[] {
    return steps.map((step, index) => ({
      order: step.order ?? index,
      type: step.type,
      selector: step.selector,
      selectorType: step.selectorType || 'css',
      value: step.value,
      extract: step.extract,
      waitFor: step.waitFor,
      condition: step.condition,
      timeout: step.timeout ?? 10000,
      optional: step.optional ?? false,
      nextStepId: step.nextStepId,
    }));
  }

  async searchFlows(
    query: string,
    teamId?: string,
    limit = 5,
  ): Promise<QdrantResult[]> {
    if (!teamId || !query.trim()) return [];
    const boundedLimit = Number.isFinite(limit)
      ? Math.min(50, Math.max(1, Math.floor(limit)))
      : 5;
    await this.ensureCollection();
    const response = await fetch(
      `${this.qdrantUrl}/collections/${this.collectionName}/points/search`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: this.deterministicHash(query.trim()),
          limit: boundedLimit,
          score_threshold: 0.3,
          filter: {
            must: [
              { key: 'teamId', match: { value: teamId } },
              { key: 'isActive', match: { value: true } },
            ],
          },
          with_payload: true,
        }),
      },
    );
    if (!response.ok) throw new Error('Flow search failed');
    const data: unknown = await response.json();
    return safeQdrantResults(data);
  }

  async create(data: FlowCreateInput): Promise<FlowWithSteps> {
    if (!data.teamId) throw new BadRequestException('Team is required');
    const flow = await this.prisma.flow.create({
      data: {
        name: data.name,
        description: data.description,
        triggerKeywords: JSON.stringify(data.triggerKeywords || []),
        category: data.category || 'general',
        tool: data.tool || 'browser',
        teamId: data.teamId,
        createdBy: data.createdBy,
        steps: data.steps ? { create: this.mapSteps(data.steps) } : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    void this.indexFlow(flow).catch(() => undefined);
    return flow;
  }

  async findAll(teamId?: string, category?: string): Promise<FlowWithSteps[]> {
    if (!teamId) return [];
    return this.prisma.flow.findMany({
      where: { teamId, ...(category ? { category } : {}) },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<FlowWithSteps | null> {
    return this.prisma.flow.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async findByTrigger(
    keyword: string,
    teamId?: string,
  ): Promise<QdrantResult[]> {
    return this.searchFlows(keyword, teamId, 10);
  }

  async update(id: string, data: FlowUpdateInput): Promise<FlowWithSteps> {
    const existing = await this.prisma.flow.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!existing) throw new NotFoundException('Flow not found');

    const flow = await this.prisma.flow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerKeywords: data.triggerKeywords
          ? JSON.stringify(data.triggerKeywords)
          : undefined,
        category: data.category,
        tool: data.tool,
        isActive: data.isActive,
        version: existing.version + 1,
        steps: data.steps
          ? {
              deleteMany: { flowId: id },
              create: this.mapSteps(data.steps),
            }
          : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    void this.indexFlow(flow).catch(() => undefined);
    return flow;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.flow.delete({ where: { id } });
    try {
      const response = await fetch(
        `${this.qdrantUrl}/collections/${this.collectionName}/points/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: [id] }),
        },
      );
      if (!response.ok) return;
    } catch {
      // Database deletion is authoritative; vector cleanup can be retried.
    }
  }

  async getSteps(flowId: string): Promise<Prisma.FlowStepGetPayload<object>[]> {
    return this.prisma.flowStep.findMany({
      where: { flowId },
      orderBy: { order: 'asc' },
    });
  }

  async updateStep(
    id: string,
    data: FlowStepUpdateInput,
  ): Promise<Prisma.FlowStepGetPayload<object>> {
    return this.prisma.flowStep.update({ where: { id }, data });
  }

  async createStep(
    flowId: string,
    data: FlowStepInput,
  ): Promise<Prisma.FlowStepGetPayload<object>> {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
      select: { id: true },
    });
    if (!flow) throw new NotFoundException('Flow not found');
    return this.prisma.flowStep.create({
      data: { flowId, ...this.mapSteps([data])[0] },
    });
  }

  async deleteStep(id: string): Promise<void> {
    await this.prisma.flowStep.delete({ where: { id } });
  }

  async reorderSteps(flowId: string, stepIds: string[]): Promise<void> {
    if (
      !Array.isArray(stepIds) ||
      stepIds.some((stepId) => typeof stepId !== 'string' || !stepId.trim())
    ) {
      throw new BadRequestException('Step order does not match flow steps');
    }
    await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.flowStep.findMany({
          where: { flowId },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((step) => step.id));
        if (
          stepIds.length !== existing.length ||
          new Set(stepIds).size !== stepIds.length ||
          stepIds.some((stepId) => !existingIds.has(stepId))
        ) {
          throw new BadRequestException('Step order does not match flow steps');
        }
        await Promise.all(
          stepIds.map((stepId, index) =>
            tx.flowStep.update({
              where: { id: stepId },
              data: { order: index },
            }),
          ),
        );
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
