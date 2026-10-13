import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, interval, Subscription } from 'rxjs';
import { randomUUID } from 'crypto';
import { AlertNotificationDispatcher } from './alert-notifications';
import { AlertMonitoringChecks } from './alert-monitoring-checks';
import {
  getDefaultAlertRules,
  getDefaultNotificationChannels,
} from './alerting.defaults';
import { SystemMonitoringService } from './system-monitoring.service';
import { IntegrationHealthService } from './integration-health.service';
import { FlowExecutionService } from './flow-execution.service';
import { VoiceAnalyticsService } from './voice-analytics.service';

import {
  Alert,
  AlertRule,
  NotificationChannel,
} from './real-time-alerting.types';
export type {
  Alert,
  AlertAction,
  AlertCondition,
  AlertEscalation,
  AlertFilter,
  AlertRule,
  NotificationChannel,
  NotificationChannelConfig,
} from './real-time-alerting.types';
@Injectable()
export class RealTimeAlertingService implements OnModuleInit, OnModuleDestroy {
  private readonly monitoringChecks: AlertMonitoringChecks;
  private readonly notificationDispatcher: AlertNotificationDispatcher;
  private alerts = new Map<string, Alert>();
  private channels = new Map<string, NotificationChannel>();
  private rules = new Map<string, AlertRule>();

  private alertSubject = new Subject<Alert>();
  private notificationSubject = new Subject<{
    alert: Alert;
    channel: NotificationChannel;
    success: boolean;
  }>();

  private monitoringIntervals: Subscription[] = [];
  private cooldownTimers = new Map<string, ReturnType<typeof setTimeout>>();

  public alerts$ = this.alertSubject.asObservable();
  public notifications$ = this.notificationSubject.asObservable();

  constructor(
    private readonly systemMonitoringService: SystemMonitoringService,
    private readonly integrationHealthService: IntegrationHealthService,
    private readonly flowExecutionService: FlowExecutionService,
    private readonly voiceAnalyticsService: VoiceAnalyticsService,
  ) {
    this.monitoringChecks = new AlertMonitoringChecks(
      this.systemMonitoringService,
      this.integrationHealthService,
      this.flowExecutionService,
      this.voiceAnalyticsService,
      (alert) => this.createAlert(alert),
    );
    this.notificationDispatcher = new AlertNotificationDispatcher(
      this.channels,
      this.notificationSubject,
    );
    console.log('RealTimeAlertingService: Initialized');
  }

  onModuleInit() {
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
    this.startMonitoring();
    console.log(
      'RealTimeAlertingService: Started monitoring with real-time alerts',
    );
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }

  // Create a new alert
  async createAlert(
    alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>,
  ): Promise<Alert> {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
    };

    this.alerts.set(fullAlert.id, fullAlert);
    this.alertSubject.next(fullAlert);

    // Process alert rules
    await this.processAlertRules(fullAlert);

    // Send notifications
    await this.sendNotifications(fullAlert);

    console.log(
      `RealTimeAlerting: Created alert ${fullAlert.id} - ${fullAlert.title}`,
    );
    return fullAlert;
  }

  // Acknowledge an alert
  acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return Promise.resolve(false);

    alert.acknowledged = true;
    alert.metadata.acknowledgedBy = userId;
    alert.metadata.acknowledgedAt = new Date();

    this.alertSubject.next({ ...alert });
    console.log(`RealTimeAlerting: Alert ${alertId} acknowledged by ${userId}`);
    return Promise.resolve(true);
  }

  // Resolve an alert
  resolveAlert(
    alertId: string,
    userId: string,
    resolution?: string,
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return Promise.resolve(false);

    alert.resolved = true;
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    if (resolution) {
      alert.metadata.resolution = resolution;
    }

    this.alertSubject.next({ ...alert });
    console.log(`RealTimeAlerting: Alert ${alertId} resolved by ${userId}`);
    return Promise.resolve(true);
  }

  // Get all alerts
  getAlerts(
    filters: {
      type?: Alert['type'];
      severity?: Alert['severity'];
      acknowledged?: boolean;
      resolved?: boolean;
      source?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Alert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (filters.type) {
      alerts = alerts.filter((alert) => filters.type.includes(alert.type));
    }
    if (filters.severity) {
      alerts = alerts.filter((alert) =>
        filters.severity.includes(alert.severity),
      );
    }
    if (filters.acknowledged !== undefined) {
      alerts = alerts.filter(
        (alert) => alert.acknowledged === filters.acknowledged,
      );
    }
    if (filters.resolved !== undefined) {
      alerts = alerts.filter((alert) => alert.resolved === filters.resolved);
    }
    if (filters.source) {
      alerts = alerts.filter((alert) => alert.source.includes(filters.source));
    }
    if (filters.from) {
      alerts = alerts.filter((alert) => alert.timestamp >= filters.from);
    }
    if (filters.to) {
      alerts = alerts.filter((alert) => alert.timestamp <= filters.to);
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
      to: timeRange.to,
    });

    const stats = {
      total: alerts.length,
      byType: {} as Record<Alert['type'], number>,
      bySeverity: {} as Record<Alert['severity'], number>,
      acknowledged: alerts.filter((a) => a.acknowledged).length,
      resolved: alerts.filter((a) => a.resolved).length,
      avgResolutionTime: 0,
      critical: 0,
      emergency: 0,
    };

    // Count by type and severity
    alerts.forEach((alert) => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      stats.bySeverity[alert.severity] =
        (stats.bySeverity[alert.severity] || 0) + 1;
    });

    // Calculate average resolution time
    const resolvedAlerts = alerts.filter((a) => a.resolved && a.resolvedAt);
    if (resolvedAlerts.length > 0) {
      const totalResolutionTime = resolvedAlerts.reduce(
        (sum, alert) =>
          sum + (alert.resolvedAt.getTime() - alert.timestamp.getTime()),
        0,
      );
      stats.avgResolutionTime = totalResolutionTime / resolvedAlerts.length;
    }

    // Count critical and emergency
    stats.critical = alerts.filter((a) => a.severity === 'critical').length;
    stats.emergency = alerts.filter((a) => a.severity === 'emergency').length;

    return stats;
  }

  // Create notification channel
  createChannel(channel: Omit<NotificationChannel, 'id'>): NotificationChannel {
    const fullChannel: NotificationChannel = {
      ...channel,
      id: this.generateChannelId(),
    };

    this.channels.set(fullChannel.id, fullChannel);
    console.log(
      `RealTimeAlerting: Created notification channel ${fullChannel.id}`,
    );
    return fullChannel;
  }

  // Update notification channel
  updateChannel(
    channelId: string,
    updates: Partial<NotificationChannel>,
  ): boolean {
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
      console.log(
        `RealTimeAlerting: Deleted notification channel ${channelId}`,
      );
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
      tags: ['test'],
    };

    try {
      const success = await this.sendNotificationToChannel(testAlert, channel);

      this.notificationSubject.next({
        alert: testAlert,
        channel,
        success,
      });

      console.log(
        `RealTimeAlerting: Test notification ${success ? 'sent' : 'failed'} to channel ${channelId}`,
      );
      return success;
    } catch (error) {
      console.error(
        `RealTimeAlerting: Failed to test channel ${channelId}:`,
        error,
      );
      return false;
    }
  }

  // Create alert rule
  createRule(
    rule: Omit<AlertRule, 'id' | 'lastTriggered' | 'triggerCount'>,
  ): AlertRule {
    const fullRule: AlertRule = {
      ...rule,
      id: this.generateRuleId(),
      lastTriggered: undefined,
      triggerCount: 0,
    };

    this.rules.set(fullRule.id, fullRule);
    console.log(
      `RealTimeAlerting: Created alert rule ${fullRule.id} - ${fullRule.name}`,
    );
    return fullRule;
  }

  // Get all alert rules
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // Private helper methods
  private initializeDefaultChannels(): void {
    getDefaultNotificationChannels().forEach((channel) =>
      this.createChannel(channel),
    );
  }

  private initializeDefaultRules(): void {
    getDefaultAlertRules().forEach((rule) => this.createRule(rule));
  }

  private startMonitoring(): void {
    // System monitoring
    this.monitoringIntervals.push(
      interval(30000).subscribe(() => {
        void this.monitoringChecks.checkSystemAlerts();
      }),
    );

    // Integration monitoring
    this.monitoringIntervals.push(
      interval(60000).subscribe(() => {
        void this.monitoringChecks.checkIntegrationAlerts();
      }),
    );

    // Flow execution monitoring
    this.monitoringIntervals.push(
      interval(10000).subscribe(() => {
        void this.monitoringChecks.checkFlowAlerts();
      }),
    );

    // Voice analytics monitoring
    this.monitoringIntervals.push(
      interval(120000).subscribe(() => {
        void this.monitoringChecks.checkVoiceAlerts();
      }),
    );

    console.log('RealTimeAlerting: Started monitoring intervals');
  }

  private stopMonitoring(): void {
    this.monitoringIntervals.forEach((interval) => interval.unsubscribe());
    this.monitoringIntervals = [];

    // Clear cooldown timers
    this.cooldownTimers.forEach((timer) => clearTimeout(timer));
    this.cooldownTimers.clear();
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
    if (
      !rule.condition.metric.includes('.') &&
      alert.type !== rule.condition.metric
    )
      return false;

    // Check severity filter
    const minSeverity = this.getRuleMinSeverity(rule);
    if (
      this.getSeverityLevel(alert.severity) < this.getSeverityLevel(minSeverity)
    )
      return false;

    return true;
  }

  private async triggerRule(
    ruleId: string,
    rule: AlertRule,
    alert: Alert,
  ): Promise<void> {
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

    console.log(
      `RealTimeAlerting: Triggered alert rule ${ruleId} for alert ${alert.id}`,
    );
  }

  private isInCooldown(ruleId: string, rule: AlertRule): boolean {
    return Boolean(
      rule.lastTriggered &&
      Date.now() - rule.lastTriggered.getTime() <
        rule.cooldownMinutes * 60 * 1000,
    );
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
              if (
                this.getSeverityLevel(severity) <
                this.getSeverityLevel(minSeverity)
              ) {
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
    const levels = { info: 1, warning: 2, critical: 3, emergency: 4 };
    return levels[severity] || 1;
  }

  private sendNotifications(alert: Alert): Promise<void> {
    return this.notificationDispatcher.sendNotifications(alert);
  }

  private sendNotificationToChannel(
    alert: Alert,
    channel: NotificationChannel,
  ): Promise<boolean> {
    return this.notificationDispatcher.sendNotificationToChannel(
      alert,
      channel,
    );
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${randomUUID()}`;
  }

  private generateChannelId(): string {
    return `channel_${Date.now()}_${randomUUID()}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${randomUUID()}`;
  }
}
