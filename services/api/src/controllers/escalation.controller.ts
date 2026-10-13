import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EscalationService } from '../services/escalation.service';
import { ApiTags } from '@nestjs/swagger';
import { EscalationAccessGuard } from '../guards/escalation-access.guard';

@ApiTags('Escalations')
@Controller('api/escalations')
@UseGuards(EscalationAccessGuard)
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get('stats')
  async getStats(@Req() req: any, @Query('teamId') teamId?: string) {
    return this.escalationService.getStats(
      req.escalationTeamId || teamId,
      req.escalationTeamIds,
    );
  }

  @Get('active')
  async getActive(@Req() req: any, @Query('limit') limit?: string) {
    return this.escalationService.getActive(
      limit ? parseInt(limit, 10) : 100,
      req.actor.role === 'superadmin' ? undefined : req.escalationTeamIds,
    );
  }

  @Get('session/:sessionId')
  async getBySession(@Param('sessionId') sessionId: string) {
    return this.escalationService.getBySessionId(sessionId);
  }

  @Get('team/:teamId')
  async getByTeam(
    @Param('teamId') teamId: string,
    @Query('limit') limit?: string,
  ) {
    return this.escalationService.getByTeamId(
      teamId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Post(':id/acknowledge')
  async acknowledge(@Param('id') id: string, @Req() req: any) {
    return this.escalationService.acknowledge(id, req.actor.id);
  }

  @Post(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.escalationService.resolve(id);
  }
}
