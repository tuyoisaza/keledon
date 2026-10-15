import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminGuard } from '../guards/roles.guard';
import { VoiceAnalyticsService } from '../services/voice-analytics.service';
import { IntegrationHealthService } from '../services/integration-health.service';
import { FlowExecutionService } from '../services/flow-execution.service';
import { AgentMonitoringService } from '../services/agent-monitoring.service';
import { SecurityService } from '../services/security.service';
import { SystemMonitoringService } from '../services/system-monitoring.service';

import {
  AnalyticsTimeRange,
  AnalyticsFilters,
  DashboardWidgetResponse,
  DashboardLayout,
} from './analytics.types';
import { AnalyticsControllerHelpers } from './analytics.controller-helpers';

@Controller('api/analytics')
@UseGuards(SuperAdminGuard)
export class AnalyticsController extends AnalyticsControllerHelpers {
  constructor(
    protected readonly voiceAnalyticsService: VoiceAnalyticsService,
    protected readonly integrationHealthService: IntegrationHealthService,
    protected readonly flowExecutionService: FlowExecutionService,
    protected readonly agentMonitoringService: AgentMonitoringService,
    protected readonly securityService: SecurityService,
    protected readonly systemMonitoringService: SystemMonitoringService,
  ) {
    super(
      voiceAnalyticsService,
      integrationHealthService,
      flowExecutionService,
      agentMonitoringService,
      securityService,
      systemMonitoringService,
    );
    console.log('AnalyticsController: Initialized with advanced analytics');
  }

  @Get('dashboard/overview')
  async getDashboardOverview(
    @Query() timeRange: AnalyticsTimeRange,
    @Query() filters: AnalyticsFilters = {},
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
      const [
        voiceMetrics,
        integrationMetrics,
        flowMetrics,
        agentMetrics,
        securityMetrics,
        systemMetrics,
      ] = await Promise.all([
        this.getVoiceAnalyticsData(period, filters),
        this.getIntegrationAnalyticsData(period, filters),
        this.getFlowAnalyticsData(period, filters),
        this.getAgentAnalyticsData(period, filters),
        this.getSecurityAnalyticsData(period, filters),
        Promise.resolve(this.getSystemAnalyticsData()),
      ]);

      // Calculate overall health score
      const healthScore = this.calculateOverallHealthScore([
        voiceMetrics,
        integrationMetrics,
        flowMetrics,
        systemMetrics,
      ]);

      const overviewData = {
        totalMetrics: {
          conversations: voiceMetrics.totalConversations,
          flows: flowMetrics.totalExecutions,
          integrations: integrationMetrics.totalProviders,
          agents: agentMetrics.totalAgents,
          alerts: securityMetrics.totalEvents,
        },
        healthScore,
        activeUsers: agentMetrics.activeAgents,
        systemLoad: {
          cpu: systemMetrics.cpu.usage,
          memory: systemMetrics.memory.usage,
          disk: systemMetrics.disk.usage,
        },
        recentAlerts: securityMetrics.recentEvents.slice(0, 5),
        performance: {
          avgResponseTime: this.calculateAvgResponseTime([
            integrationMetrics.avgResponseTime,
            flowMetrics.avgExecutionTime,
          ]),
          successRate: this.calculateOverallSuccessRate([
            voiceMetrics.successRate,
            flowMetrics.successRate,
          ]),
          uptime: systemMetrics.uptime,
        },
      };

      return {
        success: true,
        data: overviewData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        'AnalyticsController: Error getting dashboard overview',
        error,
      );
      throw new HttpException(
        'Failed to get dashboard overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard/widgets')
  async getDashboardWidgets(
    @Query() timeRange: AnalyticsTimeRange,
    @Query() filters: AnalyticsFilters = {},
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
              critical: 40,
            },
            colors: {
              good: '#10b981',
              warning: '#f59e0b',
              critical: '#ef4444',
            },
          },
          data: this.getSystemHealthGauge(),
          lastUpdated: new Date(),
          refreshInterval: 30,
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
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              },
              {
                label: 'Sentiment Score',
                yAxisID: 'sentiment',
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
              },
            ],
            timeScale: true,
            responsive: true,
          },
          data: await this.getVoiceAnalyticsChartData(period, filters),
          lastUpdated: new Date(),
          refreshInterval: 60,
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
              { key: 'progress', label: 'Progress', sortable: true },
            ],
            pagination: true,
            pageSize: 10,
          },
          data: await this.getFlowExecutionTableData(period, filters),
          lastUpdated: new Date(),
          refreshInterval: 30,
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
            responsive: true,
          },
          data: await this.getIntegrationHeatmapData(filters),
          lastUpdated: new Date(),
          refreshInterval: 120,
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
            responsive: true,
          },
          data: await this.getSystemTrendData(period),
          lastUpdated: new Date(),
          refreshInterval: 15,
        },

        // Security Events Widget
        {
          id: 'security-events',
          type: 'table',
          title: 'Security Events',
          description: 'Recent security events and alerts',
          config: {
            columns: [
              {
                key: 'timestamp',
                label: 'Time',
                sortable: true,
                type: 'datetime',
              },
              { key: 'type', label: 'Type', sortable: true, type: 'badge' },
              {
                key: 'severity',
                label: 'Severity',
                sortable: true,
                type: 'severity',
              },
              { key: 'description', label: 'Description', sortable: false },
            ],
            pagination: true,
            pageSize: 15,
          },
          data: await this.getSecurityEventsTableData(period, filters),
          lastUpdated: new Date(),
          refreshInterval: 30,
        },
      ];

      return {
        success: true,
        data: widgets,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        'AnalyticsController: Error getting dashboard widgets',
        error,
      );
      throw new HttpException(
        'Failed to get dashboard widgets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('dashboard/layouts')
  getDashboardLayouts(): Promise<{
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
          widgets: [
            'system-health',
            'voice-analytics',
            'flow-execution',
            'integration-health',
          ],
          layout: {
            columns: 3,
            widgets: [
              {
                widgetId: 'system-health',
                row: 0,
                col: 0,
                width: 2,
                height: 1,
              },
              {
                widgetId: 'voice-analytics',
                row: 0,
                col: 2,
                width: 3,
                height: 2,
              },
              {
                widgetId: 'flow-execution',
                row: 2,
                col: 0,
                width: 3,
                height: 2,
              },
              {
                widgetId: 'integration-health',
                row: 2,
                col: 3,
                width: 3,
                height: 2,
              },
            ],
          },
        },
        {
          id: 'operations',
          name: 'Operations Dashboard',
          description: 'Focused on operational metrics',
          widgets: [
            'system-health',
            'flow-execution',
            'system-metrics',
            'security-events',
          ],
          layout: {
            columns: 2,
            widgets: [
              {
                widgetId: 'system-health',
                row: 0,
                col: 0,
                width: 1,
                height: 1,
              },
              {
                widgetId: 'flow-execution',
                row: 0,
                col: 1,
                width: 1,
                height: 2,
              },
              {
                widgetId: 'system-metrics',
                row: 1,
                col: 0,
                width: 1,
                height: 2,
              },
              {
                widgetId: 'security-events',
                row: 1,
                col: 1,
                width: 1,
                height: 2,
              },
            ],
          },
        },
        {
          id: 'executive',
          name: 'Executive Dashboard',
          description: 'High-level overview for executives',
          widgets: ['system-health', 'voice-analytics', 'integration-health'],
          layout: {
            columns: 2,
            widgets: [
              {
                widgetId: 'system-health',
                row: 0,
                col: 0,
                width: 1,
                height: 1,
              },
              {
                widgetId: 'voice-analytics',
                row: 0,
                col: 1,
                width: 1,
                height: 2,
              },
              {
                widgetId: 'integration-health',
                row: 1,
                col: 0,
                width: 1,
                height: 1,
              },
            ],
          },
        },
      ];

      return Promise.resolve({
        success: true,
        data: layouts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        'AnalyticsController: Error getting dashboard layouts',
        error,
      );
      return Promise.reject(
        new HttpException(
          'Failed to get dashboard layouts',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    }
  }

  @Post('dashboard/layouts')
  createDashboardLayout(
    @Body()
    layoutData: {
      name: string;
      description: string;
      widgets: string[];
      layout: DashboardLayout['layout'];
    },
  ): Promise<{
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
        layout: layoutData.layout,
      };

      return Promise.resolve({
        success: true,
        data: newLayout,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        'AnalyticsController: Error creating dashboard layout',
        error,
      );
      return Promise.reject(
        new HttpException(
          'Failed to create dashboard layout',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    }
  }

  @Get('reports/export')
  async exportAnalyticsReport(
    @Query() timeRange: AnalyticsTimeRange,
    @Query() format: 'json' | 'csv' | 'pdf' = 'json',
    @Query() filters: AnalyticsFilters = {},
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
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        'AnalyticsController: Error exporting analytics report',
        error,
      );
      throw new HttpException(
        'Failed to export analytics report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('realtime')
  getRealTimeData(
    @Query() types: string = 'system,voice,flows,integrations',
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

      return Promise.resolve({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('AnalyticsController: Error getting real-time data', error);
      return Promise.reject(
        new HttpException(
          'Failed to get real-time data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    }
  }
}
