import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Subject, Observable, interval } from 'rxjs';

export interface DatabaseConfig {
  type: 'memory' | 'file' | 'sqlite' | 'postgresql' | 'mongodb';
  connectionString?: string;
  backupEnabled: boolean;
  backupInterval: number; // minutes
  retentionDays: number;
}

export interface StoredEntity<T> {
  id: string;
  data: T;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags?: string[];
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  tags?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface BackupInfo {
  id: string;
  timestamp: Date;
  size: number;
  type: 'full' | 'incremental';
  status: 'in_progress' | 'completed' | 'failed';
  filePath?: string;
  error?: string;
}

@Injectable()
export class DatabasePersistenceService implements OnModuleInit, OnModuleDestroy {
  private storage = new Map<string, StoredEntity<any>>();
  private config: DatabaseConfig;
  private backupSubject = new Subject<BackupInfo>();
  private backupInterval: any;
  private cleanupInterval: any;

  public backup$ = this.backupSubject.asObservable();

  constructor() {
    this.config = this.loadConfig();
    console.log('DatabasePersistenceService: Initialized with config:', this.config);
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
    } = {}
  ): Promise<string> {
    const id = options.id || this.generateId();
    const key = `${collection}:${id}`;

    const entity: StoredEntity<T> = {
      id,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: options.expiresAt,
      tags: options.tags
    };

    this.storage.set(key, entity);
    await this.persistToDisk(key, entity);

    console.log(`DatabasePersistence: Stored entity ${id} in collection ${collection}`);
    return id;
  }

  // Retrieve an entity
  async retrieve<T>(
    collection: string,
    id: string
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
    data: Partial<T>
  ): Promise<boolean> {
    const existing = await this.retrieve<T>(collection, id);
    if (!existing) {
      return false;
    }

    const updated: StoredEntity<T> = {
      ...existing,
      data: { ...existing.data, ...data },
      updatedAt: new Date()
    };

    const key = `${collection}:${id}`;
    this.storage.set(key, updated);
    await this.persistToDisk(key, updated);

    console.log(`DatabasePersistence: Updated entity ${id} in collection ${collection}`);
    return true;
  }

  // Delete an entity
  async delete(
    collection: string,
    id: string
  ): Promise<boolean> {
    const key = `${collection}:${id}`;
    const existed = this.storage.has(key);
    
    this.storage.delete(key);
    await this.removeFromDisk(key);

    if (existed) {
      console.log(`DatabasePersistence: Deleted entity ${id} from collection ${collection}`);
    }

    return existed;
  }

  // Query entities in a collection
  async query<T>(
    collection: string,
    options: QueryOptions = {}
  ): Promise<StoredEntity<T>[]> {
    const collectionPrefix = `${collection}:`;
    const entities: StoredEntity<T>[] = [];

    for (const [key, entity] of this.storage.entries()) {
      if (key.startsWith(collectionPrefix)) {
        entities.push(entity as StoredEntity<T>);
      }
    }

    // Apply filters
    let filtered = this.applyFilters(entities, options);

    // Sort
    if (options.sortBy) {
      filtered.sort((a, b) => {
        const aValue = this.getNestedValue(a, options.sortBy!);
        const bValue = this.getNestedValue(b, options.sortBy!);
        
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

    return filtered;
  }

  // Count entities in collection
  async count(
    collection: string,
    options: Omit<QueryOptions, 'limit' | 'offset' | 'sortBy' | 'sortOrder'> = {}
  ): Promise<number> {
    const entities = await this.query(collection, options);
    return entities.length;
  }

  // Create backup
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupInfo> {
    const backupId = this.generateId();
    const backup: BackupInfo = {
      id: backupId,
      timestamp: new Date(),
      size: 0,
      type,
      status: 'in_progress'
    };

    this.backupSubject.next(backup);

    try {
      const backupData = await this.prepareBackupData(type);
      const filePath = await this.writeBackupFile(backupId, backupData, type);
      
      backup.status = 'completed';
      backup.size = backupData.length;
      backup.filePath = filePath;
      
      console.log(`DatabasePersistence: Created ${type} backup ${backupId} (${backup.size} bytes)`);
    } catch (error) {
      backup.status = 'failed';
      backup.error = error.message;
      console.error(`DatabasePersistence: Backup ${backupId} failed:`, error);
    }

    this.backupSubject.next(backup);
    return backup;
  }

  // Restore from backup
  async restoreFromBackup(backupId: string): Promise<boolean> {
    try {
      const backupData = await this.readBackupFile(backupId);
      const restored = await this.parseBackupData(backupData);
      
      if (restored) {
        this.storage.clear();
        this.storage = new Map(restored);
        console.log(`DatabasePersistence: Restored from backup ${backupId}`);
        return true;
      }
    } catch (error) {
      console.error(`DatabasePersistence: Restore from backup ${backupId} failed:`, error);
    }
    return false;
  }

  // Get backup history
  async getBackupHistory(): Promise<BackupInfo[]> {
    return await this.listBackupFiles();
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
    const backupCleanup = await this.cleanupOldBackups();
    cleanedCount += backupCleanup;

    if (cleanedCount > 0) {
      console.log(`DatabasePersistence: Cleaned up ${cleanedCount} expired entities/backups`);
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
      backups
    };
  }

  // Private helper methods
  private loadConfig(): DatabaseConfig {
    return {
      type: process.env.DB_TYPE as any || 'memory',
      connectionString: process.env.DB_CONNECTION_STRING,
      backupEnabled: process.env.DB_BACKUP_ENABLED === 'true',
      backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '60'),
      retentionDays: parseInt(process.env.DB_RETENTION_DAYS || '30')
    };
  }

  private initializeStorage(): void {
    if (this.config.type === 'memory') {
      console.log('DatabasePersistence: Using in-memory storage');
    } else {
      console.log(`DatabasePersistence: Using ${this.config.type} storage`);
      this.loadFromDiskStorage();
    }
  }

  private generateId(): string {
    return randomUUID();
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private applyFilters<T>(entities: StoredEntity<T>[], options: QueryOptions): StoredEntity<T>[] {
    let filtered = [...entities];

    // Date range filter
    if (options.dateRange) {
      filtered = filtered.filter(entity => {
        const entityDate = entity.createdAt;
        const from = options.dateRange.from;
        const to = options.dateRange.to;
        
        return (!from || entityDate >= from) && (!to || entityDate <= to);
      });
    }

    // Tag filter
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(entity => {
        if (!entity.tags) return false;
        return options.tags!.some(tag => entity.tags!.includes(tag));
      });
    }

    // Custom filters
    if (options.filters) {
      filtered = filtered.filter(entity => {
        return Object.entries(options.filters!).every(([key, value]) => {
          const entityValue = this.getNestedValue(entity, key);
          return this.matchesFilter(entityValue, value);
        });
      });
    }

    return filtered;
  }

  private matchesFilter(entityValue: any, filterValue: any): boolean {
    if (typeof filterValue === 'object' && filterValue !== null) {
      // Handle operators
      if (filterValue.$gt) return entityValue > filterValue.$gt;
      if (filterValue.$lt) return entityValue < filterValue.$lt;
      if (filterValue.$gte) return entityValue >= filterValue.$gte;
      if (filterValue.$lte) return entityValue <= filterValue.$lte;
      if (filterValue.$ne) return entityValue !== filterValue.$ne;
      if (filterValue.$in) return filterValue.$in.includes(entityValue);
      if (filterValue.$nin) return !filterValue.$nin.includes(entityValue);
      if (filterValue.$regex) return new RegExp(filterValue.$regex).test(String(entityValue));
    }
    
    return entityValue === filterValue;
  }

  private startBackupScheduler(): void {
    if (this.config.backupEnabled && this.config.backupInterval > 0) {
      this.backupInterval = interval(this.config.backupInterval * 60 * 1000).subscribe(async () => {
        await this.createBackup('incremental');
      });
      console.log(`DatabasePersistence: Started backup scheduler (${this.config.backupInterval} minutes)`);
    }
  }

  private startCleanupScheduler(): void {
    // Run cleanup every hour
    this.cleanupInterval = interval(60 * 60 * 1000).subscribe(async () => {
      await this.cleanup();
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
  private async persistToDisk(key: string, entity: StoredEntity<any>): Promise<void> {
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
    } catch (error) {
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
    } catch (error) {
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
      const jsonFiles = files.filter(file => file.endsWith('.json') && !file.includes('backup_'));
      
      for (const file of jsonFiles) {
        const filePath = path.join(dataDir, file);
        const data = await fs.readFile(filePath, 'utf8');
        const entity = JSON.parse(data);
        const key = file.replace('.json', '');
        this.storage.set(key, entity);
      }
      
      console.log(`DatabasePersistence: Loaded ${jsonFiles.length} entities from disk`);
    } catch (error) {
      console.error('DatabasePersistence: Failed to load from disk:', error);
    }
  }

  private async prepareBackupData(type: 'full' | 'incremental'): Promise<string> {
    const data: any = {
      timestamp: new Date().toISOString(),
      type,
      entities: {}
    };

    if (type === 'full') {
      for (const [key, entity] of this.storage.entries()) {
        const collection = key.split(':')[0];
        if (!data.entities[collection]) {
          data.entities[collection] = [];
        }
        data.entities[collection].push(entity);
      }
    } else {
      // Incremental backup - only entities changed in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const [key, entity] of this.storage.entries()) {
        if (entity.updatedAt >= oneHourAgo) {
          const collection = key.split(':')[0];
          if (!data.entities[collection]) {
            data.entities[collection] = [];
          }
          data.entities[collection].push(entity);
        }
      }
    }

    return JSON.stringify(data, null, 2);
  }

  private async writeBackupFile(backupId: string, data: string, type: 'full' | 'incremental'): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    const backupDir = path.join(process.cwd(), 'backups');
    
    await fs.mkdir(backupDir, { recursive: true });
    
    const fileName = `backup_${type}_${backupId}_${Date.now()}.json`;
    const filePath = path.join(backupDir, fileName);
    
    await fs.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  private async readBackupFile(backupId: string): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    const backupDir = path.join(process.cwd(), 'backups');
    
    const files = await fs.readdir(backupDir);
    const backupFile = files.find(file => file.includes(backupId));
    
    if (!backupFile) {
      throw new Error(`Backup file not found: ${backupId}`);
    }
    
    const filePath = path.join(backupDir, backupFile);
    return await fs.readFile(filePath, 'utf8');
  }

  private async parseBackupData(data: string): Promise<Array<[string, StoredEntity<any>]> | null> {
    try {
      const backup = JSON.parse(data);
      const entities: Array<[string, StoredEntity<any>]> = [];
      
      for (const [collection, collectionEntities] of Object.entries(backup.entities)) {
        for (const entity of collectionEntities as StoredEntity<any>[]) {
          entities.push([`${collection}:${entity.id}`, entity]);
        }
      }
      
      return entities;
    } catch (error) {
      console.error('DatabasePersistence: Failed to parse backup data:', error);
      return null;
    }
  }

  private async listBackupFiles(): Promise<BackupInfo[]> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const backupDir = path.join(process.cwd(), 'backups');
      
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.json'));
      
      const backups: BackupInfo[] = [];
      
      for (const file of backupFiles) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        const parts = file.replace('.json', '').split('_');
        backups.push({
          id: parts[2],
          timestamp: new Date(parseInt(parts[3])),
          size: stats.size,
          type: parts[1] as 'full' | 'incremental',
          status: 'completed',
          filePath
        });
      }
      
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      return [];
    }
  }

  private async cleanupOldBackups(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const backups = await this.listBackupFiles();
    const oldBackups = backups.filter(backup => backup.timestamp < cutoffDate);
    
    let cleanedCount = 0;
    
    for (const backup of oldBackups) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(backup.filePath!);
        cleanedCount++;
      } catch (error) {
        console.error(`DatabasePersistence: Failed to delete old backup ${backup.id}:`, error);
      }
    }
    
    return cleanedCount;
  }
}