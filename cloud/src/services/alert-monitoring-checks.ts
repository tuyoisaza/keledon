import { SystemMonitoringService } from './system-monitoring.service';
import { IntegrationHealthService } from './integration-health.service';
import { FlowExecutionService } from './flow-execution.service';
import { VoiceAnalyticsService } from './voice-analytics.service';
import { Alert } from './real-time-alerting.types';

export class AlertMonitoringChecks {
  constructor(
    private readonly systemMonitoringService: SystemMonitoringService,
    private readonly integrationHealthService: IntegrationHealthService,
    private readonly flowExecutionService: FlowExecutionService,
    private readonly voiceAnalyticsService: VoiceAnalyticsService,
    private readonly createAlert: (
      alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>,
    ) => Promise<Alert>,
  ) {}

  async checkSystemAlerts(): Promise<void> {
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
            value:
              alert.type === 'cpu'
                ? metrics.cpu.usage
                : alert.type === 'memory'
                  ? metrics.memory.usage
                  : alert.type === 'disk'
                    ? metrics.disk.usage
                    : 0,
            threshold:
              alert.type === 'cpu' ? 90 : alert.type === 'memory' ? 95 : 85,
          },
          tags: ['system', alert.type, alert.level],
        });
      }
    } catch (error) {
      console.error('RealTimeAlerting: Failed to check system alerts:', error);
    }
  }

  async checkIntegrationAlerts(): Promise<void> {
    try {
      const providers = this.integrationHealthService.getProviders();
      const failedProviders = providers.filter((p) => p.status === 'error');

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
            health: provider.health,
          },
          tags: ['integration', 'provider-failed', provider.category],
        });
      }
    } catch (error) {
      console.error(
        'RealTimeAlerting: Failed to check integration alerts:',
        error,
      );
    }
  }

  async checkFlowAlerts(): Promise<void> {
    try {
      const executions = this.flowExecutionService.getExecutions({
        limit: 100,
      });
      const failedExecutions = executions.filter(
        (e) => e.status === 'failed' && !e.endTime,
      );

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
            stepCount: execution.currentStepIndex,
          },
          tags: ['flow', 'execution-failed', 'rpa'],
        });
      }
    } catch (error) {
      console.error('RealTimeAlerting: Failed to check flow alerts:', error);
    }
  }

  async checkVoiceAlerts(): Promise<void> {
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
            threshold: 40,
          },
          tags: ['voice', 'sentiment', 'customer-satisfaction'],
        });
      }
    } catch (error) {
      console.error('RealTimeAlerting: Failed to check voice alerts:', error);
    }
  }
}
