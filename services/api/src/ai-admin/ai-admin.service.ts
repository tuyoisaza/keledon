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
const INPUT_TYPES = new Set(['string', 'number', 'integer', 'boolean']);
const INPUT_SENSITIVITY = new Set([
  'public',
  'internal',
  'user-content',
  'personal-data',
  'secret',
  'financial',
]);

function validateInputSchema(
  value: unknown,
): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Invalid workflow input schema');
  const schema = value as Record<string, any>;
  const allowedSchemaKeys = new Set([
    'type',
    'additionalProperties',
    'properties',
    'required',
    'description',
  ]);
  if (
    Object.keys(schema).some((key) => !allowedSchemaKeys.has(key)) ||
    schema.type !== 'object' ||
    schema.additionalProperties !== false ||
    !schema.properties ||
    typeof schema.properties !== 'object' ||
    Array.isArray(schema.properties)
  )
    throw new BadRequestException('Invalid workflow input schema');
  const names = Object.keys(schema.properties);
  if (!names.length || names.length > 64)
    throw new BadRequestException('Invalid workflow input schema');
  const required = schema.required ?? [];
  if (
    !Array.isArray(required) ||
    new Set(required).size !== required.length ||
    required.some(
      (name: unknown) =>
        typeof name !== 'string' || !Object.hasOwn(schema.properties, name),
    )
  )
    throw new BadRequestException('Invalid workflow input schema');
  if (
    schema.description !== undefined &&
    (typeof schema.description !== 'string' || schema.description.length > 500)
  )
    throw new BadRequestException('Invalid workflow input schema');
  const allowedFieldKeys = new Set([
    'type',
    'source',
    'sensitivity',
    'description',
    'maxLength',
    'minimum',
    'maximum',
    'enum',
  ]);
  for (const [name, raw] of Object.entries(schema.properties)) {
    if (
      !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name) ||
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    )
      throw new BadRequestException('Invalid workflow input field');
    const field = raw as Record<string, any>;
    if (
      Object.keys(field).some((key) => !allowedFieldKeys.has(key)) ||
      name !== 'context' ||
      !INPUT_TYPES.has(field.type) ||
      field.source !== 'authenticated product request' ||
      !INPUT_SENSITIVITY.has(field.sensitivity) ||
      ['public', 'internal'].includes(field.sensitivity)
    )
      throw new BadRequestException('Invalid workflow input field');
    if (
      field.description !== undefined &&
      (typeof field.description !== 'string' || field.description.length > 500)
    )
      throw new BadRequestException('Invalid workflow input field');
    if (
      field.maxLength !== undefined &&
      (field.type !== 'string' ||
        !Number.isInteger(field.maxLength) ||
        field.maxLength < 1 ||
        field.maxLength > 250000)
    )
      throw new BadRequestException('Invalid workflow input field');
    if (
      field.minimum !== undefined &&
      (typeof field.minimum !== 'number' ||
        !Number.isFinite(field.minimum) ||
        !['number', 'integer'].includes(field.type))
    )
      throw new BadRequestException('Invalid workflow input field');
    if (
      field.maximum !== undefined &&
      (typeof field.maximum !== 'number' ||
        !Number.isFinite(field.maximum) ||
        !['number', 'integer'].includes(field.type))
    )
      throw new BadRequestException('Invalid workflow input field');
    if (
      field.minimum !== undefined &&
      field.maximum !== undefined &&
      field.minimum > field.maximum
    )
      throw new BadRequestException('Invalid workflow input field');
    if (field.enum !== undefined) {
      if (
        !Array.isArray(field.enum) ||
        !field.enum.length ||
        field.enum.length > 50
      )
        throw new BadRequestException('Invalid workflow input field');
      const compatible = field.enum.every((entry: unknown) => {
        if (field.type === 'integer') return Number.isInteger(entry);
        if (field.type === 'number')
          return typeof entry === 'number' && Number.isFinite(entry);
        return typeof entry === field.type;
      });
      if (!compatible)
        throw new BadRequestException('Invalid workflow input field');
    }
  }
}

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
      return tx.aiPromptDefinition.findUnique({ where: { id } });
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
      return tx.aiPromptDefinition.findUnique({ where: { id } });
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
    if (!record || !record.enabled)
      throw new ForbiddenException('AI workflow is disabled');
    validateInputSchema(record.inputSchemaJson);
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
  validateInput(prepared: PreparedAiPrompt, input: unknown): unknown {
    validateInputSchema(prepared.inputSchemaJson);
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new BadRequestException(
        'AI input does not match its managed schema',
      );
    const schema = prepared.inputSchemaJson;
    const value = input as Record<string, unknown>;
    const required = Array.isArray(schema.required) ? schema.required : [];
    if (
      Object.keys(value).some(
        (key) => !Object.hasOwn(schema.properties, key),
      ) ||
      required.some((key: string) => !Object.hasOwn(value, key))
    )
      throw new BadRequestException(
        'AI input does not match its managed schema',
      );
    for (const [key, entry] of Object.entries(value)) {
      const field = schema.properties[key] as Record<string, any>;
      const matchesType =
        field.type === 'integer'
          ? Number.isInteger(entry)
          : field.type === 'number'
            ? typeof entry === 'number' && Number.isFinite(entry)
            : typeof entry === field.type;
      if (!matchesType)
        throw new BadRequestException(
          'AI input does not match its managed schema',
        );
      if (
        typeof entry === 'string' &&
        field.maxLength !== undefined &&
        entry.length > field.maxLength
      )
        throw new BadRequestException(
          'AI input exceeds its managed field limit',
        );
      if (
        typeof entry === 'number' &&
        ((field.minimum !== undefined && entry < field.minimum) ||
          (field.maximum !== undefined && entry > field.maximum))
      )
        throw new BadRequestException(
          'AI input exceeds its managed numeric bounds',
        );
      if (field.enum !== undefined && !field.enum.includes(entry))
        throw new BadRequestException(
          'AI input is outside its managed options',
        );
    }
    return input;
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
