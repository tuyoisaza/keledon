import type { QueryOptions, StoredEntity } from './database-persistence.types';

export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
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
        (!from || entity.createdAt >= from) &&
        (!to || entity.createdAt <= to),
    );
  }

  if (options.tags?.length) {
    filtered = filtered.filter(
      (entity) =>
        !!entity.tags && options.tags!.some((tag) => entity.tags!.includes(tag)),
    );
  }

  if (options.filters) {
    filtered = filtered.filter((entity) =>
      Object.entries(options.filters!).every(([key, value]) =>
        matchesFilter(getNestedValue(entity, key), value),
      ),
    );
  }

  return filtered;
}

function matchesFilter(entityValue: any, filterValue: any): boolean {
  if (typeof filterValue === 'object' && filterValue !== null) {
    if (filterValue.$gt) return entityValue > filterValue.$gt;
    if (filterValue.$lt) return entityValue < filterValue.$lt;
    if (filterValue.$gte) return entityValue >= filterValue.$gte;
    if (filterValue.$lte) return entityValue <= filterValue.$lte;
    if (filterValue.$ne) return entityValue !== filterValue.$ne;
    if (filterValue.$in) return filterValue.$in.includes(entityValue);
    if (filterValue.$nin) return !filterValue.$nin.includes(entityValue);
    if (filterValue.$regex)
      return new RegExp(filterValue.$regex).test(String(entityValue));
  }
  return entityValue === filterValue;
}
