import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { interval, Subject, Subscription } from 'rxjs';

import type {
  BackupInfo,
  DatabaseConfig,
  QueryOptions,
  StoredEntity,
} from './database-persistence.types';
import { applyFilters, getNestedValue } from './database-query.utils';
import {
  generateDatabaseId,
  loadDatabaseConfig,
} from './database-persistence.config';
import {
  DatabasePersistenceFileStore,
  persistenceStorageKey,
  safePersistenceSegment,
} from './database-persistence.file-store';
export type {
  BackupInfo,
  DatabaseConfig,
  QueryOptions,
  StoredEntity,
} from './database-persistence.types';

function compareSortValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right);
  }
  return 0;
}

@Injectable()
export class DatabasePersistenceService
  implements OnModuleInit, OnModuleDestroy
{
  private storage = new Map<string, StoredEntity<unknown>>();
  private config: DatabaseConfig;
  private fileStore: DatabasePersistenceFileStore;
  private backupSubject = new Subject<BackupInfo>();
  private backupInterval?: Subscription;
  private cleanupInterval?: Subscription;

  public backup$ = this.backupSubject.asObservable();

  constructor() {
    this.config = loadDatabaseConfig();
    this.fileStore = new DatabasePersistenceFileStore(
      this.config,
      this.storage,
    );
    console.log(
      'DatabasePersistenceService: Initialized with config:',
      this.config,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.fileStore.initialize();
    this.startBackupScheduler();
    this.startCleanupScheduler();
  }

  onModuleDestroy() {
    this.stopSchedulers();
  }

  private startBackupScheduler(): void {
    if (this.config.backupEnabled && this.config.backupInterval > 0) {
      this.backupInterval = interval(
        this.config.backupInterval * 60 * 1000,
      ).subscribe(() => {
        void this.createBackup('incremental').catch(() => {
          console.error('DatabasePersistence: Scheduled backup failed');
        });
      });
      console.log(
        `DatabasePersistence: Started backup scheduler (${this.config.backupInterval} minutes)`,
      );
    }
  }

  private startCleanupScheduler(): void {
    this.cleanupInterval = interval(60 * 60 * 1000).subscribe(() => {
      void this.cleanup().catch(() => {
        console.error('DatabasePersistence: Scheduled cleanup failed');
      });
    });
    console.log('DatabasePersistence: Started cleanup scheduler (hourly)');
  }

  private stopSchedulers(): void {
    this.backupInterval?.unsubscribe();
    this.cleanupInterval?.unsubscribe();
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
    const id = options.id || generateDatabaseId();
    const key = persistenceStorageKey(collection, id);

    const entity: StoredEntity<T> = {
      id,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: options.expiresAt,
      tags: options.tags,
    };

    this.storage.set(key, entity);
    await this.fileStore.persist(key, entity);

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
    const key = persistenceStorageKey(collection, id);
    let entity = this.storage.get(key);

    if (!entity) {
      // Try to load from disk
      entity = await this.fileStore.load(key);
      if (entity) {
        this.storage.set(key, entity);
      }
    }

    // Check expiration
    if (entity && entity.expiresAt && entity.expiresAt < new Date()) {
      this.storage.delete(key);
      await this.fileStore.remove(key);
      return null;
    }

    return entity ? (entity as StoredEntity<T>) : null;
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

    const key = persistenceStorageKey(collection, id);
    this.storage.set(key, updated);
    await this.fileStore.persist(key, updated);

    console.log(
      `DatabasePersistence: Updated entity ${id} in collection ${collection}`,
    );
    return true;
  }

  // Delete an entity
  async delete(collection: string, id: string): Promise<boolean> {
    const key = persistenceStorageKey(collection, id);
    const existed = this.storage.has(key);

    this.storage.delete(key);
    await this.fileStore.remove(key);

    if (existed) {
      console.log(
        `DatabasePersistence: Deleted entity ${id} from collection ${collection}`,
      );
    }

    return existed;
  }

  // Query entities in a collection
  query<T>(
    collection: string,
    options: QueryOptions = {},
  ): Promise<StoredEntity<T>[]> {
    const collectionPrefix = `${safePersistenceSegment(collection, 'collection')}:`;
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
        const comparison = compareSortValues(
          getNestedValue(a, options.sortBy),
          getNestedValue(b, options.sortBy),
        );
        return options.sortOrder === 'desc' ? -comparison : comparison;
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
    const backupId = generateDatabaseId();
    const backup: BackupInfo = {
      id: backupId,
      timestamp: new Date(),
      size: 0,
      type,
      status: 'in_progress',
    };

    this.backupSubject.next(backup);

    try {
      const backupData = this.fileStore.prepareBackupData(type);
      const filePath = await this.fileStore.writeBackup(
        backupId,
        backupData,
        type,
      );

      backup.status = 'completed';
      backup.size = backupData.length;
      backup.filePath = filePath;

      console.log(
        `DatabasePersistence: Created ${type} backup ${backupId} (${backup.size} bytes)`,
      );
    } catch (error) {
      backup.status = 'failed';
      backup.error = error instanceof Error ? error.message : 'Backup failed';
      console.error(`DatabasePersistence: Backup ${backupId} failed`);
    }

    this.backupSubject.next(backup);
    return backup;
  }

  // Restore from backup
  async restoreFromBackup(backupId: string): Promise<boolean> {
    try {
      const backupData = await this.fileStore.readBackup(backupId);
      const restored = this.fileStore.parseBackup(backupData);

      if (restored) {
        this.storage.clear();
        for (const [key, entity] of restored) this.storage.set(key, entity);
        console.log(`DatabasePersistence: Restored from backup ${backupId}`);
        return true;
      }
    } catch {
      console.error(
        `DatabasePersistence: Restore from backup ${backupId} failed`,
      );
    }
    return false;
  }

  // Get backup history
  getBackupHistory(): Promise<BackupInfo[]> {
    return this.fileStore.listBackups();
  }

  // Cleanup expired entities
  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();

    for (const [key, entity] of this.storage.entries()) {
      if (entity.expiresAt && entity.expiresAt < now) {
        this.storage.delete(key);
        await this.fileStore.remove(key);
        cleanedCount++;
      }
    }

    // Also cleanup old backups based on retention policy
    const backupCleanup = await this.fileStore.cleanupOldBackups();
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
}
