import { BadRequestException } from '@nestjs/common';

/** Vendor.config currently supports only the non-secret tenant origin list. */
export function assertNonSecretVendorConfig(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Vendor config must be a JSON object.');
  }

  for (const [key, child] of Object.entries(value)) {
    if (key !== 'allowedOrigins') {
      throw new BadRequestException(
        `Vendor config field "${key}" is not supported; credentials must use encrypted credential fields.`,
      );
    }
    if (
      !Array.isArray(child) ||
      child.some((origin) => typeof origin !== 'string')
    ) {
      throw new BadRequestException(
        'Vendor config allowedOrigins must be an array of origin strings.',
      );
    }
  }
  return value as Record<string, unknown>;
}
