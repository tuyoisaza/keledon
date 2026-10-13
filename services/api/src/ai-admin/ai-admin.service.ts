import { createHash } from 'crypto';
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AI_DEFAULTS, AI_FEATURES, AiFeature } from './ai-prompt.defaults';
import { compileManagedSchema } from './ai-schema';

export interface PreparedAiPrompt {
  id: AiFeature;
  name: string;
  personalityPrompt: string;
  executionPrompt: string;
  outputSchemaJson: unknown;
  enabled: boolean;
  revision: number;
}
export interface AiUsageInput {
  prepared: PreparedAiPrompt;
  feature: AiFeature;
  teamId?: string;
  provider: string;
  requestedModel: string;
  responseModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  errorCode?: string;
}
const mutable = [
  'name',
  'personalityPrompt',
  'executionPrompt',
  'outputSchemaJson',
  'enabled',
] as const;
@Injectable()
export class AiAdminService {
  private bootstrap?: Promise<void>;
  constructor(private readonly prisma: PrismaService) {}
  // Generated Prisma client is refreshed by local codegen after the additive schema change.
  private get db(): any {
    return this.prisma;
  }

  async requireSuperadmin(userId?: string): Promise<string> {
    if (!userId)
      throw new ForbiddenException('AI administration access denied');
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!actor || actor.role !== 'superadmin')
      throw new ForbiddenException('AI administration access denied');
    return actor.id;
  }
  private async ensureDefaults() {
    if (this.bootstrap === undefined)
      this.bootstrap = (async () => {
        for (const definition of AI_DEFAULTS) {
          compileManagedSchema(definition.outputSchemaJson);
          await this.db.aiPromptDefinition.upsert({
            where: { id: definition.id },
            update: {},
            create: {
              ...definition,
              enabled: true,
              revision: 1,
              updatedBy: 'system:bootstrap',
              revisions: {
                create: {
                  fromRevision: 0,
                  toRevision: 1,
                  actorId: 'system:bootstrap',
                  changedFields: [...mutable],
                },
              },
            },
          });
        }
      })();
    try {
      await this.bootstrap;
    } catch {
      this.bootstrap = undefined;
      throw new ServiceUnavailableException(
        'Managed AI storage unavailable; reviewed migration is required',
      );
    }
  }
  private assertFeature(id: string): asserts id is AiFeature {
    if (!AI_FEATURES.includes(id as AiFeature))
      throw new NotFoundException('AI definition not found');
  }
  async listPrompts(actorId: string) {
    await this.requireSuperadmin(actorId);
    await this.ensureDefaults();
    return this.db.aiPromptDefinition.findMany({ orderBy: { id: 'asc' } });
  }
  async getPrompt(actorId: string, id: string) {
    await this.requireSuperadmin(actorId);
    this.assertFeature(id);
    await this.ensureDefaults();
    const record = await this.db.aiPromptDefinition.findUnique({
      where: { id },
      include: { revisions: { orderBy: { toRevision: 'desc' }, take: 50 } },
    });
    if (!record) throw new NotFoundException('AI definition not found');
    return record;
  }
  async updatePrompt(actorId: string, id: string, body: unknown) {
    await this.requireSuperadmin(actorId);
    this.assertFeature(id);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Invalid definition update');
    const data = body as Record<string, unknown>;
    if (
      Object.keys(data).some(
        (key) => key !== 'expectedRevision' && !mutable.includes(key as any),
      ) ||
      !Number.isInteger(data.expectedRevision) ||
      Number(data.expectedRevision) < 1
    )
      throw new BadRequestException(
        'Expected revision and allowed fields are required',
      );
    for (const key of ['name', 'personalityPrompt', 'executionPrompt']) {
      if (
        data[key] !== undefined &&
        (typeof data[key] !== 'string' ||
          !data[key].trim() ||
          data[key].length > (key === 'name' ? 120 : 16000))
      )
        throw new BadRequestException('Invalid definition field');
    }
    if (data.enabled !== undefined && typeof data.enabled !== 'boolean')
      throw new BadRequestException('Invalid enabled state');
    if (data.outputSchemaJson !== undefined)
      compileManagedSchema(data.outputSchemaJson);
    await this.ensureDefaults();
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.aiPromptDefinition.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('AI definition not found');
      if (current.revision !== data.expectedRevision)
        throw new ConflictException('Definition changed; reload before saving');
      const changes = Object.fromEntries(
        mutable
          .filter(
            (key) =>
              data[key] !== undefined &&
              JSON.stringify(data[key]) !== JSON.stringify(current[key]),
          )
          .map((key) => [key, data[key]]),
      );
      if (!Object.keys(changes).length) return current;
      const updated = await tx.aiPromptDefinition.updateMany({
        where: { id, revision: current.revision },
        data: { ...changes, revision: { increment: 1 }, updatedBy: actorId },
      });
      if (updated.count !== 1)
        throw new ConflictException('Definition changed; reload before saving');
      await tx.aiPromptRevision.create({
        data: {
          promptId: id,
          fromRevision: current.revision,
          toRevision: current.revision + 1,
          actorId,
          changedFields: Object.keys(changes).map((field) => ({
            field,
            beforeSha256: createHash('sha256')
              .update(JSON.stringify(current[field]) ?? 'null')
              .digest('hex'),
            afterSha256: createHash('sha256')
              .update(JSON.stringify(changes[field]) ?? 'null')
              .digest('hex'),
          })),
        },
      });
      return tx.aiPromptDefinition.findUnique({ where: { id } });
    });
  }
  async prepare(
    feature: AiFeature,
    _context?: { teamId?: string },
  ): Promise<PreparedAiPrompt> {
    this.assertFeature(feature);
    await this.ensureDefaults();
    const record = await this.db.aiPromptDefinition.findUnique({
      where: { id: feature },
    });
    if (!record || !record.enabled)
      throw new ForbiddenException('AI workflow is disabled');
    compileManagedSchema(record.outputSchemaJson);
    return record;
  }
  validateOutput(prepared: PreparedAiPrompt, output: unknown): unknown {
    let serialized: string;
    try {
      serialized = JSON.stringify(output);
    } catch {
      throw new BadRequestException('Invalid AI output');
    }
    if (
      !serialized ||
      serialized.length > 131072 ||
      !compileManagedSchema(prepared.outputSchemaJson)(output)
    )
      throw new BadRequestException(
        'AI output does not match its managed schema',
      );
    return output;
  }
  async recordUsage(input: AiUsageInput): Promise<void> {
    this.assertFeature(input.feature);
    if (input.prepared.id !== input.feature)
      throw new BadRequestException('AI usage definition mismatch');
    if (
      input.errorCode !== undefined &&
      !/^[A-Z0-9_]{1,64}$/.test(input.errorCode)
    )
      throw new BadRequestException('AI errors must use safe codes');
    const counter = (value: unknown) =>
      Number.isInteger(value) &&
      Number(value) >= 0 &&
      Number(value) <= 2147483647;
    if (
      !counter(input.latencyMs) ||
      [input.inputTokens, input.outputTokens].some(
        (value) => value !== undefined && !counter(value),
      )
    )
      throw new BadRequestException('Invalid measured AI usage');
    for (const value of [
      input.provider,
      input.requestedModel,
      input.responseModel,
      input.errorCode,
      input.teamId,
    ]) {
      if (
        value !== undefined &&
        (typeof value !== 'string' || value.length > 200)
      )
        throw new BadRequestException('Invalid AI usage metadata');
    }
    // No input/output payloads or secrets persisted; no guessed provider pricing.
    await this.db.aiCallUsage.create({
      data: {
        promptId: input.prepared.id,
        promptRevision: input.prepared.revision,
        feature: input.feature,
        teamId: input.teamId || null,
        provider: input.provider,
        requestedModel: input.requestedModel,
        responseModel: input.responseModel || null,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        latencyMs: input.latencyMs,
        costUsd: null,
        pricingMetadata: { status: 'unavailable', source: 'not-configured' },
        errorCode: input.errorCode || null,
      },
    });
  }
  async consumption(actorId: string, rawLimit?: string) {
    await this.requireSuperadmin(actorId);
    const limit = rawLimit === undefined ? 100 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new BadRequestException('Limit must be between 1 and 200');
    await this.ensureDefaults();
    const items = await this.db.aiCallUsage.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const total = (field: string) =>
      items.length &&
      items.every((item: any) => typeof item[field] === 'number')
        ? items.reduce((sum: number, item: any) => sum + item[field], 0)
        : null;
    return {
      items,
      totals: {
        calls: items.length,
        inputTokens: total('inputTokens'),
        outputTokens: total('outputTokens'),
        costUsd: total('costUsd'),
      },
      pricingStatus: 'unavailable',
      window: { latestRecords: limit },
    };
  }
}
