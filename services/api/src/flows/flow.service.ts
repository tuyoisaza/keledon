import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class FlowService {
  private readonly qdrantUrl = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
  private readonly collectionName = 'keledon-flows';
  private readonly vectorSize = 768;

  constructor(private prisma: PrismaService) {}

  private deterministicHash(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vector = new Array(this.vectorSize).fill(0);
    for (let i = 0; i < Math.min(hash.length, this.vectorSize); i++) {
      vector[i] = (hash[i] / 255) * 2 - 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(v => v / norm);
  }

  private async ensureCollection(): Promise<void> {
    try {
      await fetch(`${this.qdrantUrl}/collections/${this.collectionName}`);
    } catch {
      await fetch(`${this.qdrantUrl}/collections/${this.collectionName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectors: { size: this.vectorSize, distance: 'Cosine' },
        }),
      });
    }
  }

  private async indexFlow(flow: any): Promise<void> {
    await this.ensureCollection();

    const text = `${flow.name} ${flow.description || ''} ${(flow.triggerKeywords || []).join(' ')} ${flow.category}`;
    const vector = this.deterministicHash(text);

    await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{
          id: flow.id,
          vector,
          payload: {
            id: flow.id,
            name: flow.name,
            description: flow.description,
            triggerKeywords: flow.triggerKeywords,
            category: flow.category,
            tool: flow.tool,
            teamId: flow.teamId,
            isActive: flow.isActive,
            stepCount: flow.steps?.length || 0,
          },
        }],
      }),
    });
  }

  async searchFlows(query: string, teamId?: string, limit = 5): Promise<any[]> {
    await this.ensureCollection();

    const queryVector = this.deterministicHash(query);

    const filter: any = { must: [] };
    if (teamId) {
      filter.must.push({ key: 'teamId', match: { value: teamId } });
    }
    filter.must.push({ key: 'isActive', match: { value: true } });

    const response = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: queryVector,
        limit,
        score_threshold: 0.3,
        filter: filter.must.length > 0 ? filter : undefined,
        with_payload: true,
      }),
    });

    const data = await response.json();
    return data.result || [];
  }

  async create(data: {
    name: string;
    description?: string;
    triggerKeywords?: string[];
    category?: string;
    tool?: string;
    teamId?: string;
    createdBy?: string;
    steps?: Array<{
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
    }>;
  }): Promise<any> {
    const flow = await this.prisma.flow.create({
      data: {
        name: data.name,
        description: data.description,
        triggerKeywords: JSON.stringify(data.triggerKeywords || []),
        category: data.category || 'general',
        tool: data.tool || 'browser',
        teamId: data.teamId,
        createdBy: data.createdBy,
        steps: data.steps ? {
          create: data.steps.map((step, index) => ({
            order: step.order ?? index,
            type: step.type,
            selector: step.selector,
            selectorType: step.selectorType || 'css',
            value: step.value,
            extract: step.extract,
            waitFor: step.waitFor,
            condition: step.condition,
            timeout: step.timeout || 10000,
            optional: step.optional || false,
            nextStepId: step.nextStepId,
          })),
        } : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    this.indexFlow(flow).catch(err => {
      console.error('[FlowService] Failed to index flow in Qdrant:', err.message);
    });
    return flow;
  }

  async findAll(teamId?: string, category?: string): Promise<any[]> {
    return this.prisma.flow.findMany({
      where: {
        ...(teamId && { teamId }),
        ...(category && { category }),
      },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<any | null> {
    return this.prisma.flow.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  async findByTrigger(keyword: string, teamId?: string): Promise<any[]> {
    return this.searchFlows(keyword, teamId, 10);
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    triggerKeywords?: string[];
    category?: string;
    tool?: string;
    isActive?: boolean;
    steps?: Array<{
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
    }>;
  }): Promise<any> {
    const existing = await this.prisma.flow.findUnique({
      where: { id },
      include: { steps: true },
    });

    if (!existing) {
      throw new Error('Flow not found');
    }

    const flow = await this.prisma.flow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerKeywords: data.triggerKeywords ? JSON.stringify(data.triggerKeywords) : undefined,
        category: data.category,
        tool: data.tool,
        isActive: data.isActive,
        version: existing.version + 1,
        steps: data.steps ? {
          deleteMany: { flowId: id },
          create: data.steps.map((step, index) => ({
            order: step.order ?? index,
            type: step.type,
            selector: step.selector,
            selectorType: step.selectorType || 'css',
            value: step.value,
            extract: step.extract,
            waitFor: step.waitFor,
            condition: step.condition,
            timeout: step.timeout || 10000,
            optional: step.optional || false,
            nextStepId: step.nextStepId,
          })),
        } : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    this.indexFlow(flow).catch(err => {
      console.error('[FlowService] Failed to index flow in Qdrant:', err.message);
    });
    return flow;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.flow.delete({ where: { id } });

    try {
      await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [id],
        }),
      });
    } catch {
      // Ignore Qdrant delete errors
    }
  }

  async getSteps(flowId: string): Promise<any[]> {
    return this.prisma.flowStep.findMany({
      where: { flowId },
      orderBy: { order: 'asc' },
    });
  }

  async updateStep(id: string, data: Partial<{
    order: number;
    type: string;
    selector: string;
    selectorType: string;
    value: string;
    extract: string;
    waitFor: string;
    condition: string;
    timeout: number;
    optional: boolean;
    nextStepId: string;
  }>): Promise<any> {
    return this.prisma.flowStep.update({
      where: { id },
      data,
    });
  }

  async createStep(flowId: string, data: {
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
  }): Promise<any> {
    return this.prisma.flowStep.create({
      data: {
        flowId,
        order: data.order,
        type: data.type,
        selector: data.selector,
        selectorType: data.selectorType || 'css',
        value: data.value,
        extract: data.extract,
        waitFor: data.waitFor,
        condition: data.condition,
        timeout: data.timeout || 10000,
        optional: data.optional || false,
        nextStepId: data.nextStepId,
      },
    });
  }

  async deleteStep(id: string): Promise<void> {
    await this.prisma.flowStep.delete({ where: { id } });
  }

  async reorderSteps(flowId: string, stepIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      stepIds.map((id, index) =>
        this.prisma.flowStep.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  }
}
