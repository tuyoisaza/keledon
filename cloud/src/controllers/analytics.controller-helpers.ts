import { randomUUID } from 'crypto';
import { VoiceAnalyticsService } from '../services/voice-analytics.service';
import { IntegrationHealthService } from '../services/integration-health.service';
import { FlowExecutionService } from '../services/flow-execution.service';
import { AgentMonitoringService } from '../services/agent-monitoring.service';
import { SecurityService } from '../services/security.service';
import { SystemMonitoringService } from '../services/system-monitoring.service';
import { AnalyticsFilters } from './analytics.types';

export class AnalyticsControllerHelpers {
  constructor(
    protected readonly voiceAnalyticsService: VoiceAnalyticsService,
    protected readonly integrationHealthService: IntegrationHealthService,
    protected readonly flowExecutionService: FlowExecutionService,
    protected readonly agentMonitoringService: AgentMonitoringService,
    protected readonly securityService: SecurityService,
    protected readonly systemMonitoringService: SystemMonitoringService,
  ) {}

  // Private helper methods
  protected async getVoiceAnalyticsData(
    period: string,
    filters: AnalyticsFilters,
  ) {
    return this.voiceAnalyticsService.getAnalytics(period as any);
  }

  protected async getIntegrationAnalyticsData(
    period: string,
    filters: AnalyticsFilters,
  ) {
    const providers = this.integrationHealthService.getProviders();
    const connectedProviders = providers.filter(
      (p) => p.status === 'connected',
    );

    return {
      totalProviders: providers.length,
      connectedProviders: connectedProviders.length,
      avgResponseTime:
        connectedProviders.reduce(
          (sum, p) => sum + (p.health?.responseTime || 0),
          0,
        ) / connectedProviders.length,
      uptime:
        connectedProviders.reduce(
          (sum, p) => sum + (p.health?.uptime || 0),
          0,
        ) / connectedProviders.length,
    };
  }

  protected async getFlowAnalyticsData(
    period: string,
    filters: AnalyticsFilters,
  ) {
    const executions = this.flowExecutionService.getExecutions();
    const completedFlows = executions.filter((e) => e.status === 'completed');

    return {
      totalExecutions: executions.length,
      completedExecutions: completedFlows.length,
      successRate:
        executions.length > 0
          ? (completedFlows.length / executions.length) * 100
          : 0,
      avgExecutionTime:
        completedFlows.length > 0
          ? completedFlows.reduce((sum, e) => sum + (e.duration || 0), 0) /
            completedFlows.length
          : 0,
    };
  }

  protected async getAgentAnalyticsData(
    period: string,
    filters: AnalyticsFilters,
  ) {
    const agents = this.agentMonitoringService.getAllAgentStatuses();
    const activeAgents = agents.filter((a) => a.status !== 'idle');

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      avgCpuUsage:
        agents.length > 0
          ? agents.reduce((sum, a) => sum + a.performance.cpu, 0) /
            agents.length
          : 0,
      avgMemoryUsage:
        agents.length > 0
          ? agents.reduce((sum, a) => sum + a.performance.memory, 0) /
            agents.length
          : 0,
    };
  }

  protected async getSecurityAnalyticsData(
    period: string,
    filters: AnalyticsFilters,
  ) {
    const events = await this.securityService.getSecurityEvents({
      from: this.getDateFromPeriod(period),
      severity: filters.severities,
    });

    const criticalEvents = events.filter(
      (e) => e.severity === 'critical' || e.severity === 'high',
    );

    return {
      totalEvents: events.length,
      criticalEvents: criticalEvents.length,
      recentEvents: events.slice(-20),
      securityScore:
        events.length > 0
          ? Math.max(0, 100 - (criticalEvents.length / events.length) * 100)
          : 100,
    };
  }

  protected getSystemAnalyticsData() {
    return this.systemMonitoringService.getCurrentMetrics();
  }

  protected calculateOverallHealthScore(metrics: any[]): number {
    const scores = metrics.map((m) => {
      // Simple health scoring based on various metrics
      let score = 100;

      if (m.avgResponseTime > 1000) score -= 20;
      if (m.uptime < 95) score -= 15;
      if (m.successRate < 90) score -= 25;

      return Math.max(0, score);
    });

    return scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 100;
  }

  protected calculateAvgResponseTime(responseTimes: number[]): number {
    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
      : 0;
  }

  protected calculateOverallSuccessRate(successRates: number[]): number {
    return successRates.length > 0
      ? successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length
      : 0;
  }

  protected getSystemHealthGauge(): any {
    const metrics = this.systemMonitoringService.getCurrentMetrics();
    const healthScore = 100 - (metrics.cpu.usage + metrics.memory.usage) / 2;

    return {
      value: Math.round(healthScore),
      status:
        healthScore >= 80 ? 'good' : healthScore >= 60 ? 'warning' : 'critical',
      details: {
        cpu: metrics.cpu.usage.toFixed(1),
        memory: metrics.memory.usage.toFixed(1),
        uptime: metrics.uptime,
      },
    };
  }

  protected async getVoiceAnalyticsChartData(
    period: string,
    filters: AnalyticsFilters,
  ): Promise<any> {
    const analytics = await this.getVoiceAnalyticsData(period, filters);

    return {
      labels: this.getTimeLabels(period),
      datasets: [
        {
          label: 'Conversations',
          data: this.generateTimeSeriesData(
            analytics.totalConversations,
            period,
          ),
        },
        {
          label: 'Sentiment Score',
          data: this.generateTimeSeriesData(
            analytics.sentimentDistribution.positive,
            period,
          ),
        },
      ],
    };
  }

  protected async getFlowExecutionTableData(
    period: string,
    filters: AnalyticsFilters,
  ): Promise<any[]> {
    const executions = this.flowExecutionService
      .getExecutions()
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 50);

    return executions.map((exec) => ({
      id: exec.id,
      name: exec.name,
      status: exec.status,
      duration: exec.duration ? Math.round(exec.duration / 1000) : null,
      progress: exec.progress,
      steps: `${exec.currentStepIndex}/${exec.totalSteps}`,
      lastUpdated: exec.updatedAt,
    }));
  }

  protected async getIntegrationHeatmapData(
    filters: AnalyticsFilters,
  ): Promise<any> {
    const providers = this.integrationHealthService.getProviders();

    return providers.map((provider) => ({
      x: provider.name,
      y: this.getHealthValue(provider.status),
      v: {
        status: provider.status,
        responseTime: provider.health?.responseTime || 0,
        uptime: provider.health?.uptime || 0,
      },
    }));
  }

  protected async getSystemTrendData(period: string): Promise<any> {
    const metrics = this.systemMonitoringService.getMetricsHistory(
      this.getMinutesFromPeriod(period),
    );

    return {
      labels: this.getTimeLabels(period),
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: metrics.map((m) => m.cpu.usage),
          borderColor: '#ef4444',
        },
        {
          label: 'Memory Usage (%)',
          data: metrics.map((m) => m.memory.usage),
          borderColor: '#f59e0b',
        },
        {
          label: 'Network I/O',
          data: metrics.map((m) => m.network.bytesReceived / 1000000), // Convert to MB
          borderColor: '#10b981',
        },
      ],
    };
  }

  protected async getSecurityEventsTableData(
    period: string,
    filters: AnalyticsFilters,
  ): Promise<any[]> {
    const events = await this.securityService.getSecurityEvents({
      from: this.getDateFromPeriod(period),
      severity: filters.severities,
    });

    return events.slice(0, 50).map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      severity: event.severity,
      description: event.description,
      userId: event.userId,
    }));
  }

  protected async generateReportData(
    period: string,
    filters: AnalyticsFilters,
  ): Promise<any> {
    const [
      voiceData,
      integrationData,
      flowData,
      agentData,
      securityData,
      systemData,
    ] = await Promise.all([
      this.getVoiceAnalyticsData(period, filters),
      this.getIntegrationAnalyticsData(period, filters),
      this.getFlowAnalyticsData(period, filters),
      this.getAgentAnalyticsData(period, filters),
      this.getSecurityAnalyticsData(period, filters),
      this.getSystemAnalyticsData(),
    ]);

    return {
      reportPeriod: period,
      generatedAt: new Date().toISOString(),
      voiceAnalytics: voiceData,
      integrationAnalytics: integrationData,
      flowAnalytics: flowData,
      agentAnalytics: agentData,
      securityAnalytics: securityData,
      systemAnalytics: systemData,
    };
  }

  protected getTimeLabels(period: string): string[] {
    const now = new Date();
    const labels: string[] = [];
    const intervals = this.getIntervalsForPeriod(period);

    for (let i = intervals - 1; i >= 0; i--) {
      const date = new Date(
        now.getTime() - i * this.getIntervalMsForPeriod(period),
      );
      labels.push(date.toLocaleTimeString());
    }

    return labels;
  }

  protected generateTimeSeriesData(value: number, period: string): number[] {
    const data: number[] = [];
    const intervals = this.getIntervalsForPeriod(period);

    for (let i = 0; i < intervals; i++) {
      // Deterministic variation (no randomness)
      data.push(value);
    }

    return data;
  }

  protected getMinutesFromPeriod(period: string): number {
    switch (period) {
      case '1h':
        return 60;
      case '24h':
        return 1440;
      case '7d':
        return 10080;
      case '30d':
        return 43200;
      case '90d':
        return 129600;
      default:
        return 1440;
    }
  }

  protected getIntervalsForPeriod(period: string): number {
    return 12; // Show 12 data points for all periods
  }

  protected getIntervalMsForPeriod(period: string): number {
    const minutes = this.getMinutesFromPeriod(period);
    return (minutes * 60 * 1000) / 12;
  }

  protected getDateFromPeriod(period: string): Date {
    const minutes = this.getMinutesFromPeriod(period);
    return new Date(Date.now() - minutes * 60 * 1000);
  }

  protected getHealthValue(status: string): number {
    switch (status) {
      case 'connected':
        return 100;
      case 'error':
        return 25;
      case 'disconnected':
        return 50;
      default:
        return 75;
    }
  }

  protected convertToCSV(data: any): string {
    // Simple CSV conversion
    const headers = Object.keys(data);
    const rows = [headers.join(',')];

    if (Array.isArray(data)) {
      data.forEach((item) => {
        rows.push(headers.map((header) => `"${item[header] || ''}"`).join(','));
      });
    } else {
      rows.push(headers.map((header) => `"${data[header] || ''}"`).join(','));
    }

    return rows.join('\n');
  }

  protected async convertToPDF(data: any): Promise<Buffer> {
    // In a real implementation, this would use a PDF library
    // For now, return a simple text representation
    const text = JSON.stringify(data, null, 2);
    return Buffer.from(text);
  }

  protected generateId(): string {
    return randomUUID();
  }
}
