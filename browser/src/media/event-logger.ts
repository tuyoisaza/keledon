import { EventEmitter } from 'events';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  event: string;
  data?: Record<string, any>;
  duration?: number;
  source?: 'browser' | 'cloud' | 'media' | 'executor' | 'escalation' | 'ui';
}

export class EventLogger extends EventEmitter {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private categories: Set<string> = new Set();
  private timers = new Map<string, { startTime: number; category: string; event: string }>();

  constructor() {
    super();
  }

  log(level: LogEntry['level'], category: string, event: string, data?: Record<string, any>): void {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      event,
      data
    };

    this.logs.push(entry);
    this.categories.add(category);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.emit('entry', entry);
    
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
    if (levelPriority[level] >= 2) {
      console.log(`[${level.toUpperCase()}] ${category}: ${event}`, data || '');
    }
  }

  debug(category: string, event: string, data?: Record<string, any>): void {
    this.log('debug', category, event, data);
  }

  info(category: string, event: string, data?: Record<string, any>): void {
    this.log('info', category, event, data);
  }

  warn(category: string, event: string, data?: Record<string, any>): void {
    this.log('warn', category, event, data);
  }

  error(category: string, event: string, data?: Record<string, any>): void {
    this.log('error', category, event, data);
  }

  critical(category: string, event: string, data?: Record<string, any>): void {
    this.log('critical', category, event, data);
  }

  startTimer(category: string, event: string): string {
    const timerId = `timer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.timers.set(timerId, { startTime: Date.now(), category, event });
    return timerId;
  }

  endTimer(timerId: string, category: string, event: string): void {
    const timer = this.timers.get(timerId);
    if (!timer) return;
    this.timers.delete(timerId);
    this.info(category || timer.category, `${event || timer.event}_complete`, {
      timerId,
      durationMs: Date.now() - timer.startTime,
    });
  }

  getLogs(filter?: {
    level?: LogEntry['level'];
    category?: string;
    event?: string;
    since?: string;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter(l => l.level === filter.level);
    }
    if (filter?.category) {
      filtered = filtered.filter(l => l.category === filter.category);
    }
    if (filter?.event) {
      filtered = filtered.filter(l => l.event === filter.event);
    }
    if (filter?.since) {
      const sinceDate = new Date(filter.since);
      filtered = filtered.filter(l => new Date(l.timestamp) >= sinceDate);
    }
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  getCategories(): string[] {
    return Array.from(this.categories);
  }

  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    oldest: string | null;
    newest: string | null;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    }

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      oldest: this.logs[0]?.timestamp || null,
      newest: this.logs[this.logs.length - 1]?.timestamp || null
    };
  }

  clear(): void {
    this.logs = [];
    this.categories.clear();
    this.timers.clear();
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const eventLogger = new EventLogger();
