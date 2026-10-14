import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  BackupInfo,
  DatabaseConfig,
  StoredEntity,
} from './database-persistence.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStoredEntity(value: unknown): StoredEntity<unknown> | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !('data' in value)) {
    return null;
  }
  const createdAt = parseDate(value.createdAt);
  const updatedAt = parseDate(value.updatedAt);
  if (!createdAt || !updatedAt) return null;
  const expiresAt = value.expiresAt ? parseDate(value.expiresAt) : undefined;
  if (value.expiresAt && !expiresAt) return null;
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string')
    : undefined;
  return {
    id: value.id,
    data: value.data,
    createdAt,
    updatedAt,
    ...(expiresAt ? { expiresAt } : {}),
    ...(tags ? { tags } : {}),
  };
}

function parseDate(value: unknown): Date | null {
  if (
    !(value instanceof Date) &&
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function persistenceStorageKey(collection: string, id: string): string {
  return `${safePersistenceSegment(collection, 'collection')}:${safePersistenceSegment(id, 'id')}`;
}

export function safePersistenceSegment(value: string, label: string): string {
  if (
    !value.trim() ||
    /[\\/\0]/.test(value) ||
    value === '.' ||
    value === '..'
  ) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function dataFilePath(key: string, legacy = false): string {
  if (/[\\/\0]/.test(key)) throw new Error('Invalid storage key');
  const directory = path.resolve(process.cwd(), 'data');
  const fileName = legacy ? `${key}.json` : `${encodeURIComponent(key)}.json`;
  const filePath = path.resolve(directory, fileName);
  if (!filePath.startsWith(`${directory}${path.sep}`)) {
    throw new Error('Storage path is outside the data directory');
  }
  return filePath;
}

export class DatabasePersistenceFileStore {
  constructor(
    private readonly config: DatabaseConfig,
    private readonly storage: Map<string, StoredEntity<unknown>>,
  ) {}

  async initialize(): Promise<void> {
    if (this.config.type !== 'memory') await this.loadAll();
  }

  async persist(key: string, entity: StoredEntity<unknown>): Promise<void> {
    if (this.config.type === 'memory') return;
    try {
      const filePath = dataFilePath(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(entity, null, 2));
      await fs.unlink(dataFilePath(key, true)).catch(() => undefined);
    } catch {
      console.error('DatabasePersistence: Failed to persist entity');
    }
  }

  async load(key: string): Promise<StoredEntity<unknown> | null> {
    if (this.config.type === 'memory') return null;
    try {
      let data: string;
      try {
        data = await fs.readFile(dataFilePath(key), 'utf8');
      } catch {
        data = await fs.readFile(dataFilePath(key, true), 'utf8');
      }
      return parseStoredEntity(JSON.parse(data));
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (this.config.type === 'memory') return;
    try {
      await Promise.all(
        [dataFilePath(key), dataFilePath(key, true)].map((filePath) =>
          fs.unlink(filePath).catch(() => undefined),
        ),
      );
    } catch {
      // Invalid storage paths are rejected and missing files are harmless.
    }
  }

  prepareBackupData(type: 'full' | 'incremental'): string {
    const entities: Record<string, StoredEntity<unknown>[]> = {};
    const data = { timestamp: new Date().toISOString(), type, entities };
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [key, entity] of this.storage.entries()) {
      if (type === 'incremental' && entity.updatedAt < oneHourAgo) continue;
      const collection = key.split(':')[0];
      (entities[collection] ??= []).push(entity);
    }
    return JSON.stringify(data, null, 2);
  }

  async writeBackup(
    backupId: string,
    data: string,
    type: 'full' | 'incremental',
  ): Promise<string> {
    const backupDir = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const fileName = `backup_${type}_${backupId}_${Date.now()}.json`;
    const filePath = path.join(backupDir, fileName);
    await fs.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  async readBackup(backupId: string): Promise<string> {
    if (!/^[a-zA-Z0-9_-]+$/.test(backupId)) {
      throw new Error('Invalid backup id');
    }
    const backupDir = path.join(process.cwd(), 'backups');
    const files = await fs.readdir(backupDir);
    const backupFile = files.find(
      (file) =>
        file.startsWith('backup_') &&
        file.endsWith('.json') &&
        file.split('_')[2] === backupId,
    );
    if (!backupFile) throw new Error('Backup file not found');
    return fs.readFile(path.join(backupDir, backupFile), 'utf8');
  }

  parseBackup(data: string): Array<[string, StoredEntity<unknown>]> | null {
    try {
      const backup: unknown = JSON.parse(data);
      if (!isRecord(backup) || !isRecord(backup.entities)) return null;
      const entities: Array<[string, StoredEntity<unknown>]> = [];
      for (const [collection, records] of Object.entries(backup.entities)) {
        if (!Array.isArray(records)) return null;
        for (const record of records) {
          const entity = parseStoredEntity(record);
          if (!entity) return null;
          entities.push([persistenceStorageKey(collection, entity.id), entity]);
        }
      }
      return entities;
    } catch {
      console.error('DatabasePersistence: Failed to parse backup data');
      return null;
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      const backupDir = path.join(process.cwd(), 'backups');
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(
        (file) => file.startsWith('backup_') && file.endsWith('.json'),
      );
      const backups: BackupInfo[] = [];
      for (const file of backupFiles) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        const parts = file.slice(0, -'.json'.length).split('_');
        if (parts.length < 4 || !/^[a-zA-Z0-9-]+$/.test(parts[2])) continue;
        const timestamp = Number(parts[3]);
        if (!Number.isFinite(timestamp)) continue;
        backups.push({
          id: parts[2],
          timestamp: new Date(timestamp),
          size: stats.size,
          type: parts[1] as BackupInfo['type'],
          status: 'completed',
          filePath,
        });
      }
      return backups.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    } catch {
      return [];
    }
  }

  async cleanupOldBackups(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    const oldBackups = (await this.listBackups()).filter(
      (backup) => backup.timestamp < cutoffDate,
    );
    let cleanedCount = 0;
    for (const backup of oldBackups) {
      if (!backup.filePath) continue;
      try {
        await fs.unlink(backup.filePath);
        cleanedCount++;
      } catch {
        console.error(
          `DatabasePersistence: Failed to delete old backup ${backup.id}`,
        );
      }
    }
    return cleanedCount;
  }

  private async loadAll(): Promise<void> {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      await fs.mkdir(dataDir, { recursive: true });
      const files = await fs.readdir(dataDir);
      const jsonFiles = files.filter(
        (file) => file.endsWith('.json') && !file.includes('backup_'),
      );
      for (const file of jsonFiles) {
        const data = await fs.readFile(path.join(dataDir, file), 'utf8');
        const entity = parseStoredEntity(JSON.parse(data));
        if (!entity) continue;
        let key = file.slice(0, -'.json'.length);
        try {
          key = decodeURIComponent(key);
        } catch {
          // Legacy filenames were not URI-encoded.
        }
        if (/[\\/\0]/.test(key)) continue;
        this.storage.set(key, entity);
      }
      console.log(
        `DatabasePersistence: Loaded ${jsonFiles.length} entities from disk`,
      );
    } catch {
      console.error('DatabasePersistence: Failed to load entities from disk');
    }
  }
}
