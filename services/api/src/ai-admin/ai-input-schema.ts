import { compileManagedSchema } from './ai-schema';
import { BadRequestException } from '@nestjs/common';
const INPUT_TYPES = new Set(['string', 'number', 'integer', 'boolean']);
const INPUT_SENSITIVITY = new Set([
  'public',
  'internal',
  'user-content',
  'personal-data',
  'secret',
  'financial',
]);

export function validateInputSchema(
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


import type { PreparedAiPrompt } from './ai-admin.service';
export function validateManagedInput(prepared: PreparedAiPrompt, input: unknown): unknown {
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

export function validateManagedOutput(prepared: PreparedAiPrompt, output: unknown): unknown {
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
