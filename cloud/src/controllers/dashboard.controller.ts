import { Controller, Get, Post, Query, Body, HttpException, HttpStatus, Param } from '@nestjs/common';
import { AgentMonitoringService, AgentStatus, SystemHealth } from '../services/agent-monitoring.service';
import { AILoopService } from '../services/ai-loop.service';

export interface AgentStatusFilters {
  status?: string;
  capability?: string;
}

export interface TimeRange {
  from?: string;
  to?: string;
  period?: '1h' | '24h' | '7d' | '30d';
}

@Controller('api/dashboard')
export class DashboardController {
  constructor(
    private readonly agentMonitoringService: AgentMonitoringService,
    private readonly aiLoopService: AILoopService
  ) {
    console.log('DashboardController: Initialized');
  }

  @Get('agents/status')
  async getAgentStatus(@Query() filters: AgentStatusFilters) {
    try {
      const agents = this.agentMonitoringService.getAllAgentStatuses();
      
      let filteredAgents = agents;
      if (filters.status) {
        filteredAgents = agents.filter(agent => agent.status === filters.status);
      }
      if (filters.capability) {
        filteredAgents = filteredAgents.filter(agent => 
          agent.capabilities.includes(filters.capability || '')
        );
      }

      return {
        success: true,
        data: filteredAgents,
        total: filteredAgents.length,
        filters: filters
      };
    } catch (error) {
      console.error('DashboardController: Error getting agent status', error);
      throw new HttpException('Failed to get agent status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('system/health')
  async getSystemHealth() {
    try {
      const health = this.agentMonitoringService.getCurrentHealth();
      
      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('DashboardController: Error getting system health', error);
      throw new HttpException('Failed to get system health', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('ai/loops')
  async getAILoops(@Query() timeRange: TimeRange) {
    try {
      const loops = this.aiLoopService.getAllLoops();
      
      // Apply time filtering if provided
      let filteredLoops = loops;
      if (timeRange.from) {
        const fromDate = new Date(timeRange.from);
        filteredLoops = filteredLoops.filter(loop => 
          loop.startTime && loop.startTime >= fromDate
        );
      }
      
      return {
        success: true,
        data: filteredLoops,
        total: filteredLoops.length,
        timeRange: timeRange
      };
    } catch (error) {
      console.error('DashboardController: Error getting AI loops', error);
      throw new HttpException('Failed to get AI loops', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('ai/loops')
  async createAILoop(@Body() body: { name?: string; }) {
    try {
      const loop = this.aiLoopService.createLoop(body.name || undefined);
      
      return {
        success: true,
        data: loop,
        message: 'AI Loop created successfully'
      };
    } catch (error) {
      console.error('DashboardController: Error creating AI loop', error);
      throw new HttpException('Failed to create AI loop', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('ai/loops/:loopId/start')
  async startAILoop(@Param('loopId') loopId: string) {
    try {
      this.aiLoopService.startLoop(loopId);
      
      return {
        success: true,
        message: `AI Loop ${loopId} started`
      };
    } catch (error) {
      console.error('DashboardController: Error starting AI loop', error);
      throw new HttpException('Failed to start AI loop', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('ai/loops/:loopId/reset')
  async resetAILoop(@Param('loopId') loopId: string) {
    try {
      this.aiLoopService.resetLoop(loopId);
      
      return {
        success: true,
        message: `AI Loop ${loopId} reset`
      };
    } catch (error) {
      console.error('DashboardController: Error resetting AI loop', error);
      throw new HttpException('Failed to reset AI loop', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/voice')
  async getVoiceAnalytics(@Query() timeRange: TimeRange) {
    try {
      // Mock voice analytics data - would integrate with real STT/TTS services
      const analytics = {
        totalConversations: 1247,
        avgDuration: 245, // seconds
        successRate: 87.3,
        sentimentDistribution: {
          positive: 68.5,
          neutral: 24.2,
          negative: 7.3
        },
        topKeywords: [
          { word: 'billing', count: 234, trend: 'up' },
          { word: 'password', count: 189, trend: 'stable' },
          { word: 'delivery', count: 156, trend: 'down' },
          { word: 'refund', count: 142, trend: 'up' },
          { word: 'appointment', count: 128, trend: 'stable' },
          { word: 'account', count: 115, trend: 'up' }
        ],
        speakerStats: {
          customer: {
            totalSpeakTime: 65.3,
            avgSpeakingRate: 145,
            interruptions: 23
          },
          agent: {
            totalSpeakTime: 34.7,
            avgSpeakingRate: 160,
            interruptions: 8
          }
        },
        qualityMetrics: {
          clarity: 92.1,
          completeness: 88.7,
          relevance: 94.3,
          satisfaction: 87.6
        }
      };

      return {
        success: true,
        data: analytics,
        timeRange: timeRange,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('DashboardController: Error getting voice analytics', error);
      throw new HttpException('Failed to get voice analytics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('integrations/health')
  async getIntegrationHealth() {
    try {
      // Mock integration health data - would integrate with real provider health checks
      const integrations = [
        {
          id: 'salesforce',
          name: 'Salesforce',
          category: 'crm',
          status: 'connected',
          responseTimeMs: 120,
          uptime: 99.8,
          errorRate: 0.1,
          lastSync: new Date().toISOString()
        },
        {
          id: 'genesys',
          name: 'Genesys Cloud',
          category: 'helpdesk',
          status: 'connected',
          responseTimeMs: 85,
          uptime: 99.9,
          errorRate: 0.05,
          lastSync: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
        },
        {
          id: 'zendesk',
          name: 'Zendesk',
          category: 'helpdesk',
          status: 'error',
          responseTimeMs: 450,
          uptime: 97.2,
          errorRate: 2.8,
          lastSync: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          error: 'API timeout exceeded'
        },
        {
          id: 'slack',
          name: 'Slack',
          category: 'communication',
          status: 'connected',
          responseTimeMs: 45,
          uptime: 99.99,
          errorRate: 0.01,
          lastSync: new Date(Date.now() - 60000).toISOString() // 1 minute ago
        }
      ];

      return {
        success: true,
        data: integrations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('DashboardController: Error getting integration health', error);
      throw new HttpException('Failed to get integration health', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('flows/executions')
  async getFlowExecutions(@Query() timeRange: TimeRange) {
    try {
      // Mock flow execution data - would integrate with real flow execution service
      const executions = [
        {
          id: 'exec_001',
          name: 'Login Flow',
          status: 'completed',
          startTime: new Date(Date.now() - 180000).toISOString(),
          endTime: new Date(Date.now() - 120000).toISOString(),
          duration: 60000, // ms
          currentStepIndex: 5,
          totalSteps: 5,
          progress: 100,
          performance: {
            avgStepTime: 12000,
            successRate: 100,
            totalDuration: 60000
          },
          result: {
            action: 'User logged in successfully',
            fields_filled: ['email', 'password'],
            success: true
          }
        },
        {
          id: 'exec_002',
          name: 'Order Processing Flow',
          status: 'running',
          startTime: new Date(Date.now() - 60000).toISOString(),
          endTime: null,
          duration: null,
          currentStepIndex: 3,
          totalSteps: 5,
          progress: 60,
          performance: {
            avgStepTime: 15000,
            successRate: 80,
            totalDuration: 45000
          },
          result: null
        },
        {
          id: 'exec_003',
          name: 'Data Export Flow',
          status: 'failed',
          startTime: new Date(Date.now() - 900000).toISOString(),
          endTime: new Date(Date.now() - 750000).toISOString(),
          duration: 150000, // ms
          currentStepIndex: 2,
          totalSteps: 5,
          progress: 40,
          performance: {
            avgStepTime: 75000,
            successRate: 40,
            totalDuration: 150000
          },
          result: null,
          error: 'Step timeout: Element not found'
        }
      ];

      return {
        success: true,
        data: executions,
        total: executions.length,
        timeRange: timeRange
      };
    } catch (error) {
      console.error('DashboardController: Error getting flow executions', error);
      throw new HttpException('Failed to get flow executions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('status')
  async getDashboardStatus() {
    try {
      const agentStatus = this.agentMonitoringService.getAllAgentStatuses();
      const aiLoops = this.aiLoopService.getAllLoops();
      const systemHealth = this.agentMonitoringService.getCurrentHealth();

      return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {
          agentMonitoring: {
            status: 'active',
            agents: agentStatus.length,
            activeAgents: agentStatus.filter(a => a.status !== 'idle').length
          },
          aiProcessing: {
            status: 'active',
            loops: aiLoops.length,
            runningLoops: aiLoops.filter(l => l.status === 'running').length
          },
          systemHealth: {
            status: systemHealth.overall,
            websocket: systemHealth.websocket
          }
        }
      };
    } catch (error) {
      console.error('DashboardController: Error getting dashboard status', error);
      throw new HttpException('Failed to get dashboard status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}