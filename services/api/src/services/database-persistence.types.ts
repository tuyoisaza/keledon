export interface DatabaseConfig {
  type: 'memory' | 'file' | 'sqlite';
  connectionString?: string;
  backupEnabled: boolean;
  backupInterval: number;
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
  dateRange?: { from?: Date; to?: Date };
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
