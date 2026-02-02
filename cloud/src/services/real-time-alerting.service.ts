import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { SystemMonitoringService } from './system-monitoring.service';
import { IntegrationHealthService } from './integration-health.service';
import { FlowExecutionService } from './flow-execution.service';
import { VoiceAnalyticsService } from './voice-analytics.service';

export interface Alert {
  id: string;
  type: 'system' | 'integration' | 'flow' | 'voice' | 'security' | 'performance';
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

@Injectable()
export class RealTimeAlertingService implements OnModuleInit, OnModuleDestroy {
  private alerts = new Map<string, Alert>();
  private channels = new Map<string, NotificationChannel>();
  private rules = new Map<string, AlertRule>();
  
  private alertSubject = new Subject<Alert>();
  private notificationSubject = new Subject<{ alert: Alert; channel: NotificationChannel; success: boolean }>();
  
  private monitoringIntervals: any[] = [];
  private cooldownTimers = new Map<string, any>();
  
  public alerts$ = this.alertSubject.asObservable();
  public notifications$ = this.notificationSubject.asObservable();

  constructor(
    private readonly systemMonitoringService: SystemMonitoringService,
    private readonly integrationHealthService: IntegrationHealthService,
    private readonly flowExecutionService: FlowExecutionService,
    private readonly voiceAnalyticsService: VoiceAnalyticsService
  ) {
    console.log('RealTimeAlertingService: Initialized');
  }

  onModuleInit() {
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
    this.startMonitoring();
    console.log('RealTimeAlertingService: Started monitoring with real-time alerts');
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }

  // Create a new alert
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): Promise<Alert> {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      resolved: false
    };

    this.alerts.set(fullAlert.id, fullAlert);
    this.alertSubject.next(fullAlert);

    // Process alert rules
    await this.processAlertRules(fullAlert);

    // Send notifications
    await this.sendNotifications(fullAlert);

    console.log(`RealTimeAlerting: Created alert ${fullAlert.id} - ${fullAlert.title}`);
    return fullAlert;
  }

  // Acknowledge an alert
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.metadata.acknowledgedBy = userId;
    alert.metadata.acknowledgedAt = new Date();

    this.alertSubject.next({ ...alert });
    console.log(`RealTimeAlerting: Alert ${alertId} acknowledged by ${userId}`);
    return true;
  }

  // Resolve an alert
  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    if (resolution) {
      alert.metadata.resolution = resolution;
    }

    this.alertSubject.next({ ...alert });
    console.log(`RealTimeAlerting: Alert ${alertId} resolved by ${userId}`);
    return true;
  }

  // Get all alerts
  getAlerts(filters: {
    type?: Alert['type'];
    severity?: Alert['severity'];
    acknowledged?: boolean;
    resolved?: boolean;
    source?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  } = {}): Alert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (filters.type) {
      alerts = alerts.filter(alert => filters.type!.includes(alert.type));
    }
    if (filters.severity) {
      alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
    }
    if (filters.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === filters.acknowledged);
    }
    if (filters.resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === filters.resolved);
    }
    if (filters.source) {
      alerts = alerts.filter(alert => alert.source.includes(filters.source!));
    }
    if (filters.from) {
      alerts = alerts.filter(alert => alert.timestamp >= filters.from!);
    }
    if (filters.to) {
      alerts = alerts.filter(alert => alert.timestamp <= filters.to!);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Pagination
    if (filters.offset) {
      alerts = alerts.slice(filters.offset);
    }
    if (filters.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return alerts;
  }

  // Get alert statistics
  getAlertStats(timeRange: { from: Date; to: Date }): {
    total: number;
    byType: Record<Alert['type'], number>;
    bySeverity: Record<Alert['severity'], number>;
    acknowledged: number;
    resolved: number;
    avgResolutionTime: number;
    critical: number;
    emergency: number;
  } {
    const alerts = this.getAlerts({
      from: timeRange.from,
      to: timeRange.to
    });

    const stats = {
      total: alerts.length,
      byType: {} as Record<Alert['type'], number>,
      bySeverity: {} as Record<Alert['severity'], number>,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      resolved: alerts.filter(a => a.resolved).length,
      avgResolutionTime: 0,
      critical: 0,
      emergency: 0
    };

    // Count by type and severity
    alerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
    });

    // Calculate average resolution time
    const resolvedAlerts = alerts.filter(a => a.resolved && a.resolvedAt);
    if (resolvedAlerts.length > 0) {
      const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => 
        sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime()), 0);
      stats.avgResolutionTime = totalResolutionTime / resolvedAlerts.length;
    }

    // Count critical and emergency
    stats.critical = alerts.filter(a => a.severity === 'critical').length;
    stats.emergency = alerts.filter(a => a.severity === 'emergency').length;

    return stats;
  }

  // Create notification channel
  createChannel(channel: Omit<NotificationChannel, 'id'>): NotificationChannel {
    const fullChannel: NotificationChannel = {
      ...channel,
      id: this.generateChannelId()
    };

    this.channels.set(fullChannel.id, fullChannel);
    console.log(`RealTimeAlerting: Created notification channel ${fullChannel.id}`);
    return fullChannel;
  }

  // Update notification channel
  updateChannel(channelId: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const updated = { ...channel, ...updates };
    this.channels.set(channelId, updated);
    console.log(`RealTimeAlerting: Updated notification channel ${channelId}`);
    return true;
  }

  // Delete notification channel
  deleteChannel(channelId: string): boolean {
    const deleted = this.channels.delete(channelId);
    if (deleted) {
      console.log(`RealTimeAlerting: Deleted notification channel ${channelId}`);
    }
    return deleted;
  }

  // Get all notification channels
  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  // Test notification channel
  async testChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const testAlert: Alert = {
      id: this.generateAlertId(),
      type: 'system',
      severity: 'info',
      title: 'Test Alert',
      message: 'This is a test alert from KELEDON',
      source: 'RealTimeAlertingService',
      timestamp: new Date(),
      metadata: { test: true },
      acknowledged: false,
      resolved: false,
      tags: ['test']
    };

    try {
      const success = await this.sendNotificationToChannel(testAlert, channel);
      
      this.notificationSubject.next({
        alert: testAlert,
        channel,
        success
      });

      console.log(`RealTimeAlerting: Test notification ${success ? 'sent' : 'failed'} to channel ${channelId}`);
      return success;
    } catch (error) {
      console.error(`RealTimeAlerting: Failed to test channel ${channelId}:`, error);
      return false;
    }
  }

  // Create alert rule
  createRule(rule: Omit<AlertRule, 'id' | 'lastTriggered' | 'triggerCount'>): AlertRule {
    const fullRule: AlertRule = {
      ...rule,
      id: this.generateRuleId(),
      lastTriggered: undefined,
      triggerCount: 0
    };

    this.rules.set(fullRule.id, fullRule);
    console.log(`RealTimeAlerting: Created alert rule ${fullRule.id} - ${fullRule.name}`);
    return fullRule;
  }

  // Get all alert rules
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // Private helper methods
  private initializeDefaultChannels(): void {
    const defaultChannels: Omit<NotificationChannel, 'id'>[] = [
      {
        name: 'Dashboard Notifications',
        type: 'dashboard',
        enabled: true,
        config: { dashboard: { enabled: true, priority: true } },
        filters: [{ severity: ['warning', 'critical', 'emergency'] }]
      },
      {
        name: 'Email Alerts',
        type: 'email',
        enabled: true,
        config: {
          email: {
            to: [process.env.ADMIN_EMAIL || 'admin@keledon.com'],
            template: 'alert-email'
          }
        },
        filters: [{ severity: ['critical', 'emergency'] }]
      }
    ];

    defaultChannels.forEach(channel => this.createChannel(channel));
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<AlertRule, 'id' | 'lastTriggered' | 'triggerCount'>[] = [
      {
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 90%',
        enabled: true,
        condition: {
          metric: 'cpu.usage',
          operator: 'gt',
          threshold: 90,
          duration: 300 // 5 minutes
        },
        action: {
          channels: ['dashboard', 'email']
        },
        cooldownMinutes: 15
      },
      {
        name: 'Memory Usage Critical',
        description: 'Alert when memory usage exceeds 95%',
        enabled: true,
        condition: {
          metric: 'memory.usage',
          operator: 'gt',
          threshold: 95,
          duration: 60 // 1 minute
        },
        action: {
          channels: ['dashboard', 'email']
        },
        cooldownMinutes: 10
      },
      {
        name: 'Provider Connection Failed',
        description: 'Alert when integration provider fails',
        enabled: true,
        condition: {
          metric: 'provider.status',
          operator: 'eq',
          threshold: 'error'
        },
        action: {
          channels: ['dashboard']
        },
        cooldownMinutes: 5
      },
      {
        name: 'Flow Execution Failed',
        description: 'Alert when RPA flow execution fails',
        enabled: true,
        condition: {
          metric: 'flow.status',
          operator: 'eq',
          threshold: 'failed'
        },
        action: {
          channels: ['dashboard']
        },
        cooldownMinutes: 2
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
          duration: 600 // 10 minutes
        },
        action: {
          channels: ['dashboard']
        },
        cooldownMinutes: 30
      }
    ];

    defaultRules.forEach(rule => this.createRule(rule));
  }

  private startMonitoring(): void {
    // System monitoring
    this.monitoringIntervals.push(
      interval(30000).subscribe(() => this.checkSystemAlerts())
    );

    // Integration monitoring
    this.monitoringIntervals.push(
      interval(60000).subscribe(() => this.checkIntegrationAlerts())
    );

    // Flow execution monitoring
    this.monitoringIntervals.push(
      interval(10000).subscribe(() => this.checkFlowAlerts())
    );

    // Voice analytics monitoring
    this.monitoringIntervals.push(
      interval(120000).subscribe(() => this.checkVoiceAlerts())
    );

    console.log('RealTimeAlerting: Started monitoring intervals');
  }

  private stopMonitoring(): void {
    this.monitoringIntervals.forEach(interval => interval.unsubscribe());
    this.monitoringIntervals = [];

    // Clear cooldown timers
    this.cooldownTimers.forEach(timer => clearTimeout(timer));
    this.cooldownTimers.clear();
  }

  private async checkSystemAlerts(): Promise<void> {
    try {
      const metrics = this.systemMonitoringService.getCurrentMetrics();
      const alerts = this.systemMonitoringService.getPerformanceAlerts();

      for (const alert of alerts) {
        await this.createAlert({
          type: 'system',
          severity: alert.level === 'critical' ? 'critical' : 'warning',
          title: `System ${alert.type} Alert`,
          message: alert.message,
          source: 'SystemMonitoringService',
          metadata: {
            metric: alert.type,
            value: alert.type === 'cpu' ? metrics.cpu.usage : 
                   alert.type === 'memory' ? metrics.memory.usage :
                   alert.type === 'disk' ? metrics.disk.usage : 0,
            threshold: alert.type === 'cpu' ? 90 : alert.type === 'memory' ? 95 : 85
          },
          tags: ['system', alert.type, alert.level]
        });
      }
    } catch (error) {
      console.error('RealTimeAlerting: Failed to check system alerts:', error);
    }
  }

  private async checkIntegrationAlerts(): Promise<void> {
    try {
      const providers = this.integrationHealthService.getProviders();
      const failedProviders = providers.filter(p => p.status === 'error');

      for (const provider of failedProviders) {
        await this.createAlert({
          type: 'integration',
          severity: 'critical',
          title: `Provider ${provider.name} Failed`,
          message: `Integration provider ${provider.name} is in error state`,
          source: 'IntegrationHealthService',
          metadata: {
            providerId: provider.id,
            providerName: provider.name,
            category: provider.category,
            health: provider.health
          },
          tags: ['integration', 'provider-failed', provider.category]
        });
      }
    } catch (error) {
      console.error('RealTimeAlerting: Failed to check integration alerts:', error);
    }
  }

  private async checkFlowAlerts(): Promise<void> {
    try {
      const executions = this.flowExecutionService.getExecutions({ limit: 100 });
      const failedExecutions = executions.filter(e => e.status === 'failed' && !e.endTime);

      for (const execution of failedExecutions) {
        await this.createAlert({
          type: 'flow',
          severity: 'critical',
          title: `Flow Execution Failed: ${execution.name}`,
          message: `RPA flow "${execution.name}" failed: ${execution.error}`,
          source: 'FlowExecutionService',
          metadata: {
            executionId: execution.id,
            flowName: execution.name,
            error: execution.error,
            stepCount: execution.currentStepIndex
          },
          tags: ['flow', 'execution-failed', 'rpa']
        });
      }
    } catch (error) {
      console.error('RealTimeAlerting: Failed to check flow alerts:', error);
    }
  }

  private async checkVoiceAlerts(): Promise<void> {
    try {
      const analytics = this.voiceAnalyticsService.getAnalytics('24h');
      
      if (analytics.sentimentDistribution.negative > 40) {
        await this.createAlert({
          type: 'voice',
          severity: 'warning',
          title: 'High Negative Sentiment Detected',
          message: `Customer sentiment analysis shows ${analytics.sentimentDistribution.negative}% negative sentiment`,
          source: 'VoiceAnalyticsService',
          metadata: {
            sentimentDistribution: analytics.sentimentDistribution,
            totalConversations: analytics.totalConversations,
            threshold: 40
          },
          tags: ['voice', 'sentiment', 'customer-satisfaction']
        });
      }
    } catch (error) {
      console.error('RealTimeAlerting: Failed to check voice alerts:', error);
    }
  }

  private async processAlertRules(alert: Alert): Promise<void> {
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (this.isInCooldown(ruleId, rule)) continue;

      // Check if alert matches rule condition
      if (this.alertMatchesRule(alert, rule)) {
        await this.triggerRule(ruleId, rule, alert);
      }
    }
  }

  private alertMatchesRule(alert: Alert, rule: AlertRule): boolean {
    // Check type filter
    if (rule.condition.metric.includes('.') && !alert.type) return false;
    if (!rule.condition.metric.includes('.') && alert.type !== rule.condition.metric) return false;

    // Check severity filter
    const minSeverity = this.getRuleMinSeverity(rule);
    if (this.getSeverityLevel(alert.severity) < this.getSeverityLevel(minSeverity)) return false;

    return true;
  }

  private async triggerRule(ruleId: string, rule: AlertRule, alert: Alert): Promise<void> {
    rule.lastTriggered = new Date();
    rule.triggerCount++;

    // Set cooldown
    this.setCooldown(ruleId, rule.cooldownMinutes * 60 * 1000);

    // Send notifications through configured channels
    for (const channelId of rule.action.channels) {
      const channel = this.channels.get(channelId);
      if (channel && channel.enabled) {
        await this.sendNotificationToChannel(alert, channel);
      }
    }

    console.log(`RealTimeAlerting: Triggered alert rule ${ruleId} for alert ${alert.id}`);
  }

  private isInCooldown(ruleId: string, rule: AlertRule): boolean {
    return rule.lastTriggered && 
           (Date.now() - rule.lastTriggered.getTime()) < (rule.cooldownMinutes * 60 * 1000);
  }

  private setCooldown(ruleId: string, duration: number): void {
    const existingTimer = this.cooldownTimers.get(ruleId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.cooldownTimers.delete(ruleId);
    }, duration);

    this.cooldownTimers.set(ruleId, timer);
  }

  private getRuleMinSeverity(rule: AlertRule): Alert['severity'] {
    const channelIds = rule.action.channels;
    let minSeverity: Alert['severity'] = 'emergency';

    for (const channelId of channelIds) {
      const channel = this.channels.get(channelId);
      if (channel && channel.filters.length > 0) {
        for (const filter of channel.filters) {
          if (filter.severity) {
            for (const severity of filter.severity) {
              if (this.getSeverityLevel(severity) < this.getSeverityLevel(minSeverity)) {
                minSeverity = severity;
              }
            }
          }
        }
      }
    }

    return minSeverity;
  }

  private getSeverityLevel(severity: Alert['severity']): number {
    const levels = { 'info': 1, 'warning': 2, 'critical': 3, 'emergency': 4 };
    return levels[severity] || 1;
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    for (const [channelId, channel] of this.channels.entries()) {
      if (!channel.enabled) continue;
      if (!this.channelMatchesAlert(channel, alert)) continue;

      try {
        const success = await this.sendNotificationToChannel(alert, channel);
        
        this.notificationSubject.next({
          alert,
          channel,
          success
        });
      } catch (error) {
        console.error(`RealTimeAlerting: Failed to send notification to channel ${channelId}:`, error);
      }
    }
  }

  private channelMatchesAlert(channel: NotificationChannel, alert: Alert): boolean {
    for (const filter of channel.filters) {
      if (filter.type && !filter.type.includes(alert.type)) return false;
      if (filter.severity && !filter.severity.includes(alert.severity)) return false;
      if (filter.source && !filter.source.some(source => alert.source.includes(source))) return false;
      if (filter.tags && !filter.tags.some(tag => alert.tags.includes(tag))) return false;
      if (filter.minSeverity && this.getSeverityLevel(alert.severity) < this.getSeverityLevel(filter.minSeverity)) return false;
    }
    return true;
  }

  private async sendNotificationToChannel(alert: Alert, channel: NotificationChannel): Promise<boolean> {
    try {
      switch (channel.type) {
        case 'email':
          return await this.sendEmailNotification(alert, channel.config.email!);
        case 'slack':
          return await this.sendSlackNotification(alert, channel.config.slack!);
        case 'webhook':
          return await this.sendWebhookNotification(alert, channel.config.webhook!);
        case 'sms':
          return await this.sendSMSNotification(alert, channel.config.sms!);
        case 'push':
          return await this.sendPushNotification(alert, channel.config.push!);
        case 'dashboard':
          return await this.sendDashboardNotification(alert, channel.config.dashboard!);
        default:
          return false;
      }
    } catch (error) {
      console.error(`RealTimeAlerting: Failed to send ${channel.type} notification:`, error);
      return false;
    }
  }

  private async sendEmailNotification(alert: Alert, config: NotificationChannelConfig['email']): Promise<boolean> {
    // In a real implementation, this would use an email service
    console.log(`Email notification to ${config.to?.join(', ')}: ${alert.title}`);
    return true;
  }

  private async sendSlackNotification(alert: Alert, config: NotificationChannelConfig['slack']): Promise<boolean> {
    // In a real implementation, this would send to Slack webhook
    console.log(`Slack notification to ${config.channel}: ${alert.title}`);
    return true;
  }

  private async sendWebhookNotification(alert: Alert, config: NotificationChannelConfig['webhook']): Promise<boolean> {
    // In a real implementation, this would send HTTP request to webhook
    console.log(`Webhook notification to ${config.url}: ${alert.title}`);
    return true;
  }

  private async sendSMSNotification(alert: Alert, config: NotificationChannelConfig['sms']): Promise<boolean> {
    // In a real implementation, this would use SMS provider
    console.log(`SMS notification to ${config.to?.join(', ')}: ${alert.title}`);
    return true;
  }

  private async sendPushNotification(alert: Alert, config: NotificationChannelConfig['push']): Promise<boolean> {
    // In a real implementation, this would use push notification service
    console.log(`Push notification to ${config.tokens?.length} devices: ${alert.title}`);
    return true;
  }

  private async sendDashboardNotification(alert: Alert, config: NotificationChannelConfig['dashboard']): Promise<boolean> {
    if (!config.enabled) return false;
    
    // Dashboard notifications are already handled by the alertSubject
    console.log(`Dashboard notification: ${alert.title}`);
    return true;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChannelId(): string {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}