import { randomUUID } from 'crypto';
import type { BackupInfo, StoredEntity } from './database-persistence.types';

export class DatabaseBackupStore {
  async createBackup(
    type: 'full' | 'incremental',
    storage: Map<string, StoredEntity<any>>,
    publish: (backup: BackupInfo) => void,
  ): Promise<BackupInfo> {
    const backup: BackupInfo = {
      id: randomUUID(),
      timestamp: new Date(),
      size: 0,
      type,
      status: 'in_progress',
    };
    publish(backup);
    try {
      const data = await this.prepareData(type, storage);
      backup.filePath = await this.writeFile(backup.id, data, type);
      backup.status = 'completed';
      backup.size = data.length;
      console.log(
        `DatabasePersistence: Created ${type} backup ${backup.id} (${backup.size} bytes)`,
      );
    } catch (error) {
      backup.status = 'failed';
      backup.error = error instanceof Error ? error.message : String(error);
      console.error(`DatabasePersistence: Backup ${backup.id} failed:`, error);
    }
    publish(backup);
    return backup;
  }

  async restore(
    backupId: string,
  ): Promise<Array<[string, StoredEntity<any>]> | null> {
    try {
      const data = await this.readFile(backupId);
      const backup = JSON.parse(data);
      const entities: Array<[string, StoredEntity<any>]> = [];
      for (const [collection, items] of Object.entries(backup.entities)) {
        for (const entity of items as StoredEntity<any>[]) {
          entities.push([`${collection}:${entity.id}`, entity]);
        }
      }
      return entities;
    } catch (error) {
      console.error('DatabasePersistence: Failed to restore backup:', error);
      return null;
    }
  }

  async getHistory(): Promise<BackupInfo[]> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const backupDir = path.join(process.cwd(), 'backups');
      const files = (await fs.readdir(backupDir)).filter(
        (file: string) => file.startsWith('backup_') && file.endsWith('.json'),
      );
      const backups: BackupInfo[] = [];
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        const parts = file.replace('.json', '').split('_');
        backups.push({
          id: parts[2],
          timestamp: new Date(parseInt(parts[3])),
          size: stats.size,
          type: parts[1] as 'full' | 'incremental',
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

  async cleanupOld(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const backups = (await this.getHistory()).filter(
      (backup) => backup.timestamp < cutoff,
    );
    let cleaned = 0;
    for (const backup of backups) {
      try {
        await require('fs').promises.unlink(backup.filePath);
        cleaned++;
      } catch (error) {
        console.error(
          `DatabasePersistence: Failed to delete old backup ${backup.id}:`,
          error,
        );
      }
    }
    return cleaned;
  }

  private async prepareData(
    type: 'full' | 'incremental',
    storage: Map<string, StoredEntity<any>>,
  ): Promise<string> {
    const data: {
      timestamp: string;
      type: string;
      entities: Record<string, StoredEntity<any>[]>;
    } = {
      timestamp: new Date().toISOString(),
      type,
      entities: {},
    };
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [key, entity] of storage.entries()) {
      if (type === 'incremental' && !(entity.updatedAt >= oneHourAgo)) continue;
      const collection = key.split(':')[0];
      data.entities[collection] ||= [];
      data.entities[collection].push(entity);
    }
    return JSON.stringify(data, null, 2);
  }

  private async writeFile(
    backupId: string,
    data: string,
    type: 'full' | 'incremental',
  ): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    const backupDir = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const filePath = path.join(
      backupDir,
      `backup_${type}_${backupId}_${Date.now()}.json`,
    );
    await fs.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  private async readFile(backupId: string): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');
    const backupDir = path.join(process.cwd(), 'backups');
    const file = (await fs.readdir(backupDir)).find((name: string) =>
      name.includes(backupId),
    );
    if (!file) throw new Error(`Backup file not found: ${backupId}`);
    return fs.readFile(path.join(backupDir, file), 'utf8');
  }
}
