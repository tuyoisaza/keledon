import Ajv from 'ajv';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AI_DEFAULTS } from './ai-prompt.defaults';

const FEATURES = new Set(['brain-chat', 'decision-engine']);
const ajv = new Ajv({
  strict: true,
  strictRequired: false,
  allErrors: false,
  ownProperties: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});

export interface ManagedAiDefinition {
  id: string;
  name: string;
  personalityPrompt: string;
  executionPrompt: string;
  inputSchemaJson: unknown;
  outputSchemaJson: unknown;
  revision: number;
  publishedRevision?: number;
  publishedDefinition?: unknown;
  enabled: boolean;
}

function compileOutputSchema(schema: unknown) {
  let serialized: string;
  try {
    serialized = JSON.stringify(schema);
  } catch {
    throw new ServiceUnavailableException('Managed AI schema is unavailable');
  }
  if (
    !serialized ||
    serialized.length > 32768 ||
    !schema ||
    typeof schema !== 'object' ||
    Array.isArray(schema) ||
    (schema as Record<string, unknown>).type !== 'object'
  )
    throw new ServiceUnavailableException('Managed AI schema is invalid');

  const inspect = (value: unknown, depth: number): void => {
    if (depth > 16)
      throw new ServiceUnavailableException('Managed AI schema is too deep');
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (
        [
          '$ref',
          '$dynamicRef',
          '$recursiveRef',
          '$async',
          'pattern',
          'patternProperties',
          'format',
          'contentEncoding',
          'contentMediaType',
        ].includes(key)
      )
        throw new ServiceUnavailableException(
          'Managed AI schema uses an unsupported keyword',
        );
      inspect(child, depth + 1);
    }
  };
  inspect(schema, 0);
  try {
    return ajv.compile(schema);
  } catch {
    throw new ServiceUnavailableException('Managed AI schema is invalid');
  }
}

function validateInputSchema(value: unknown): asserts value is {
  type: 'object';
  additionalProperties: false;
  required: string[];
  properties: Record<string, { type: string; maxLength?: number }>;
} {
  const schema = value as Record<string, unknown> | null;
  if (
    !schema ||
    typeof schema !== 'object' ||
    Array.isArray(schema) ||
    schema.type !== 'object' ||
    schema.additionalProperties !== false ||
    !schema.properties ||
    typeof schema.properties !== 'object' ||
    Array.isArray(schema.properties) ||
    Object.keys(schema).some(
      (key) =>
        ![
          'type',
          'additionalProperties',
          'required',
          'properties',
          'description',
        ].includes(key),
    )
  )
    throw new ServiceUnavailableException('Managed AI input schema is invalid');

  const properties = schema.properties as Record<string, unknown>;
  const rawRequired = schema.required ?? [];
  const names = Object.keys(properties);
  if (
    !names.length ||
    names.length > 64 ||
    !Array.isArray(rawRequired) ||
    new Set<unknown>(rawRequired).size !== rawRequired.length ||
    rawRequired.some(
      (name: unknown) =>
        typeof name !== 'string' || !Object.hasOwn(properties, name),
    )
  )
    throw new ServiceUnavailableException('Managed AI input schema is invalid');

  for (const [name, rawField] of Object.entries(properties)) {
    const field =
      rawField && typeof rawField === 'object' && !Array.isArray(rawField)
        ? (rawField as Record<string, unknown>)
        : undefined;
    const maxLength = field?.maxLength;
    if (
      name !== 'context' ||
      !field ||
      Object.keys(field).some(
        (key) =>
          ![
            'type',
            'source',
            'sensitivity',
            'description',
            'maxLength',
            'minimum',
            'maximum',
            'enum',
          ].includes(key),
      ) ||
      field.type !== 'string' ||
      field.source !== 'authenticated product request' ||
      typeof field.sensitivity !== 'string' ||
      !['user-content', 'personal-data', 'secret', 'financial'].includes(
        field.sensitivity,
      ) ||
      typeof maxLength !== 'number' ||
      !Number.isInteger(maxLength) ||
      maxLength < 1 ||
      maxLength > 250000
    )
      throw new ServiceUnavailableException(
        'Managed AI input field is invalid',
      );
  }
}

@Injectable()
export class ManagedAiRuntime {
  private bootstrap?: Promise<void>;
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults(): Promise<void> {
    if (this.bootstrap === undefined)
      this.bootstrap = (async () => {
        for (const definition of AI_DEFAULTS) {
          await this.prisma.aiPromptDefinition.upsert({
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
                  changedFields: [
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
                  ],
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

  async prepare(
    feature: string,
    input: unknown,
  ): Promise<{
    definition: ManagedAiDefinition;
    input: Record<string, unknown>;
  }> {
    if (!FEATURES.has(feature))
      throw new BadRequestException('Unknown managed AI feature');

    await this.ensureDefaults();

    let definition: ManagedAiDefinition | null;
    try {
      definition = await this.prisma.aiPromptDefinition.findUnique({
        where: { id: feature },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Managed AI storage unavailable; reviewed migration is required',
      );
    }
    if (!definition)
      throw new ServiceUnavailableException('Managed AI definition is missing');
    if (
      definition.publishedRevision !== undefined &&
      definition.publishedRevision !== definition.revision
    ) {
      const published = definition.publishedDefinition;
      if (
        !published ||
        typeof published !== 'object' ||
        Array.isArray(published) ||
        (published as ManagedAiDefinition).id !== feature ||
        (published as ManagedAiDefinition).revision !==
          definition.publishedRevision
      )
        throw new ServiceUnavailableException(
          'Published AI workflow snapshot is unavailable',
        );
      definition = published as ManagedAiDefinition;
    }
    if (!definition.enabled)
      throw new ForbiddenException('Managed AI workflow is disabled');

    validateInputSchema(definition.inputSchemaJson);
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new BadRequestException(
        'AI input does not match its managed schema',
      );
    const inputSchema = definition.inputSchemaJson as {
      required: string[];
      properties: Record<string, { type: string; maxLength?: number }>;
    };
    const data = input as Record<string, unknown>;
    if (
      Object.keys(data).some(
        (key) => !Object.hasOwn(inputSchema.properties, key),
      ) ||
      inputSchema.required.some((key) => !Object.hasOwn(data, key))
    )
      throw new BadRequestException(
        'AI input does not match its managed schema',
      );
    for (const [key, value] of Object.entries(data)) {
      const field = inputSchema.properties[key];
      if (typeof value !== field.type)
        throw new BadRequestException(
          'AI input does not match its managed schema',
        );
      if (
        typeof value === 'string' &&
        value.length > (field.maxLength ?? 250000)
      )
        throw new BadRequestException(
          'AI input exceeds its managed field limit',
        );
    }
    const serialized = JSON.stringify(input);
    if (!serialized || serialized.length > 250000)
      throw new BadRequestException('AI input exceeds its managed size limit');
    compileOutputSchema(definition.outputSchemaJson);
    return { definition, input: data };
  }

  validateOutput(definition: ManagedAiDefinition, output: unknown): unknown {
    const serialized = JSON.stringify(output);
    if (
      !serialized ||
      serialized.length > 131072 ||
      !compileOutputSchema(definition.outputSchemaJson)(output)
    )
      throw new BadRequestException(
        'AI output does not match its managed schema',
      );
    return output;
  }

  async recordUsage(input: {
    definition: ManagedAiDefinition;
    feature: string;
    teamId?: string;
    provider: string;
    requestedModel: string;
    responseModel?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
    errorCode?: string;
  }): Promise<void> {
    await this.prisma.aiCallUsage.create({
      data: {
        promptId: input.definition.id,
        promptRevision: input.definition.revision,
        feature: input.feature,
        teamId: input.teamId || null,
        provider: input.provider.slice(0, 200),
        requestedModel: input.requestedModel.slice(0, 200),
        responseModel: input.responseModel?.slice(0, 200) || null,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        latencyMs: Math.max(0, Math.min(input.latencyMs, 2147483647)),
        costUsd: null,
        pricingMetadata: { status: 'unavailable', source: 'not-configured' },
        errorCode: input.errorCode || null,
      },
    });
  }
}
