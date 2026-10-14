import { randomUUID } from 'crypto';
import type { DatabaseConfig } from './database-persistence.types';

export function loadDatabaseConfig(): DatabaseConfig {
  return {
    type: (process.env.DB_TYPE as DatabaseConfig['type']) || 'memory',
    connectionString: process.env.DB_CONNECTION_STRING,
    backupEnabled: process.env.DB_BACKUP_ENABLED === 'true',
    backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '60'),
    retentionDays: parseInt(process.env.DB_RETENTION_DAYS || '30'),
  };
}

export function generateDatabaseId(): string {
  return randomUUID();
}
