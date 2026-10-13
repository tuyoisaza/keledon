import { BadRequestException } from '@nestjs/common';

export class KnowledgeValidation {
  static optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  static normalizeLimit(limit?: number): number {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) return 5;
    return Math.min(20, Math.max(1, Math.floor(limit)));
  }

  static assertNonEmpty(value: string | undefined, message: string): void {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(message);
    }
  }

  static assertBody<T>(
    value: T | null | undefined,
    message: string,
  ): asserts value is T {
    if (value == null) throw new BadRequestException(message);
  }

  static assertOptionalString(value: unknown, message: string): void {
    if (typeof value === 'undefined') return;
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(message);
    }
  }

  static assertOptionalStringArray(value: unknown, message: string): void {
    if (typeof value === 'undefined') return;
    if (
      !Array.isArray(value) ||
      value.some(
        (entry) => typeof entry !== 'string' || entry.trim().length === 0,
      )
    ) {
      throw new BadRequestException(message);
    }
  }

  static assertOptionalNumber(value: unknown, message: string): void {
    if (typeof value === 'undefined') return;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(message);
    }
  }

  static assertOptionalPlainObject(value: unknown, message: string): void {
    if (typeof value === 'undefined') return;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(message);
    }
  }
}
