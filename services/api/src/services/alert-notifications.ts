import { Subject } from 'rxjs';
import {
  Alert,
  NotificationChannel,
  NotificationChannelConfig,
} from './real-time-alerting.types';

export class AlertNotificationDispatcher {
  constructor(
    private readonly channels: Map<string, NotificationChannel>,
    private readonly notificationSubject: Subject<{
      alert: Alert;
      channel: NotificationChannel;
      success: boolean;
    }>,
  ) {}

  private getSeverityLevel(severity: Alert['severity']): number {
    const levels = { info: 1, warning: 2, critical: 3, emergency: 4 };
    return levels[severity] || 1;
  }

  async sendNotifications(alert: Alert): Promise<void> {
    for (const [channelId, channel] of this.channels.entries()) {
      if (!channel.enabled) continue;
      if (!this.channelMatchesAlert(channel, alert)) continue;

      try {
        const success = await this.sendNotificationToChannel(alert, channel);

        this.notificationSubject.next({
          alert,
          channel,
          success,
        });
      } catch (error) {
        console.error(
          `RealTimeAlerting: Failed to send notification to channel ${channelId}:`,
          error,
        );
      }
    }
  }

  private channelMatchesAlert(
    channel: NotificationChannel,
    alert: Alert,
  ): boolean {
    for (const filter of channel.filters) {
      if (filter.type && !filter.type.includes(alert.type)) return false;
      if (filter.severity && !filter.severity.includes(alert.severity))
        return false;
      if (
        filter.source &&
        !filter.source.some((source) => alert.source.includes(source))
      )
        return false;
      if (filter.tags && !filter.tags.some((tag) => alert.tags.includes(tag)))
        return false;
      if (
        filter.minSeverity &&
        this.getSeverityLevel(alert.severity) <
          this.getSeverityLevel(filter.minSeverity)
      )
        return false;
    }
    return true;
  }

  async sendNotificationToChannel(
    alert: Alert,
    channel: NotificationChannel,
  ): Promise<boolean> {
    try {
      switch (channel.type) {
        case 'email':
          return await this.sendEmailNotification(alert, channel.config.email);
        case 'slack':
          return await this.sendSlackNotification(alert, channel.config.slack);
        case 'webhook':
          return await this.sendWebhookNotification(
            alert,
            channel.config.webhook,
          );
        case 'sms':
          return await this.sendSMSNotification(alert, channel.config.sms);
        case 'push':
          return await this.sendPushNotification(alert, channel.config.push);
        case 'dashboard':
          return await this.sendDashboardNotification(
            alert,
            channel.config.dashboard,
          );
        default:
          return false;
      }
    } catch (error) {
      console.error(
        `RealTimeAlerting: Failed to send ${channel.type} notification:`,
        error,
      );
      return false;
    }
  }

  private sendEmailNotification(
    alert: Alert,
    config: NotificationChannelConfig['email'],
  ): Promise<boolean> {
    // In a real implementation, this would use an email service
    console.log(
      `Email notification to ${config.to?.join(', ')}: ${alert.title}`,
    );
    return Promise.resolve(true);
  }

  private sendSlackNotification(
    alert: Alert,
    config: NotificationChannelConfig['slack'],
  ): Promise<boolean> {
    // In a real implementation, this would send to Slack webhook
    console.log(`Slack notification to ${config.channel}: ${alert.title}`);
    return Promise.resolve(true);
  }

  private sendWebhookNotification(
    alert: Alert,
    config: NotificationChannelConfig['webhook'],
  ): Promise<boolean> {
    // In a real implementation, this would send HTTP request to webhook
    console.log(`Webhook notification to ${config.url}: ${alert.title}`);
    return Promise.resolve(true);
  }

  private sendSMSNotification(
    alert: Alert,
    config: NotificationChannelConfig['sms'],
  ): Promise<boolean> {
    // In a real implementation, this would use SMS provider
    console.log(`SMS notification to ${config.to?.join(', ')}: ${alert.title}`);
    return Promise.resolve(true);
  }

  private sendPushNotification(
    alert: Alert,
    config: NotificationChannelConfig['push'],
  ): Promise<boolean> {
    // In a real implementation, this would use push notification service
    console.log(
      `Push notification to ${config.tokens?.length} devices: ${alert.title}`,
    );
    return Promise.resolve(true);
  }

  private sendDashboardNotification(
    alert: Alert,
    config: NotificationChannelConfig['dashboard'],
  ): Promise<boolean> {
    if (!config.enabled) return Promise.resolve(false);

    // Dashboard notifications are already handled by the alertSubject
    console.log(`Dashboard notification: ${alert.title}`);
    return Promise.resolve(true);
  }
}
