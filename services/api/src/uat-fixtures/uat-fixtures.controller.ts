import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Roles, SuperAdminGuard } from '../guards/roles.guard';
import { DiagnosticEndpoint } from '../health/endpoint-diagnostics.registry';
import { AuthenticatedRequest } from '../types/auth.types';
import { UatFixturesService } from './uat-fixtures.service';

@Controller('api/admin/uat-fixtures')
@UseGuards(SuperAdminGuard)
@Roles('superadmin')
export class UatFixturesController {
  constructor(private readonly fixtures: UatFixturesService) {}

  @Post()
  @DiagnosticEndpoint({ purpose: 'Prepare bounded synthetic tenants with atomic audit; never auto-probe', probeMode: 'manual_only', expectedStatuses: [201, 400, 401, 403, 409] })
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.fixtures.create(req.user.userId, body);
  }

  @Get(':runId')
  @DiagnosticEndpoint({ purpose: 'Read an authorized synthetic run manifest without credentials', probeMode: 'manual_only', expectedStatuses: [200, 401, 403, 404] })
  get(@Req() req: AuthenticatedRequest, @Param('runId') runId: string) {
    return this.fixtures.get(req.user.userId, runId);
  }

  @Post(':runId/retire')
  @DiagnosticEndpoint({ purpose: 'Retire synthetic accounts and revoke device access atomically', probeMode: 'manual_only', expectedStatuses: [201, 401, 403, 404, 409] })
  retire(@Req() req: AuthenticatedRequest, @Param('runId') runId: string) {
    return this.fixtures.setRetired(req.user.userId, runId, true);
  }

  @Post(':runId/restore')
  @DiagnosticEndpoint({ purpose: 'Restore synthetic accounts within original TTL without restoring credentials', probeMode: 'manual_only', expectedStatuses: [201, 401, 403, 404, 409] })
  restore(@Req() req: AuthenticatedRequest, @Param('runId') runId: string) {
    return this.fixtures.setRetired(req.user.userId, runId, false);
  }
}
