import { Controller, Get, Post, Query, Body, HttpException, HttpStatus, Param } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { VoiceAnalyticsService } from '../services/voice-analytics.service';
import { IntegrationHealthService } from '../services/integration-health.service';
import { FlowExecutionService } from '../services/flow-execution.service';
import { AgentMonitoringService } from '../services/agent-monitoring.service';
import { SecurityService } from '../services/security.service';
import { SystemMonitoringService } from '../services/system-monitoring.service';

export interface AnalyticsTimeRange {
  from?: string;
  to?: string;
  period?: '1h' | '24h' | '7d' | '30d' | '90d';
  timezone?: string;
}

export interface AnalyticsFilters {
  agentIds?: string[];
  flowIds?: string[];
  providerIds?: string[];
  tags?: string[];
  severities?: string[];
}

export interface FlowFilters {
  agentIds?: string[];
  flowIds?: string[];
  providerIds?: string[];
  tags?: string[];
  severities?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'gauge' | 'trend';
  title: string;
  description?: string;
  config: any;
  data: any;
  lastUpdated: Date;
  refreshInterval?: number; // seconds
}

// Helper type for widget array response
interface DashboardWidgetResponse {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'gauge' | 'trend';
  title: string;
  description?: string;
  config: any;
  data: any;
  lastUpdated: Date;
  refreshInterval?: number;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: {
    columns: number;
    widgets: Array<{
      widgetId: string;
      row: number;
      col: number;
      width: number;
      height: number;
    }>;
  };
}

@Controller('api/analytics')
export class AnalyticsController {
  constructor(
    private readonly voiceAnalyticsService: VoiceAnalyticsService,
    private readonly integrationHealthService: IntegrationHealthService,
    private readonly flowExecutionService: FlowExecutionService,
    private readonly agentMonitoringService: AgentMonitoringService,
    private readonly securityService: SecurityService,
    private readonly systemMonitoringService: SystemMonitoringService
  ) {
    console.log('AnalyticsController: Initialized with advanced analytics');
  }

  @Get('dashboard/overview')
  async getDashboardOverview(
    @Query() timeRange: AnalyticsTimeRange,
    @Query() filters: AnalyticsFilters = {}
  ): Promise<{
    success: boolean;
    data: {
      totalMetrics: any;
      healthScore: number;
      activeUsers: number;
      systemLoad: any;
      recentAlerts: any;
      performance: any;
    };
    timestamp: string;
  }> {
    try {
      const period = timeRange.period || '24h';
      
      // Get metrics from all services
      const [voiceMetrics, integrationMetrics, flowMetrics, agentMetrics, securityMetrics, systemMetrics] = await Promise.all([
        this.getVoiceAnalyticsData(period, filters),
        this.getIntegrationAnalyticsData(period, filters),
        this.getFlowAnalyticsData(period, filters),
        this.getAgentAnalyticsData(period, filters),
        this.getSecurityAnalyticsData(period, filters),
        this.getSystemAnalyticsData()
      ]);

      // Calculate overall health score
      const healthScore = this.calculateOverallHealthScore([
        voiceMetrics,
        integrationMetrics,
        flowMetrics,
        systemMetrics
      ]);

      const overviewData = {
        totalMetrics: {
          conversations: voiceMetrics.totalConversations,
          flows: flowMetrics.totalExecutions,
          integrations: integrationMetrics.totalProviders,
          agents: agentMetrics.totalAgents,
          alerts: securityMetrics.totalEvents
        },
        healthScore,
        activeUsers: agentMetrics.activeAgents,
        systemLoad: {
          cpu: systemMetrics.cpu.usage,
          memory: systemMetrics.memory.usage,
          disk: systemMetrics.disk.usage
        },
        recentAlerts: securityMetrics.recentEvents.slice(0, 5),
        performance: {
          avgResponseTime: this.calculateAvgResponseTime([
            integrationMetrics.avgResponseTime,
            flowMetrics.avgExecutionTime
          ]),
          successRate: this.calculateOverallSuccessRate([
            voiceMetrics.successRate,
            flowMetrics.successRate
          ]),
          uptime: systemMetrics.uptime
        }
      };

      return {
        success: true,
        data: overviewData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AnalyticsController: Error getting dashboard overview', error);
      throw new HttpException('Failed to get dashboard overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/widgets')
  async getDashboardWidgets(
    @Query() timeRange: AnalyticsTimeRange,
    @Query() filters: AnalyticsFilters = {}
  ): Promise<{
    success: boolean;
    data: any[];
    timestamp: string;
  }> {
    try {
      const period = timeRange.period || '24h';
      const widgets: DashboardWidgetResponse[] = [
        // System Health Widget
        {
          id: 'system-health',
          type: 'gauge',
          title: 'System Health',
          description: 'Overall system health score',
          config: {
            min: 0,
            max: 100,
            thresholds: {
              good: 80,
              warning: 60,
              critical: 40
            },
            colors: {
              good: '#10b981',
              warning: '#f59e0b',
              critical: '#ef4444'
            }
          },
          data: this.getSystemHealthGauge() as any,
          lastUpdated: new Date(),
          refreshInterval: 30
        },
        
        // Voice Analytics Widget
        {
          id: 'voice-analytics',
          type: 'chart',
          title: 'Voice Analytics',
          description: 'Conversation volume and sentiment trends',
          config: {
            chartType: 'line',
            datasets: [
              {
                label: 'Conversations',
                yAxisID: 'conversations',
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
              },
              {
                label: 'Sentiment Score',
                yAxisID: 'sentiment',
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
              }
            ],
            timeScale: true,
            responsive: true
          },
          data: await this.getVoiceAnalyticsChartData(period, filters),
          lastUpdated: new Date(),
          refreshInterval: 60
        },
        
        // Flow Execution Widget
        {
          id: 'flow-execution',
          type: 'table' as const,
          title: 'Recent Flow Executions',
          description: 'Latest RPA flow executions and their status',
          config: {
            columns: [
              { key: 'name', label: 'Flow Name', sortable: true },
              { key: 'status', label: 'Status', sortable: true },
              { key: 'duration', label: 'Duration', sortable: true },
              { key: 'progress', label: 'Progress', sortable: true }
            ],
            pagination: true,
            pageSize: 10
          },
          data: await this.getFlowExecutionTableData(period, filters),
          lastUpdated: new Date(),
          refreshInterval: 30
        },
        
        // Integration Health Widget
        {
          id: 'integration-health',
          type: 'heatmap',
          title: 'Integration Health',
          description: 'Real-time health status of all integrations',
          config: {
            xAxis: 'Provider',
            yAxis: 'Status',
            colorScale: 'RdYlGn',
            responsive: true
          },
          data: await this.getIntegrationHeatmapData(filters),
          lastUpdated: new Date(),
          refreshInterval: 120
        },
        
        // System Metrics Widget
        {
          id: 'system-metrics',
          type: 'trend',
          title: 'System Performance',
          description: 'CPU, Memory, and Network usage trends',
          config: {
            metrics: ['cpu', 'memory', 'network'],
            timeScale: true,
            responsive: true
          },
          data: await this.getSystemTrendData(period),
          lastUpdated: new Date(),
          refreshInterval: 15
        },
        
        // Security Events Widget
        {
          id: 'security-events',
          type: 'table',
          title: 'Security Events',
          description: 'Recent security events and alerts',
          config: {
            columns: [
              { key: 'timestamp', label: 'Time', sortable: true, type: 'datetime' },
              { key: 'type', label: 'Type', sortable: true, type: 'badge' },
              { key: 'severity', label: 'Severity', sortable: true, type: 'severity' },
              { key: 'description', label: 'Description', sortable: false }
            ],
            pagination: true,
            pageSize: 15
          },
          data: await this.getSecurityEventsTableData(period, filters),
          lastUpdated: new Date(),
          refreshInterval: 30
        }
      ];

      return {
        success: true,
        data: widgets,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AnalyticsController: Error getting dashboard widgets', error);
      throw new HttpException('Failed to get dashboard widgets', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/layouts')
  async getDashboardLayouts(): Promise<{
    success: boolean;
    data: DashboardLayout[];
    timestamp: string;
  }> {
    try {
      const layouts: DashboardLayout[] = [
        {
          id: 'default',
          name: 'Default Dashboard',
          description: 'Standard layout for most users',
          widgets: ['system-health', 'voice-analytics', 'flow-execution', 'integration-health'],
          layout: {
            columns: 3,
            widgets: [
              { widgetId: 'system-health', row: 0, col: 0, width: 2, height: 1 },
              { widgetId: 'voice-analytics', row: 0, col: 2, width: 3, height: 2 },
              { widgetId: 'flow-execution', row: 2, col: 0, width: 3, height: 2 },
              { widgetId: 'integration-health', row: 2, col: 3, width: 3, height: 2 }
            ]
          }
        },
        {
          id: 'operations',
          name: 'Operations Dashboard',
          description: 'Focused on operational metrics',
          widgets: ['system-health', 'flow-execution', 'system-metrics', 'security-events'],
          layout: {
            columns: 2,
            widgets: [
              { widgetId: 'system-health', row: 0, col: 0, width: 1, height: 1 },
              { widgetId: 'flow-execution', row: 0, col: 1, width: 1, height: 2 },
              { widgetId: 'system-metrics', row: 1, col: 0, width: 1, height: 2 },
              { widgetId: 'security-events', row: 1, col: 1, width: 1, height: 2 }
            ]
          }
        },
        {
          id: 'executive',
          name: 'Executive Dashboard',
          description: 'High-level overview for executives',
          widgets: ['system-health', 'voice-analytics', 'integration-health'],
          layout: {
            columns: 2,
            widgets: [
              { widgetId: 'system-health', row: 0, col: 0, width: 1, height: 1 },
              { widgetId: 'voice-analytics', row: 0, col: 1, width: 1, height: 2 },
              { widgetId: 'integration-health', row: 1, col: 0, width: 1, height: 1 }
            ]
          }
        }
      ];

      return {
        success: true,
        data: layouts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AnalyticsController: Error getting dashboard layouts', error);
      throw new HttpException('Failed to get dashboard layouts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('dashboard/layouts')
  async createDashboardLayout(@Body() layoutData: {
    name: string;
    description: string;
    widgets: string[];
    layout: DashboardLayout['layout'];
  }): Promise<{
    success: boolean;
    data: DashboardLayout;
    timestamp: string;
  }> {
    try {
      const newLayout: DashboardLayout = {
        id: this.generateId(),
        name: layoutData.name,
        description: layoutData.description,
        widgets: layoutData.widgets,
        layout: layoutData.layout
      };

      return {
        success: true,
        data: newLayout,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AnalyticsController: Error creating dashboard layout', error);
      throw new HttpException('Failed to create dashboard layout', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('reports/export')
  async exportAnalyticsReport(
    @Query() timeRange: AnalyticsTimeRange,
    @Query() format: 'json' | 'csv' | 'pdf' = 'json',
    @Query() filters: AnalyticsFilters = {}
  ): Promise<{
    success: boolean;
    data: any;
    filename: string;
    mimeType: string;
    timestamp: string;
  }> {
    try {
      const period = timeRange.period || '24h';
      const reportData = await this.generateReportData(period, filters);

      let filename: string;
      let mimeType: string;
      let data: any;

      switch (format) {
        case 'csv':
          filename = `keledon-analytics-${period}-${Date.now()}.csv`;
          mimeType = 'text/csv';
          data = this.convertToCSV(reportData);
          break;
        case 'pdf':
          filename = `keledon-analytics-${period}-${Date.now()}.pdf`;
          mimeType = 'application/pdf';
          data = await this.convertToPDF(reportData);
          break;
        default:
          filename = `keledon-analytics-${period}-${Date.now()}.json`;
          mimeType = 'application/json';
          data = JSON.stringify(reportData, null, 2);
      }

      return {
        success: true,
        data,
        filename,
        mimeType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AnalyticsController: Error exporting analytics report', error);
      throw new HttpException('Failed to export analytics report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('realtime')
  async getRealTimeData(
    @Query() types: string = 'system,voice,flows,integrations'
  ): Promise<{
    success: boolean;
    data: {
      system: any;
      voice: any;
      flows: any;
      integrations: any;
    };
    timestamp: string;
  }> {
    try {
      const typesArray = types.split(',');
      const data: any = {};

      if (typesArray.includes('system')) {
        data.system = this.systemMonitoringService.getCurrentMetrics();
      }

      if (typesArray.includes('voice')) {
        data.voice = this.voiceAnalyticsService.getAnalytics('1h');
      }

      if (typesArray.includes('flows')) {
        data.flows = this.flowExecutionService.getExecutions({ limit: 20 });
      }

      if (typesArray.includes('integrations')) {
        data.integrations = this.integrationHealthService.getProviders();
      }

      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AnalyticsController: Error getting real-time data', error);
      throw new HttpException('Failed to get real-time data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Private helper methods
  private async getVoiceAnalyticsData(period: string, filters: AnalyticsFilters) {
    return this.voiceAnalyticsService.getAnalytics(period as any);
  }

  private async getIntegrationAnalyticsData(period: string, filters: AnalyticsFilters) {
    const providers = this.integrationHealthService.getProviders();
    const connectedProviders = providers.filter(p => p.status === 'connected');
    
    return {
      totalProviders: providers.length,
      connectedProviders: connectedProviders.length,
      avgResponseTime: connectedProviders.reduce((sum, p) => 
        sum + (p.health?.responseTime || 0), 0) / connectedProviders.length,
      uptime: connectedProviders.reduce((sum, p) => 
        sum + (p.health?.uptime || 0), 0) / connectedProviders.length
    };
  }

  private async getFlowAnalyticsData(period: string, filters: AnalyticsFilters) {
    const executions = this.flowExecutionService.getExecutions();
    const completedFlows = executions.filter(e => e.status === 'completed');
    
    return {
      totalExecutions: executions.length,
      completedExecutions: completedFlows.length,
      successRate: executions.length > 0 ? (completedFlows.length / executions.length) * 100 : 0,
      avgExecutionTime: completedFlows.length > 0 ? 
        completedFlows.reduce((sum, e) => sum + (e.duration || 0), 0) / completedFlows.length : 0
    };
  }

  private async getAgentAnalyticsData(period: string, filters: AnalyticsFilters) {
    const agents = this.agentMonitoringService.getAllAgentStatuses();
    const activeAgents = agents.filter(a => a.status !== 'idle');
    
    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      avgCpuUsage: agents.length > 0 ? 
        agents.reduce((sum, a) => sum + a.performance.cpu, 0) / agents.length : 0,
      avgMemoryUsage: agents.length > 0 ? 
        agents.reduce((sum, a) => sum + a.performance.memory, 0) / agents.length : 0
    };
  }

  private async getSecurityAnalyticsData(period: string, filters: AnalyticsFilters) {
    const events = await this.securityService.getSecurityEvents({
      from: this.getDateFromPeriod(period),
      severity: filters.severities
    });
    
    const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'emergency');
    
    return {
      totalEvents: events.length,
      criticalEvents: criticalEvents.length,
      recentEvents: events.slice(-20),
      securityScore: events.length > 0 ? Math.max(0, 100 - (criticalEvents.length / events.length) * 100) : 100
    };
  }

  private getSystemAnalyticsData() {
    return this.systemMonitoringService.getCurrentMetrics();
  }

  private calculateOverallHealthScore(metrics: any[]): number {
    const scores = metrics.map(m => {
      // Simple health scoring based on various metrics
      let score = 100;
      
      if (m.avgResponseTime > 1000) score -= 20;
      if (m.uptime < 95) score -= 15;
      if (m.successRate < 90) score -= 25;
      
      return Math.max(0, score);
    });
    
    return scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 100;
  }

  private calculateAvgResponseTime(responseTimes: number[]): number {
    return responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
  }

  private calculateOverallSuccessRate(successRates: number[]): number {
    return successRates.length > 0 ? 
      successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length : 0;
  }

  private getSystemHealthGauge(): any {
    const metrics = this.systemMonitoringService.getCurrentMetrics();
    const healthScore = 100 - ((metrics.cpu.usage + metrics.memory.usage) / 2);
    
    return {
      value: Math.round(healthScore),
      status: healthScore >= 80 ? 'good' : healthScore >= 60 ? 'warning' : 'critical',
      details: {
        cpu: metrics.cpu.usage.toFixed(1),
        memory: metrics.memory.usage.toFixed(1),
        uptime: metrics.uptime
      }
    };
  }

  private async getVoiceAnalyticsChartData(period: string, filters: AnalyticsFilters): Promise<any> {
    const analytics = await this.getVoiceAnalyticsData(period, filters);
    
    return {
      labels: this.getTimeLabels(period),
      datasets: [
        {
          label: 'Conversations',
          data: this.generateTimeSeriesData(analytics.totalConversations, period),
        },
        {
          label: 'Sentiment Score',
          data: this.generateTimeSeriesData(analytics.sentimentDistribution.positive, period),
        }
      ]
    };
  }

  private async getFlowExecutionTableData(period: string, filters: AnalyticsFilters): Promise<any[]> {
    const executions = this.flowExecutionService.getExecutions({
      limit: 50,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
    
    return executions.map(exec => ({
      id: exec.id,
      name: exec.name,
      status: exec.status,
      duration: exec.duration ? Math.round(exec.duration / 1000) : null,
      progress: exec.progress,
      steps: `${exec.currentStepIndex}/${exec.totalSteps}`,
      lastUpdated: exec.updatedAt
    }));
  }

  private async getIntegrationHeatmapData(filters: AnalyticsFilters): Promise<any> {
    const providers = this.integrationHealthService.getProviders();
    
    return providers.map(provider => ({
      x: provider.name,
      y: this.getHealthValue(provider.status),
      v: {
        status: provider.status,
        responseTime: provider.health?.responseTime || 0,
        uptime: provider.health?.uptime || 0
      }
    }));
  }

  private async getSystemTrendData(period: string): Promise<any> {
    const metrics = this.systemMonitoringService.getMetricsHistory(this.getMinutesFromPeriod(period));
    
    return {
      labels: this.getTimeLabels(period),
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: metrics.map(m => m.cpu.usage),
          borderColor: '#ef4444'
        },
        {
          label: 'Memory Usage (%)',
          data: metrics.map(m => m.memory.usage),
          borderColor: '#f59e0b'
        },
        {
          label: 'Network I/O',
          data: metrics.map(m => m.network.bytesReceived / 1000000), // Convert to MB
          borderColor: '#10b981'
        }
      ]
    };
  }

  private async getSecurityEventsTableData(period: string, filters: AnalyticsFilters): Promise<any[]> {
    const events = await this.securityService.getSecurityEvents({
      from: this.getDateFromPeriod(period),
      severity: filters.severities
    });
    
    return events.slice(0, 50).map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      severity: event.severity,
      description: event.description,
      userId: event.userId
    }));
  }

  private async generateReportData(period: string, filters: AnalyticsFilters): Promise<any> {
    const [voiceData, integrationData, flowData, agentData, securityData, systemData] = await Promise.all([
      this.getVoiceAnalyticsData(period, filters),
      this.getIntegrationAnalyticsData(period, filters),
      this.getFlowAnalyticsData(period, filters),
      this.getAgentAnalyticsData(period, filters),
      this.getSecurityAnalyticsData(period, filters),
      this.getSystemAnalyticsData()
    ]);

    return {
      reportPeriod: period,
      generatedAt: new Date().toISOString(),
      voiceAnalytics: voiceData,
      integrationAnalytics: integrationData,
      flowAnalytics: flowData,
      agentAnalytics: agentData,
      securityAnalytics: securityData,
      systemAnalytics: systemData
    };
  }

  private getTimeLabels(period: string): string[] {
    const now = new Date();
    const labels: string[] = [];
    const intervals = this.getIntervalsForPeriod(period);
    
    for (let i = intervals - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * this.getIntervalMsForPeriod(period));
      labels.push(date.toLocaleTimeString());
    }
    
    return labels;
  }

  private generateTimeSeriesData(value: number, period: string): number[] {
    const data: number[] = [];
    const intervals = this.getIntervalsForPeriod(period);
    
    for (let i = 0; i < intervals; i++) {
      // Deterministic variation (no randomness)
      data.push(value);
    }
    
    return data;
  }

  private getMinutesFromPeriod(period: string): number {
    switch (period) {
      case '1h': return 60;
      case '24h': return 1440;
      case '7d': return 10080;
      case '30d': return 43200;
      case '90d': return 129600;
      default: return 1440;
    }
  }

  private getIntervalsForPeriod(period: string): number {
    return 12; // Show 12 data points for all periods
  }

  private getIntervalMsForPeriod(period: string): number {
    const minutes = this.getMinutesFromPeriod(period);
    return (minutes * 60 * 1000) / 12;
  }

  private getDateFromPeriod(period: string): Date {
    const minutes = this.getMinutesFromPeriod(period);
    return new Date(Date.now() - minutes * 60 * 1000);
  }

  private getHealthValue(status: string): number {
    switch (status) {
      case 'connected': return 100;
      case 'error': return 25;
      case 'disconnected': return 50;
      default: return 75;
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion
    const headers = Object.keys(data);
    const rows = [headers.join(',')];
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        rows.push(headers.map(header => `"${item[header] || ''}"`).join(','));
      });
    } else {
      rows.push(headers.map(header => `"${data[header] || ''}"`).join(','));
    }
    
    return rows.join('\n');
  }

  private async convertToPDF(data: any): Promise<Buffer> {
    // In a real implementation, this would use a PDF library
    // For now, return a simple text representation
    const text = JSON.stringify(data, null, 2);
    return Buffer.from(text);
  }

  private generateId(): string {
    return randomUUID();
  }
}