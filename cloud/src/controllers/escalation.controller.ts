import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { EscalationService } from '../services/escalation.service';

@Controller('api/escalations')
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get('stats')
  async getStats(@Query('teamId') teamId?: string) {
    return this.escalationService.getStats(teamId);
  }

  @Get('active')
  async getActive(@Query('limit') limit?: string) {
    return this.escalationService.getActive(limit ? parseInt(limit, 10) : 100);
  }

  @Get('session/:sessionId')
  async getBySession(@Param('sessionId') sessionId: string) {
    return this.escalationService.getBySessionId(sessionId);
  }

  @Get('team/:teamId')
  async getByTeam(
    @Param('teamId') teamId: string,
    @Query('limit') limit?: string
  ) {
    return this.escalationService.getByTeamId(teamId, limit ? parseInt(limit, 10) : 100);
  }

  @Post(':id/acknowledge')
  async acknowledge(
    @Param('id') id: string,
    @Body('acknowledgedBy') acknowledgedBy: string
  ) {
    return this.escalationService.acknowledge(id, acknowledgedBy);
  }

  @Post(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.escalationService.resolve(id);
  }
}