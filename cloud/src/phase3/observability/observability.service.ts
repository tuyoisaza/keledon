import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  LogEntry,
  Metric,
  Trace,
  Alert,
  AlertCondition,
  Dashboard,
  DashboardWidget,
  MetricQuery,
  HealthCheck,
  SystemMetrics
} from './interfaces/observability.interfaces';

@Injectable()
export class ObservabilityService {
  private logs: LogEntry[] = [];
  private metrics: Metric[] = [];
  private traces: Map<string, Trace[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private systemMetricsHistory: SystemMetrics[] = [];

  constructor() {
    this.startMetricsCollection();
    this.startAlertMonitoring();
  }

  async log(logEntry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const entry: LogEntry = {
      ...logEntry,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.logs.push(entry);

    if (entry.level === 'error' || entry.level === 'fatal') {
      await this.createErrorAlert(entry);
    }

    this.trimLogs();
  }

  async recordMetric(metric: Omit<Metric, 'id' | 'timestamp'>): Promise<void> {
    const metricEntry: Metric = {
      ...metric,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.metrics.push(metricEntry);
    this.trimMetrics();
  }

  async startTrace(trace: Omit<Trace, 'id' | 'startTime' | 'status'>): Promise<string> {
    const traceEntry: Trace = {
      ...trace,
      id: this.generateId(),
      startTime: new Date(),
      status: 'ok'
    };

    const traceSpans = this.traces.get(trace.traceId) || [];
    traceSpans.push(traceEntry);
    this.traces.set(trace.traceId, traceSpans);

    return traceEntry.id;
  }

  async endTrace(spanId: string, status: Trace['status'] = 'ok'): Promise<void> {
    for (const [traceId, spans] of this.traces.entries()) {
      const span = spans.find(s => s.id === spanId);
      if (span) {
        span.endTime = new Date();
        span.duration = span.endTime.getTime() - span.startTime.getTime();
        span.status = status;
        break;
      }
    }
  }

  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const alertEntry: Alert = {
      ...alert,
      id: this.generateId(),
      timestamp: new Date(),
      status: 'active'
    };

    this.alerts.set(alertEntry.id, alertEntry);
    return alertEntry.id;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    return true;
  }

  async createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const dashboardEntry: Dashboard = {
      ...dashboard,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dashboards.set(dashboardEntry.id, dashboardEntry);
    return dashboardEntry.id;
  }

  async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    return this.dashboards.get(dashboardId) || null;
  }

  async updateHealthCheck(healthCheck: HealthCheck): Promise<void> {
    this.healthChecks.set(healthCheck.service, healthCheck);
  }

  async getSystemMetrics(timeRange?: { from: Date; to: Date }): Promise<SystemMetrics[]> {
    if (!timeRange) {
      return this.systemMetricsHistory.slice(-100);
    }

    return this.systemMetricsHistory.filter(metric => 
      metric.timestamp >= timeRange.from && metric.timestamp <= timeRange.to
    );
  }

  async searchLogs(query: {
    level?: LogEntry['level'];
    service?: string;
    context?: string;
    timeRange?: { from: Date; to: Date };
    tags?: string[];
    search?: string;
  }): Promise<LogEntry[]> {
    let filteredLogs = [...this.logs];

    if (query.level) {
      filteredLogs = filteredLogs.filter(log => log.level === query.level);
    }

    if (query.service) {
      filteredLogs = filteredLogs.filter(log => log.service === query.service);
    }

    if (query.context) {
      filteredLogs = filteredLogs.filter(log => log.context === query.context);
    }

    if (query.timeRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= query.timeRange.from && log.timestamp <= query.timeRange.to
      );
    }

    if (query.tags && query.tags.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        query.tags.some(tag => log.tags.includes(tag))
      );
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.context.toLowerCase().includes(searchLower) ||
        log.service.toLowerCase().includes(searchLower)
      );
    }

    return filteredLogs.slice(-1000);
  }

  async getMetrics(query: {
    name?: string;
    service?: string;
    timeRange?: { from: Date; to: Date };
    labels?: Record<string, string>;
  }): Promise<Metric[]> {
    let filteredMetrics = [...this.metrics];

    if (query.name) {
      filteredMetrics = filteredMetrics.filter(metric => metric.name === query.name);
    }

    if (query.service) {
      filteredMetrics = filteredMetrics.filter(metric => metric.service === query.service);
    }

    if (query.timeRange) {
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.timestamp >= query.timeRange.from && metric.timestamp <= query.timeRange.to
      );
    }

    if (query.labels) {
      filteredMetrics = filteredMetrics.filter(metric => 
        Object.entries(query.labels).every(([key, value]) => 
          metric.labels[key] === value
        )
      );
    }

    return filteredMetrics.slice(-1000);
  }

  async getTraces(traceId?: string): Promise<Trace[]> {
    if (traceId) {
      return this.traces.get(traceId) || [];
    }

    const allTraces: Trace[] = [];
    for (const spans of this.traces.values()) {
      allTraces.push(...spans);
    }
    return allTraces;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheck[];
    timestamp: Date;
  }> {
    const services = Array.from(this.healthChecks.values());
    const unhealthyCount = services.filter(h => h.status === 'unhealthy').length;
    const degradedCount = services.filter(h => h.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      services,
      timestamp: new Date()
    };
  }

  async generateReport(timeRange: { from: Date; to: Date }): Promise<{
    summary: {
      totalLogs: number;
      totalMetrics: number;
      totalTraces: number;
      totalAlerts: number;
      errorRate: number;
      averageResponseTime: number;
    };
    topErrors: Array<{ message: string; count: number }>;
    serviceHealth: Array<{ service: string; uptime: number; errorRate: number }>;
    performanceMetrics: {
      averageCpuUsage: number;
      averageMemoryUsage: number;
      peakNetworkTraffic: number;
    };
  }> {
    const logs = await this.searchLogs({ timeRange });
    const metrics = await this.getMetrics({ timeRange });
    const traces = await this.getTraces();
    const alerts = Array.from(this.alerts.values()).filter(alert => 
      alert.timestamp >= timeRange.from && alert.timestamp <= timeRange.to
    );

    const errorLogs = logs.filter(log => log.level === 'error');
    const errorRate = logs.length > 0 ? (errorLogs.length / logs.length) : 0;

    const errorCounts = new Map<string, number>();
    errorLogs.forEach(log => {
      const count = errorCounts.get(log.message) || 0;
      errorCounts.set(log.message, count + 1);
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const serviceNames = Array.from(new Set(logs.map(log => log.service)));
    const serviceHealth = serviceNames.map(service => {
      const serviceLogs = logs.filter(log => log.service === service);
      const serviceErrors = serviceLogs.filter(log => log.level === 'error');
      const serviceErrorRate = serviceLogs.length > 0 ? (serviceErrors.length / serviceLogs.length) : 0;
      
      return {
        service,
        uptime: 1 - serviceErrorRate,
        errorRate: serviceErrorRate
      };
    });

    const systemMetrics = await this.getSystemMetrics(timeRange);
    const performanceMetrics = {
      averageCpuUsage: systemMetrics.length > 0 
        ? systemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / systemMetrics.length 
        : 0,
      averageMemoryUsage: systemMetrics.length > 0 
        ? systemMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / systemMetrics.length 
        : 0,
      peakNetworkTraffic: systemMetrics.length > 0 
        ? Math.max(...systemMetrics.map(m => m.network.bytesIn + m.network.bytesOut)) 
        : 0
    };

    const completedTraces = traces.filter(trace => trace.duration);
    const averageResponseTime = completedTraces.length > 0
      ? completedTraces.reduce((sum, trace) => sum + (trace.duration || 0), 0) / completedTraces.length
      : 0;

    return {
      summary: {
        totalLogs: logs.length,
        totalMetrics: metrics.length,
        totalTraces: traces.length,
        totalAlerts: alerts.length,
        errorRate,
        averageResponseTime
      },
      topErrors,
      serviceHealth,
      performanceMetrics
    };
  }

  private async createErrorAlert(logEntry: LogEntry): Promise<void> {
    await this.createAlert({
      name: `Error in ${logEntry.service}`,
      description: logEntry.message,
      severity: 'error' === logEntry.level ? 'critical' : 'warning',
      condition: {
        metric: 'log_errors',
        operator: 'gt',
        duration: 0
      },
      threshold: 1,
      current: 1,
      service: logEntry.service,
      labels: {
        context: logEntry.context,
        level: logEntry.level
      },
      annotations: {
        summary: `Error detected in ${logEntry.service}`,
        description: logEntry.message
      },
      notificationsSent: []
    });
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      const systemMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: 0,
          load: [0, 0, 0],
          cores: 4
        },
        memory: {
          total: 16384,
          used: 0,
          free: 16384,
          usage: 0
        },
        disk: {
          total: 500000,
          used: 0,
          free: 500000,
          usage: 0
        },
        network: {
          bytesIn: 0,
          bytesOut: 0,
          connections: 0
        },
        processes: {
          total: 0,
          running: 0,
          sleeping: 0
        }
      };

      this.systemMetricsHistory.push(systemMetrics);
      
      await this.recordMetric({
        name: 'system_cpu_usage',
        value: systemMetrics.cpu.usage,
        unit: 'percent',
        type: 'gauge',
        labels: { service: 'system' },
        service: 'system',
        description: 'CPU usage percentage'
      });

      await this.recordMetric({
        name: 'system_memory_usage',
        value: systemMetrics.memory.usage,
        unit: 'percent',
        type: 'gauge',
        labels: { service: 'system' },
        service: 'system',
        description: 'Memory usage percentage'
      });

      this.trimSystemMetrics();
    }, 30000);
  }

  private startAlertMonitoring(): void {
    setInterval(async () => {
      const activeAlerts = await this.getActiveAlerts();
      
      for (const alert of activeAlerts) {
        const conditionMet = await this.evaluateAlertCondition(alert);
        if (!conditionMet) {
          await this.resolveAlert(alert.id);
        }
      }
    }, 60000);
  }

  private async evaluateAlertCondition(alert: Alert): Promise<boolean> {
    const recentMetrics = await this.getMetrics({
      name: alert.condition.metric,
      service: alert.service,
      timeRange: {
        from: new Date(Date.now() - alert.condition.duration * 1000),
        to: new Date()
      }
    });

    if (recentMetrics.length === 0) return false;

    let value: number;
    switch (alert.condition.aggregation) {
      case 'avg':
        value = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
        break;
      case 'sum':
        value = recentMetrics.reduce((sum, m) => sum + m.value, 0);
        break;
      case 'min':
        value = Math.min(...recentMetrics.map(m => m.value));
        break;
      case 'max':
        value = Math.max(...recentMetrics.map(m => m.value));
        break;
      case 'count':
        value = recentMetrics.length;
        break;
      default:
        value = recentMetrics[recentMetrics.length - 1].value;
    }

    alert.current = value;

    switch (alert.condition.operator) {
      case 'gt': return value > alert.threshold;
      case 'gte': return value >= alert.threshold;
      case 'lt': return value < alert.threshold;
      case 'lte': return value <= alert.threshold;
      case 'eq': return value === alert.threshold;
      case 'ne': return value !== alert.threshold;
      default: return false;
    }
  }

  private trimLogs(): void {
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-8000);
    }
  }

  private trimMetrics(): void {
    if (this.metrics.length > 50000) {
      this.metrics = this.metrics.slice(-40000);
    }
  }

  private trimSystemMetrics(): void {
    if (this.systemMetricsHistory.length > 1000) {
      this.systemMetricsHistory = this.systemMetricsHistory.slice(-800);
    }
  }

  private generateId(): string {
    return `${Date.now()}_${randomUUID()}`;
  }
}