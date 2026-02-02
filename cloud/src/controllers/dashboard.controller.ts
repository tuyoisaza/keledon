import { Controller, Get, Post, Query, Body, HttpException, HttpStatus, Param } from '@nestjs/common';
import { AgentMonitoringService, AgentStatus, SystemHealth } from '../services/agent-monitoring.service';
import { AILoopService } from '../services/ai-loop.service';
import { VoiceAnalyticsService } from '../services/voice-analytics.service';
import { IntegrationHealthService } from '../services/integration-health.service';
import { FlowExecutionService } from '../services/flow-execution.service';

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
    private readonly aiLoopService: AILoopService,
    private readonly voiceAnalyticsService: VoiceAnalyticsService,
    private readonly integrationHealthService: IntegrationHealthService,
    private readonly flowExecutionService: FlowExecutionService
  ) {
    console.log('DashboardController: Initialized with real services');
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
      const analytics = this.voiceAnalyticsService.getAnalytics(timeRange.period as any || '24h');

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
      const integrations = this.integrationHealthService.getProviders();

      return {
        success: true,
        data: integrations.map(provider => ({
          id: provider.id,
          name: provider.name,
          category: provider.category,
          status: provider.status,
          responseTimeMs: provider.health?.responseTime || 0,
          uptime: provider.health?.uptime || 0,
          errorRate: provider.health?.errorRate || 0,
          lastSync: provider.lastSync?.toISOString() || new Date().toISOString(),
          error: provider.status === 'error' ? 'Connection failed' : undefined
        })),
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
      const executions = this.flowExecutionService.getExecutions({ limit: 100 });

      return {
        success: true,
        data: executions.map(exec => ({
          id: exec.id,
          name: exec.name,
          status: exec.status,
          startTime: exec.startTime?.toISOString(),
          endTime: exec.endTime?.toISOString(),
          duration: exec.duration,
          currentStepIndex: exec.currentStepIndex,
          totalSteps: exec.totalSteps,
          progress: exec.progress,
          performance: exec.performance,
          result: exec.result,
          error: exec.error
        })),
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