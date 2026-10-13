import Ajv from 'ajv';
import { BadRequestException } from '@nestjs/common';

const ajv = new Ajv({
  strict: true,
  strictRequired: false,
  allErrors: false,
  ownProperties: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});
export function compileManagedSchema(schema: unknown) {
  let serialized: string;
  try {
    serialized = JSON.stringify(schema);
  } catch {
    throw new BadRequestException('Invalid output schema');
  }
  if (
    !serialized ||
    serialized.length > 32768 ||
    !schema ||
    typeof schema !== 'object' ||
    Array.isArray(schema) ||
    (schema as any).type !== 'object'
  )
    throw new BadRequestException(
      'Output schema must be a bounded JSON object schema',
    );
  const inspect = (value: unknown, depth: number) => {
    if (depth > 16) throw new BadRequestException('Output schema is too deep');
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
        throw new BadRequestException('Unsupported output schema keyword');
      inspect(child, depth + 1);
    }
  };
  inspect(schema, 0);
  try {
    return ajv.compile(schema);
  } catch {
    throw new BadRequestException('Invalid output schema');
  }
}
