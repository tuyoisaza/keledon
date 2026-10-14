import { BadRequestException } from '@nestjs/common';
import type {
  FlowDefinitionInput,
  FlowVersionInput,
  FlowVersionUpdateInput,
  IntentFlowMappingInput,
  KnowledgeDocumentInput,
  ManagedInterfaceInput,
  TenantFlowPermissionInput,
} from './mvp-store.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function inputRecord(
  value: unknown,
  allowed: readonly string[],
): Record<string, unknown> {
  if (!isRecord(value)) throw new BadRequestException('Invalid request body');
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new BadRequestException('Unsupported request field');
  }
  return value;
}

function optionalStrings(
  input: Record<string, unknown>,
  fields: readonly string[],
): void {
  if (
    fields.some(
      (field) => input[field] !== undefined && typeof input[field] !== 'string',
    )
  )
    throw new BadRequestException('Invalid string field');
}

function stringArray(value: unknown, field: string): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
    throw new BadRequestException(`Invalid ${field}`);
}

function objectArray(value: unknown, field: string): void {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new BadRequestException(`Invalid ${field}`);
  }
}

function enumField(
  value: unknown,
  values: readonly string[],
  message: string,
): void {
  if (
    value !== undefined &&
    (typeof value !== 'string' || !values.includes(value))
  ) {
    throw new BadRequestException(message);
  }
}

function validateCapabilities(value: unknown): void {
  if (value === undefined) return;
  if (
    !isRecord(value) ||
    Object.values(value).some((item) => typeof item !== 'boolean')
  ) {
    throw new BadRequestException('Invalid interface capabilities');
  }
}

export function validateManagedInterfaceInput(
  value: unknown,
): ManagedInterfaceInput {
  const fields = inputRecord(value, [
    'name',
    'baseUrl',
    'base_url',
    'category',
    'providerKey',
    'capabilities',
    'status',
    'icon',
  ]);
  optionalStrings(fields, [
    'name',
    'baseUrl',
    'base_url',
    'providerKey',
    'icon',
  ]);
  enumField(fields.category, ['talk', 'case'], 'Invalid interface category');
  enumField(
    fields.status,
    ['connected', 'disconnected', 'error'],
    'Invalid interface status',
  );
  validateCapabilities(fields.capabilities);
  return value;
}

export function validateFlowDefinitionInput(
  value: unknown,
): FlowDefinitionInput {
  const fields = inputRecord(value, [
    'companyId',
    'interfaceId',
    'name',
    'description',
    'category',
    'intentTags',
  ]);
  optionalStrings(fields, ['companyId', 'interfaceId', 'name', 'description']);
  enumField(fields.category, ['talk', 'case'], 'Invalid flow category');
  if (fields.intentTags !== undefined)
    stringArray(fields.intentTags, 'intentTags');
  return value;
}

export function validateFlowVersionInput(value: unknown): FlowVersionInput {
  const fields = inputRecord(value, [
    'flowDefinitionId',
    'version',
    'status',
    'steps',
  ]);
  optionalStrings(fields, ['flowDefinitionId']);
  if (
    typeof fields.flowDefinitionId !== 'string' ||
    fields.flowDefinitionId.trim().length === 0
  )
    throw new BadRequestException('Flow definition is required');
  if (
    fields.version !== undefined &&
    (typeof fields.version !== 'number' ||
      !Number.isInteger(fields.version) ||
      fields.version < 1)
  )
    throw new BadRequestException('Invalid flow version');
  enumField(
    fields.status,
    ['draft', 'approved', 'deprecated'],
    'Invalid flow version status',
  );
  if (fields.steps !== undefined)
    objectArray(fields.steps, 'flow version steps');
  return value;
}

export function validateFlowVersionUpdateInput(
  value: unknown,
): FlowVersionUpdateInput {
  const fields = inputRecord(value, ['version', 'status', 'steps']);
  if (
    fields.version !== undefined &&
    (typeof fields.version !== 'number' ||
      !Number.isInteger(fields.version) ||
      fields.version < 1)
  )
    throw new BadRequestException('Invalid flow version');
  enumField(
    fields.status,
    ['draft', 'approved', 'deprecated'],
    'Invalid flow version status',
  );
  if (fields.steps !== undefined)
    objectArray(fields.steps, 'flow version steps');
  return value;
}

export function validateTenantFlowPermissionInputs(
  value: unknown,
): TenantFlowPermissionInput[] {
  if (!isUnknownArray(value)) {
    throw new BadRequestException('Invalid permission entries');
  }
  return value.map((entry) => {
    const fields = inputRecord(entry, [
      'companyId',
      'flowDefinitionId',
      'isEnabled',
      'defaultForIntent',
    ]);
    optionalStrings(fields, [
      'companyId',
      'flowDefinitionId',
      'defaultForIntent',
    ]);
    if (
      typeof fields.companyId !== 'string' ||
      !fields.companyId.trim() ||
      typeof fields.flowDefinitionId !== 'string' ||
      !fields.flowDefinitionId.trim()
    )
      throw new BadRequestException('Permission scope is required');
    if (fields.isEnabled !== undefined && typeof fields.isEnabled !== 'boolean')
      throw new BadRequestException('Invalid permission state');
    return entry;
  });
}

export function validateIntentFlowMappingInput(
  value: unknown,
): IntentFlowMappingInput {
  const fields = inputRecord(value, [
    'companyId',
    'intent',
    'allowedFlowDefinitionIds',
  ]);
  optionalStrings(fields, ['companyId', 'intent']);
  if (typeof fields.companyId !== 'string' || !fields.companyId.trim()) {
    throw new BadRequestException('Company scope is required');
  }
  if (typeof fields.intent !== 'string' || !fields.intent.trim()) {
    throw new BadRequestException('Intent is required');
  }
  if (fields.allowedFlowDefinitionIds !== undefined) {
    stringArray(fields.allowedFlowDefinitionIds, 'allowedFlowDefinitionIds');
  }
  return value;
}

export function validateKnowledgeDocumentInput(
  value: unknown,
): KnowledgeDocumentInput {
  const fields = inputRecord(value, ['title', 'content', 'type']);
  optionalStrings(fields, ['title', 'content']);
  enumField(
    fields.type,
    ['pdf', 'docx', 'url', 'text'],
    'Invalid knowledge document type',
  );
  return value;
}
