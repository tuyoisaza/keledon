export interface Alert {
  id: string;
  type:
    | 'system'
    | 'integration'
    | 'flow'
    | 'voice'
    | 'security'
    | 'performance';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  metadata: Record<string, any>;
  acknowledged: boolean;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  tags: string[];
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push' | 'dashboard';
  enabled: boolean;
  config: NotificationChannelConfig;
  filters: AlertFilter[];
}

export interface NotificationChannelConfig {
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    template?: string;
  };
  slack?: {
    webhook: string;
    channel: string;
    username?: string;
    icon?: string;
  };
  webhook?: {
    url: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    retryAttempts?: number;
  };
  sms?: {
    to: string[];
    provider: 'twilio' | 'aws-sns' | 'nexmo';
    template?: string;
  };
  push?: {
    service: 'fcm' | 'apns' | 'web-push';
    tokens: string[];
    title?: string;
  };
  dashboard?: {
    enabled: boolean;
    priority: boolean;
  };
}

export interface AlertFilter {
  type?: Alert['type'][];
  severity?: Alert['severity'][];
  source?: string[];
  tags?: string[];
  minSeverity?: Alert['severity'];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: AlertCondition;
  action: AlertAction;
  cooldownMinutes: number;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne' | 'contains' | 'regex';
  threshold: any;
  duration?: number; // seconds
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

export interface AlertAction {
  channels: string[];
  template?: string;
  escalation?: AlertEscalation;
}

export interface AlertEscalation {
  enabled: boolean;
  delay: number; // minutes
  channels: string[];
  condition?: AlertCondition;
}
