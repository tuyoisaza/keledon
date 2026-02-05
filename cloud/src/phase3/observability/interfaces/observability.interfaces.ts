export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context: string;
  service: string;
  userId?: string;
  sessionId?: string;
  metadata: Record<string, any>;
  tags: string[];
  traceId?: string;
  spanId?: string;
}

export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  labels: Record<string, string>;
  service: string;
  description?: string;
}

export interface Trace {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'ok' | 'error' | 'timeout' | 'cancelled';
  tags: Record<string, any>;
  logs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    fields: Record<string, any>;
  }>;
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved' | 'suppressed';
  condition: AlertCondition;
  threshold: number;
  current: number;
  timestamp: Date;
  resolvedAt?: Date;
  service: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  notificationsSent: string[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  duration: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  grouping?: string[];
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  timeRange: {
    from: Date;
    to: Date;
  };
  refreshInterval: number;
  permissions: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'log' | 'trace' | 'alert';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  queries: MetricQuery[];
  refreshInterval?: number;
}

export interface MetricQuery {
  id: string;
  name: string;
  query: string;
  dataSource: string;
  timeRange?: {
    from: Date;
    to: Date;
  };
  aggregation?: string;
  grouping?: string[];
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  responseTime: number;
  details: Record<string, any>;
  dependencies: HealthCheck[];
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    load: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
}