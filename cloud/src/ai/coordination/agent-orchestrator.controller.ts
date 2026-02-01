import { Controller, Post, Body, Get, Put, Delete, Query } from '@nestjs/common';
import { AgentCoordinationService } from './coordination/agent-orchestrator.service';
import { ConversationOrchestratorService } from '../orchestration/conversation-orchestrator.service';
import { MultimodalProcessorService } from '../multimodal/multimodal-processor.service';
import { IntelligentRPAService } from '../automation/intelligent-rpa.service';
import {
  CoordinationOptions,
  CoordinationResult,
  RecommendedAction,
  AgentExecution
} from './types/coordination.types';

@Controller('api/ai/coordination')
export class AgentCoordinationController {
  constructor(
    private readonly agentCoordinationService: AgentCoordinationService,
    private readonly conversationOrchestratorService: ConversationOrchestratorService,
    private readonly multimodalProcessorService: MultimodalProcessorService,
    private readonly intelligentRPAService: IntelligentRPAService
  ) {}

  @Post('coordinate')
  async coordinateAgents(@Body() options: CoordinationOptions) {
    try {
      console.log('[Agent Coordination Controller] Coordination request:', {
        sessionId: options.sessionId,
        agents: options.agents,
        strategy: options.strategy
      });

      if (!options.sessionId || !options.agents || options.agents.length === 0) {
        throw new Error('Session ID and at least one agent are required');
      }

      const result = await this.agentCoordinationService.coordinateAgents(options);
      
      return {
        success: true,
        message: 'Agent coordination completed successfully',
        data: result
      };
    } catch (error) {
      console.error('[Agent Coordination Controller] Error in coordination:', error);
      return {
        success: false,
        error: error.message,
        message: `Agent coordination failed: ${error.message}`
      };
    }
  }

  @Get('status/:sessionId')
  async getCoordinationStatus(@Param('sessionId') sessionId: string) {
    try {
      const status = await this.agentCoordinationService.getCoordinationStatus(sessionId);
      
      return {
        success: true,
        message: 'Coordination status retrieved successfully',
        data: status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get coordination status: ${error.message}`
      };
    }
  }

  @Post('/session/:id/end')
  async endSession(@Param('id') id: string) {
    try {
      await this.agentCoordinationService.clearCoordination(id);
      
      return {
        success: true,
        message: 'Coordination session ended successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to end coordination session: ${error.message}`
      };
    }
  }

  @Delete('/sessions')
  async clearAllSessions() {
    try {
      await this.agentCoordinationService.clearAllCoordination();
      
      return {
        success: true,
        message: 'All coordination sessions cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to clear sessions: ${error.message}`
      };
    }
  }

  @Get('/agents')
  async getAgentRegistry() {
    try {
      const agents = await this.agentCoordinationService.getAgentRegistry();
      
      return {
        success: true,
        message: 'Agent registry retrieved successfully',
        data: agents
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get agent registry: ${error.message}`
      };
    }
  }

  @Get('/agents/:id/status')
  async getAgentStatus(@Param('id') id: string) {
    try {
      const performance = await this.agentCoordinationService.getAgentPerformance(id);
      
      return {
        success: true,
        message: 'Agent status retrieved successfully',
        data: performance
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get agent status: ${error.message}`
      };
    }
  }

  @Get('/system-learning')
  async getSystemLearning() {
    try {
      const learning = await this.agentCoordinationService.getSystemLearning();
      
      return {
        success: true,
        message: 'System learning retrieved successfully',
        data: learning
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to get system learning: ${error.message}`
      };
    }
  }

  @Post('/learning/enable')
  async enableLearning(@Body() body: { enabled: boolean }) {
    try {
      this.conversationOrchestratorService.enableLearning(body.enabled);
      this.multimodalProcessorService.enableLearning(body.enabled);
      this.intelligentRPAService.enableLearning(body.enabled);
      
      return {
        success: true,
        message: body.enabled ? 'Learning enabled successfully' : 'Learning disabled'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to toggle learning: ${error.message}`
      };
    }
  }
}