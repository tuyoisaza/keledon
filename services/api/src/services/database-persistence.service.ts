import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Subject, interval } from 'rxjs';

import type {
  BackupInfo,
  DatabaseConfig,
  QueryOptions,
  StoredEntity,
} from './database-persistence.types';
import { applyFilters, getNestedValue } from './database-query.utils';
import { DatabaseBackupStore } from './database-backup.store';
export type {
  BackupInfo,
  DatabaseConfig,
  QueryOptions,
  StoredEntity,
} from './database-persistence.types';

@Injectable()
export class DatabasePersistenceService
  implements OnModuleInit, OnModuleDestroy
{
  private storage = new Map<string, StoredEntity<any>>();
  private config: DatabaseConfig;
  private backupSubject = new Subject<BackupInfo>();
  private backupInterval: any;
  private cleanupInterval: any;
  private readonly backupStore = new DatabaseBackupStore();

  public backup$ = this.backupSubject.asObservable();

  constructor() {
    this.config = this.loadConfig();
    console.log(
      'DatabasePersistenceService: Initialized with config:',
      this.config,
    );
  }

  onModuleInit() {
    this.initializeStorage();
    this.startBackupScheduler();
    this.startCleanupScheduler();
  }

  onModuleDestroy() {
    this.stopSchedulers();
  }

  // Store an entity
  async store<T>(
    collection: string,
    data: T,
    options: {
      id?: string;
      expiresAt?: Date;
      tags?: string[];
    } = {},
  ): Promise<string> {
    const id = options.id || this.generateId();
    const key = `${collection}:${id}`;

    const entity: StoredEntity<T> = {
      id,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: options.expiresAt,
      tags: options.tags,
    };

    this.storage.set(key, entity);
    await this.persistToDisk(key, entity);

    console.log(
      `DatabasePersistence: Stored entity ${id} in collection ${collection}`,
    );
    return id;
  }

  // Retrieve an entity
  async retrieve<T>(
    collection: string,
    id: string,
  ): Promise<StoredEntity<T> | null> {
    const key = `${collection}:${id}`;
    let entity = this.storage.get(key);

    if (!entity) {
      // Try to load from disk
      entity = await this.loadFromDisk(key);
      if (entity) {
        this.storage.set(key, entity);
      }
    }

    // Check expiration
    if (entity && entity.expiresAt && entity.expiresAt < new Date()) {
      this.storage.delete(key);
      await this.removeFromDisk(key);
      return null;
    }

    return entity || null;
  }

  // Update an entity
  async update<T>(
    collection: string,
    id: string,
    data: Partial<T>,
  ): Promise<boolean> {
    const existing = await this.retrieve<T>(collection, id);
    if (!existing) {
      return false;
    }

    const updated: StoredEntity<T> = {
      ...existing,
      data: { ...existing.data, ...data },
      updatedAt: new Date(),
    };

    const key = `${collection}:${id}`;
    this.storage.set(key, updated);
    await this.persistToDisk(key, updated);

    console.log(
      `DatabasePersistence: Updated entity ${id} in collection ${collection}`,
    );
    return true;
  }

  // Delete an entity
  async delete(collection: string, id: string): Promise<boolean> {
    const key = `${collection}:${id}`;
    const existed = this.storage.has(key);

    this.storage.delete(key);
    await this.removeFromDisk(key);

    if (existed) {
      console.log(
        `DatabasePersistence: Deleted entity ${id} from collection ${collection}`,
      );
    }

    return existed;
  }

  // Query entities in a collection
  async query<T>(
    collection: string,
    options: QueryOptions = {},
  ): Promise<StoredEntity<T>[]> {
    const collectionPrefix = `${collection}:`;
    const entities: StoredEntity<T>[] = [];

    for (const [key, entity] of this.storage.entries()) {
      if (key.startsWith(collectionPrefix)) {
        entities.push(entity as StoredEntity<T>);
      }
    }

    // Apply filters
    let filtered = applyFilters(entities, options);

    // Sort
    if (options.sortBy) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a, options.sortBy);
        const bValue = getNestedValue(b, options.sortBy);

        if (options.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });
    }

    // Pagination
    if (options.offset) {
      filtered = filtered.slice(options.offset);
    }
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return Promise.resolve(filtered);
  }

  // Count entities in collection
  async count(
    collection: string,
    options: Omit<
      QueryOptions,
      'limit' | 'offset' | 'sortBy' | 'sortOrder'
    > = {},
  ): Promise<number> {
    const entities = await this.query(collection, options);
    return entities.length;
  }

  // Create backup
  async createBackup(
    type: 'full' | 'incremental' = 'full',
  ): Promise<BackupInfo> {
    return this.backupStore.createBackup(type, this.storage, (backup) =>
      this.backupSubject.next(backup),
    );
  }

  // Restore from backup
  async restoreFromBackup(backupId: string): Promise<boolean> {
    const restored = await this.backupStore.restore(backupId);
    if (!restored) return false;
    this.storage.clear();
    this.storage = new Map(restored);
    console.log(`DatabasePersistence: Restored from backup ${backupId}`);
    return true;
  }

  // Get backup history
  async getBackupHistory(): Promise<BackupInfo[]> {
    return this.backupStore.getHistory();
  }

  // Cleanup expired entities
  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();

    for (const [key, entity] of this.storage.entries()) {
      if (entity.expiresAt && entity.expiresAt < now) {
        this.storage.delete(key);
        await this.removeFromDisk(key);
        cleanedCount++;
      }
    }

    // Also cleanup old backups based on retention policy
    const backupCleanup = await this.backupStore.cleanupOld(
      this.config.retentionDays,
    );
    cleanedCount += backupCleanup;

    if (cleanedCount > 0) {
      console.log(
        `DatabasePersistence: Cleaned up ${cleanedCount} expired entities/backups`,
      );
    }

    return cleanedCount;
  }

  // Get database statistics
  async getStats(): Promise<{
    totalEntities: number;
    totalSize: number;
    collections: Record<string, { count: number; size: number }>;
    backups: BackupInfo[];
  }> {
    const collections: Record<string, { count: number; size: number }> = {};
    let totalSize = 0;

    for (const [key, entity] of this.storage.entries()) {
      const collection = key.split(':')[0];
      const size = JSON.stringify(entity).length;

      if (!collections[collection]) {
        collections[collection] = { count: 0, size: 0 };
      }

      collections[collection].count++;
      collections[collection].size += size;
      totalSize += size;
    }

    const backups = await this.getBackupHistory();

    return {
      totalEntities: this.storage.size,
      totalSize,
      collections,
      backups,
    };
  }

  // Private helper methods
  private loadConfig(): DatabaseConfig {
    return {
      type: (process.env.DB_TYPE as any) || 'memory',
      connectionString: process.env.DB_CONNECTION_STRING,
      backupEnabled: process.env.DB_BACKUP_ENABLED === 'true',
      backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '60'),
      retentionDays: parseInt(process.env.DB_RETENTION_DAYS || '30'),
    };
  }

  private initializeStorage(): void {
    if (this.config.type === 'memory') {
      console.log('DatabasePersistence: Using in-memory storage');
    } else {
      console.log(`DatabasePersistence: Using ${this.config.type} storage`);
      void this.loadFromDiskStorage().catch(() => {
        console.error('DatabasePersistence: Failed to load disk storage');
      });
    }
  }

  private generateId(): string {
    return randomUUID();
  }

  private startBackupScheduler(): void {
    if (this.config.backupEnabled && this.config.backupInterval > 0) {
      this.backupInterval = interval(
        this.config.backupInterval * 60 * 1000,
      ).subscribe(() => {
        void this.createBackup('incremental');
      });
      console.log(
        `DatabasePersistence: Started backup scheduler (${this.config.backupInterval} minutes)`,
      );
    }
  }

  private startCleanupScheduler(): void {
    // Run cleanup every hour
    this.cleanupInterval = interval(60 * 60 * 1000).subscribe(() => {
      void this.cleanup();
    });
    console.log('DatabasePersistence: Started cleanup scheduler (hourly)');
  }

  private stopSchedulers(): void {
    if (this.backupInterval) {
      this.backupInterval.unsubscribe();
    }
    if (this.cleanupInterval) {
      this.cleanupInterval.unsubscribe();
    }
  }

  // Disk persistence methods (simplified for demo)
  private async persistToDisk(
    key: string,
    entity: StoredEntity<any>,
  ): Promise<void> {
    if (this.config.type === 'memory') return;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(process.cwd(), 'data', `${key}.json`);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(entity, null, 2));
    } catch (error) {
      console.error('DatabasePersistence: Failed to persist to disk:', error);
    }
  }

  private async loadFromDisk(key: string): Promise<StoredEntity<any> | null> {
    if (this.config.type === 'memory') return null;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(process.cwd(), 'data', `${key}.json`);

      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async removeFromDisk(key: string): Promise<void> {
    if (this.config.type === 'memory') return;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(process.cwd(), 'data', `${key}.json`);

      await fs.unlink(filePath);
    } catch {
      // Ignore file not found errors
    }
  }

  private async loadFromDiskStorage(): Promise<void> {
    if (this.config.type === 'memory') return;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');

      const files = await fs.readdir(dataDir);
      const jsonFiles = files.filter(
        (file) => file.endsWith('.json') && !file.includes('backup_'),
      );

      for (const file of jsonFiles) {
        const filePath = path.join(dataDir, file);
        const data = await fs.readFile(filePath, 'utf8');
        const entity = JSON.parse(data);
        const key = file.replace('.json', '');
        this.storage.set(key, entity);
      }

      console.log(
        `DatabasePersistence: Loaded ${jsonFiles.length} entities from disk`,
      );
    } catch (error) {
      console.error('DatabasePersistence: Failed to load from disk:', error);
    }
  }
}
