import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SubAgentService } from './subagent.service';

@Controller('api/subagents')
export class SubAgentController {
  constructor(private readonly subAgentService: SubAgentService) {}

  @Post('session/:sessionId/init')
  async initializeSession(@Param('sessionId') sessionId: string) {
    const agents = await this.subAgentService.initializeSession(sessionId);
    return { success: true, agents };
  }

  @Delete('session/:sessionId/cleanup')
  async cleanupSession(@Param('sessionId') sessionId: string) {
    await this.subAgentService.cleanupSession(sessionId);
    return { success: true };
  }

  @Get('session/:sessionId')
  async getSessionAgents(@Param('sessionId') sessionId: string) {
    return this.subAgentService.getSessionSubAgents(sessionId);
  }

  @Get('status')
  async getAllStatus() {
    return this.subAgentService.getAllAgentStatuses();
  }

  @Get(':agentId/status')
  async getAgentStatus(@Param('agentId') agentId: string) {
    const status = this.subAgentService.getAgentStatus(agentId);
    if (!status) {
      return { error: 'Agent not found' };
    }
    return status;
  }

  @Get('agents/by-role/:role')
  async getAgentsByRole(@Param('role') role: string) {
    return this.subAgentService.getAvailableAgentsByRole(role);
  }

  @Post('execute/flow')
  async executeFlow(
    @Body() body: { flowId: string; parameters?: Record<string, any>; sessionId: string },
  ) {
    return this.subAgentService.executeFlow(body.flowId, body.parameters || {}, body.sessionId);
  }

  @Post('execute/parallel')
  async executeParallelFlows(
    @Body() body: { flowIds: string[]; parameters?: Record<string, any>; sessionId: string },
  ) {
    return this.subAgentService.executeParallelFlows(body.flowIds, body.parameters || {}, body.sessionId);
  }

  @Get('flow-runs/:runId')
  async getFlowRunStatus(@Param('runId') runId: string) {
    return this.subAgentService.getFlowRunStatus(runId);
  }
}
