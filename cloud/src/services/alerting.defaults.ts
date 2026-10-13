import { AlertRule, NotificationChannel } from './real-time-alerting.types';

export function getDefaultNotificationChannels(): Omit<
  NotificationChannel,
  'id'
>[] {
  const defaultChannels: Omit<NotificationChannel, 'id'>[] = [
    {
      name: 'Dashboard Notifications',
      type: 'dashboard',
      enabled: true,
      config: { dashboard: { enabled: true, priority: true } },
      filters: [{ severity: ['warning', 'critical', 'emergency'] }],
    },
    {
      name: 'Email Alerts',
      type: 'email',
      enabled: true,
      config: {
        email: {
          to: [process.env.ADMIN_EMAIL || 'admin@keledon.com'],
          template: 'alert-email',
        },
      },
      filters: [{ severity: ['critical', 'emergency'] }],
    },
  ];

  return defaultChannels;
}

export function getDefaultAlertRules(): Omit<
  AlertRule,
  'id' | 'lastTriggered' | 'triggerCount'
>[] {
  const defaultRules: Omit<
    AlertRule,
    'id' | 'lastTriggered' | 'triggerCount'
  >[] = [
    {
      name: 'High CPU Usage',
      description: 'Alert when CPU usage exceeds 90%',
      enabled: true,
      condition: {
        metric: 'cpu.usage',
        operator: 'gt',
        threshold: 90,
        duration: 300, // 5 minutes
      },
      action: {
        channels: ['dashboard', 'email'],
      },
      cooldownMinutes: 15,
    },
    {
      name: 'Memory Usage Critical',
      description: 'Alert when memory usage exceeds 95%',
      enabled: true,
      condition: {
        metric: 'memory.usage',
        operator: 'gt',
        threshold: 95,
        duration: 60, // 1 minute
      },
      action: {
        channels: ['dashboard', 'email'],
      },
      cooldownMinutes: 10,
    },
    {
      name: 'Provider Connection Failed',
      description: 'Alert when integration provider fails',
      enabled: true,
      condition: {
        metric: 'provider.status',
        operator: 'eq',
        threshold: 'error',
      },
      action: {
        channels: ['dashboard'],
      },
      cooldownMinutes: 5,
    },
    {
      name: 'Flow Execution Failed',
      description: 'Alert when RPA flow execution fails',
      enabled: true,
      condition: {
        metric: 'flow.status',
        operator: 'eq',
        threshold: 'failed',
      },
      action: {
        channels: ['dashboard'],
      },
      cooldownMinutes: 2,
    },
    {
      name: 'Negative Sentiment Spike',
      description: 'Alert when negative sentiment exceeds 30%',
      enabled: true,
      condition: {
        metric: 'voice.sentiment.negative',
        operator: 'gt',
        threshold: 30,
        aggregation: 'avg',
        duration: 600, // 10 minutes
      },
      action: {
        channels: ['dashboard'],
      },
      cooldownMinutes: 30,
    },
  ];

  return defaultRules;
}
