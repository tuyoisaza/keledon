import type { QueryOptions, StoredEntity } from './database-persistence.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getNestedValue(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, key) => (isRecord(current) ? current[key] : undefined),
      obj,
    );
}

export function applyFilters<T>(
  entities: StoredEntity<T>[],
  options: QueryOptions,
): StoredEntity<T>[] {
  let filtered = [...entities];

  if (options.dateRange) {
    const { from, to } = options.dateRange;
    filtered = filtered.filter(
      (entity) =>
        (!from || entity.createdAt >= from) && (!to || entity.createdAt <= to),
    );
  }

  if (options.tags?.length) {
    filtered = filtered.filter(
      (entity) =>
        !!entity.tags && options.tags.some((tag) => entity.tags.includes(tag)),
    );
  }

  if (options.filters) {
    filtered = filtered.filter((entity) =>
      Object.entries(options.filters).every(([key, value]) =>
        matchesFilter(getNestedValue(entity, key), value),
      ),
    );
  }

  return filtered;
}

function comparableValues(
  left: unknown,
  right: unknown,
): [string | number | Date, string | number | Date] | null {
  if (typeof left === 'number' && typeof right === 'number') {
    return [left, right];
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return [left, right];
  }
  if (left instanceof Date && right instanceof Date) return [left, right];
  return null;
}

function matchesFilter(entityValue: unknown, filterValue: unknown): boolean {
  if (!isRecord(filterValue)) return entityValue === filterValue;

  if ('$gt' in filterValue) {
    const pair = comparableValues(entityValue, filterValue.$gt);
    return !!pair && pair[0] > pair[1];
  }
  if ('$lt' in filterValue) {
    const pair = comparableValues(entityValue, filterValue.$lt);
    return !!pair && pair[0] < pair[1];
  }
  if ('$gte' in filterValue) {
    const pair = comparableValues(entityValue, filterValue.$gte);
    return !!pair && pair[0] >= pair[1];
  }
  if ('$lte' in filterValue) {
    const pair = comparableValues(entityValue, filterValue.$lte);
    return !!pair && pair[0] <= pair[1];
  }
  if ('$ne' in filterValue) return entityValue !== filterValue.$ne;
  if ('$in' in filterValue) {
    return (
      Array.isArray(filterValue.$in) && filterValue.$in.includes(entityValue)
    );
  }
  if ('$nin' in filterValue) {
    return (
      Array.isArray(filterValue.$nin) && !filterValue.$nin.includes(entityValue)
    );
  }
  if ('$regex' in filterValue) {
    const textValue =
      typeof entityValue === 'string' ||
      typeof entityValue === 'number' ||
      typeof entityValue === 'boolean'
        ? `${entityValue}`
        : entityValue instanceof Date
          ? entityValue.toISOString()
          : undefined;
    return (
      typeof filterValue.$regex === 'string' &&
      textValue !== undefined &&
      new RegExp(filterValue.$regex).test(textValue)
    );
  }
  return entityValue === filterValue;
}
