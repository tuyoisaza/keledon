export type SeedRecord = Record<string, unknown>;

export function isSeedRecord(value: unknown): value is SeedRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getSeedRecords(data: unknown, key: string): SeedRecord[] {
  if (!isSeedRecord(data)) return [];
  const entries = data[key];
  return Array.isArray(entries) ? entries.filter(isSeedRecord) : [];
}

export function getSeedString(
  record: SeedRecord,
  key: string,
  maxLength = 255,
): string | undefined {
  const value = record[key];
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength
    ? normalized
    : undefined;
}

export function getSeedRecordId(value: unknown): string | null {
  return isSeedRecord(value) && typeof value.id === 'string' ? value.id : null;
}
