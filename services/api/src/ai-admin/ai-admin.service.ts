import { validateInputSchema, validateManagedInput, validateManagedOutput } from './ai-input-schema';
import { recordAiUsage, aiConsumption } from './ai-usage';
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
  inputSchemaJson: unknown;
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
  'purpose',
  'owningFeature',
  'callsite',
  'inputSchemaJson',
  'outputDestination',
  'nextHops',
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
  private promptAdminSelect() {
    return {
      id: true,
      name: true,
      personalityPrompt: true,
      executionPrompt: true,
      outputSchemaJson: true,
      enabled: true,
      purpose: true,
      owningFeature: true,
      callsite: true,
      inputSchemaJson: true,
      outputDestination: true,
      nextHops: true,
      revision: true,
      publishedRevision: true,
      updatedBy: true,
      createdAt: true,
      updatedAt: true,
      revisions: {
        orderBy: { toRevision: 'desc' as const },
        take: 50,
        select: {
          toRevision: true,
          changedFields: true,
          publishedAt: true,
          publishedBy: true,
        },
      },
    };
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
              publishedRevision: 1,
              publishedDefinition: {
                ...definition,
                enabled: true,
                revision: 1,
              },
              updatedBy: 'system:bootstrap',
              revisions: {
                create: {
                  fromRevision: 0,
                  toRevision: 1,
                  actorId: 'system:bootstrap',
                  publishedAt: new Date(),
                  publishedBy: 'system:bootstrap',
                  changedFields: [...mutable],
                  definitionSnapshot: {
                    ...definition,
                    enabled: true,
                    revision: 1,
                  },
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
    return this.db.aiPromptDefinition.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        purpose: true,
        owningFeature: true,
        callsite: true,
        enabled: true,
        outputDestination: true,
        nextHops: true,
        revision: true,
        publishedRevision: true,
        updatedAt: true,
      },
    });
  }
  async getPrompt(actorId: string, id: string) {
    await this.requireSuperadmin(actorId);
    this.assertFeature(id);
    await this.ensureDefaults();
    const record = await this.db.aiPromptDefinition.findUnique({
      where: { id },
      select: this.promptAdminSelect(),
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
    for (const key of [
      'purpose',
      'owningFeature',
      'callsite',
      'outputDestination',
    ]) {
      if (
        data[key] !== undefined &&
        (typeof data[key] !== 'string' || data[key].length > 500)
      )
        throw new BadRequestException('Invalid workflow metadata');
    }
    if (data.inputSchemaJson !== undefined) {
      validateInputSchema(data.inputSchemaJson);
      if (JSON.stringify(data.inputSchemaJson).length > 32000)
        throw new BadRequestException('Invalid workflow input schema');
    }
    if (data.nextHops !== undefined) this.validateNextHops(id, data.nextHops);
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
      if (
        ['nextHops', 'inputSchemaJson', 'outputSchemaJson'].some(
          (key) => changes[key] !== undefined,
        )
      )
        await this.validateGraph(id, current, changes, tx);
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
          definitionSnapshot: {
            ...current,
            ...changes,
            revision: current.revision + 1,
            updatedBy: actorId,
          },
        },
      });
      return tx.aiPromptDefinition.findUnique({
        where: { id },
        select: this.promptAdminSelect(),
      });
    });
  }
  async rollbackPrompt(
    actorId: string,
    id: string,
    targetRevision: unknown,
    expectedRevision: unknown,
  ) {
    await this.requireSuperadmin(actorId);
    this.assertFeature(id);
    if (
      !Number.isInteger(targetRevision) ||
      Number(targetRevision) < 1 ||
      !Number.isInteger(expectedRevision) ||
      Number(expectedRevision) < 1
    )
      throw new BadRequestException('Invalid rollback revision');
    await this.ensureDefaults();
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.aiPromptDefinition.findUnique({ where: { id } });
      if (!current || current.revision !== expectedRevision)
        throw new ConflictException(
          'Definition changed; reload before rollback',
        );
      const target = await tx.aiPromptRevision.findFirst({
        where: { promptId: id, toRevision: targetRevision },
        select: { definitionSnapshot: true },
      });
      const snapshot = target?.definitionSnapshot as Record<
        string,
        unknown
      > | null;
      if (!snapshot)
        throw new BadRequestException(
          'This historical revision has no restorable snapshot',
        );
      compileManagedSchema(snapshot.outputSchemaJson);
      const restored = Object.fromEntries(
        mutable.map((key) => [key, snapshot[key]]),
      );
      const nextRevision = current.revision + 1;
      const result = await tx.aiPromptDefinition.updateMany({
        where: { id, revision: current.revision },
        data: { ...restored, revision: { increment: 1 }, updatedBy: actorId },
      });
      if (result.count !== 1)
        throw new ConflictException(
          'Definition changed; reload before rollback',
        );
      await tx.aiPromptRevision.create({
        data: {
          promptId: id,
          fromRevision: current.revision,
          toRevision: nextRevision,
          actorId,
          changedFields: mutable
            .filter(
              (key) =>
                JSON.stringify(current[key]) !== JSON.stringify(restored[key]),
            )
            .map((field) => ({ field, rollbackToRevision: targetRevision })),
          definitionSnapshot: {
            ...restored,
            id,
            revision: nextRevision,
            updatedBy: actorId,
          },
        },
      });
      return tx.aiPromptDefinition.findUnique({
        where: { id },
        select: this.promptAdminSelect(),
      });
    });
  }
  async publishPrompt(actorId: string, id: string, expectedRevision: unknown) {
    const actor = await this.requireSuperadmin(actorId);
    this.assertFeature(id);
    if (!Number.isInteger(expectedRevision) || Number(expectedRevision) < 1)
      throw new BadRequestException('Invalid publish revision');
    await this.ensureDefaults();
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.aiPromptDefinition.findUnique({
        where: { id },
      });
      if (!current || current.revision !== expectedRevision)
        throw new ConflictException(
          'Definition changed; reload before publishing',
        );
      if (current.publishedRevision === current.revision) return current;
      validateInputSchema(current.inputSchemaJson);
      compileManagedSchema(current.outputSchemaJson);
      await this.validateGraph(id, current, {}, tx);
      const publishedAt = new Date();
      const snapshot = Object.fromEntries(
        mutable.map((key) => [key, current[key]]),
      );
      const updated = await tx.aiPromptDefinition.updateMany({
        where: { id, revision: current.revision },
        data: {
          publishedRevision: current.revision,
          publishedDefinition: {
            ...snapshot,
            id,
            revision: current.revision,
            updatedBy: current.updatedBy,
          },
        },
      });
      if (updated.count !== 1)
        throw new ConflictException(
          'Definition changed; reload before publishing',
        );
      const marked = await tx.aiPromptRevision.updateMany({
        where: {
          promptId: id,
          toRevision: current.revision,
          publishedAt: null,
        },
        data: { publishedAt, publishedBy: actor },
      });
      if (marked.count !== 1)
        throw new ConflictException(
          'Revision history changed; reload before publishing',
        );
      return tx.aiPromptDefinition.findUnique({
        where: { id },
        select: this.promptAdminSelect(),
      });
    });
  }
  private validateNextHops(
    id: string,
    value: unknown,
  ): asserts value is Array<{
    agentId: string;
    inputMapping?: unknown;
    condition?: string;
    maxHops?: number;
  }> {
    if (!Array.isArray(value) || value.length > AI_FEATURES.length)
      throw new BadRequestException('Invalid workflow graph edges');
    for (const edge of value) {
      if (!edge || typeof edge !== 'object' || Array.isArray(edge))
        throw new BadRequestException('Invalid workflow graph edge');
      const item = edge as Record<string, unknown>;
      if (
        typeof item.agentId !== 'string' ||
        !AI_FEATURES.includes(item.agentId as AiFeature) ||
        item.agentId === id ||
        (item.condition !== undefined &&
          (typeof item.condition !== 'string' ||
            item.condition.length > 500)) ||
        (item.maxHops !== undefined &&
          (!Number.isInteger(item.maxHops) ||
            Number(item.maxHops) < 1 ||
            Number(item.maxHops) > 5)) ||
        (item.inputMapping !== undefined &&
          (!item.inputMapping ||
            typeof item.inputMapping !== 'object' ||
            Array.isArray(item.inputMapping)))
      )
        throw new BadRequestException('Invalid workflow graph edge');
    }
  }
  private async validateGraph(
    id: string,
    current: any,
    changes: Record<string, unknown>,
    tx: any,
  ) {
    const rows = await tx.aiPromptDefinition.findMany({
      select: {
        id: true,
        nextHops: true,
        inputSchemaJson: true,
        outputSchemaJson: true,
      },
    });
    const definitions = new Map<string, any>(
      rows.map((row: any) => [row.id, row]),
    );
    definitions.set(id, { ...current, ...changes });
    const graph = new Map<string, string[]>(
      [...definitions].map(([key, row]) => [
        key,
        Array.isArray(row.nextHops)
          ? row.nextHops.map((edge: any) => edge.agentId)
          : [],
      ]),
    );
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (node: string): boolean => {
      if (visiting.has(node)) return false;
      if (visited.has(node)) return true;
      visiting.add(node);
      for (const next of graph.get(node) ?? []) if (!visit(next)) return false;
      visiting.delete(node);
      visited.add(node);
      return true;
    };
    for (const node of graph.keys())
      if (!visit(node))
        throw new BadRequestException('Workflow graph must be acyclic');
    for (const [sourceId, source] of definitions) {
      const sourceSchema = source.outputSchemaJson as Record<string, any>;
      const sourceProperties = sourceSchema?.properties;
      for (const edge of Array.isArray(source.nextHops)
        ? source.nextHops
        : []) {
        const target = definitions.get(edge.agentId);
        const targetSchema = target?.inputSchemaJson as Record<string, any>;
        const targetProperties = targetSchema?.properties;
        const mapping = edge.inputMapping;
        if (
          !target ||
          !sourceProperties ||
          !targetProperties ||
          !mapping ||
          typeof mapping !== 'object' ||
          Array.isArray(mapping)
        )
          throw new BadRequestException(
            'Workflow edge requires a registered target and field mapping',
          );
        const mappedFields = Object.keys(mapping);
        if (
          mappedFields.some((name) => !Object.hasOwn(targetProperties, name)) ||
          new Set(mappedFields).size !== mappedFields.length
        )
          throw new BadRequestException(
            'Workflow edge maps to an unknown target input',
          );
        const requiredFields = Array.isArray(targetSchema.required)
          ? targetSchema.required
          : [];
        if (
          requiredFields.some((name: string) => !Object.hasOwn(mapping, name))
        )
          throw new BadRequestException(
            'Workflow edge does not map every required target input',
          );
        for (const [targetName, rawPath] of Object.entries(mapping)) {
          if (
            typeof rawPath !== 'string' ||
            !/^\$\.[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(rawPath)
          )
            throw new BadRequestException(
              'Workflow field mapping must use a direct output field path',
            );
          const sourceName = rawPath.slice(2);
          const from = sourceProperties[sourceName];
          const to = targetProperties[targetName];
          if (!from || !to || from.type !== to.type)
            throw new BadRequestException(
              `Workflow field type mismatch on ${sourceId} → ${edge.agentId}`,
            );
        }
      }
    }
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
    if (!record) {
      throw new ForbiddenException('AI workflow is unavailable');
    }
    let active = record;
    if (record.publishedRevision !== record.revision) {
      const published = record.publishedDefinition as Record<
        string,
        unknown
      > | null;
      if (
        !published ||
        published.revision !== record.publishedRevision ||
        published.id !== feature
      )
        throw new ServiceUnavailableException(
          'Published AI workflow snapshot unavailable',
        );
      active = published;
    }
    if (!active.enabled)
      throw new ForbiddenException('AI workflow is disabled');
    validateInputSchema(active.inputSchemaJson);
    compileManagedSchema(active.outputSchemaJson);
    return active;
  }
  validateOutput(prepared: PreparedAiPrompt, output: unknown): unknown { return validateManagedOutput(prepared,output); }
  validateInput(prepared: PreparedAiPrompt, input: unknown): unknown { return validateManagedInput(prepared,input); }
  async recordUsage(input: AiUsageInput): Promise<void> { this.assertFeature(input.feature); return recordAiUsage(this.db,input); }
  async consumption(actorId: string, rawLimit?: string) { await this.requireSuperadmin(actorId); await this.ensureDefaults(); return aiConsumption(this.db,rawLimit); }

}
