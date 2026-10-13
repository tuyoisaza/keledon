import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Res,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { HealthService, SystemHealth } from './health.service';
import { Public } from '../guards/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { DiagnosticEndpoint } from './endpoint-diagnostics.registry';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @DiagnosticEndpoint({
    id: 'health.root',
    purpose: 'Confirm the API process is responding.',
    probeMode: 'manual_only',
    expectedStatuses: [200],
    sanitizedSuccessExample: { status: 'ok' },
  })
  @ApiOperation({ summary: 'Get backend health status' })
  getHello(): string {
    return 'KELEDON Backend is running!';
  }

  @Public()
  @Get('health')
  @DiagnosticEndpoint({
    id: 'health.basic',
    purpose: 'Return API liveness without outbound dependency checks.',
    probeMode: 'safe_read',
    expectedStatuses: [200],
    sanitizedSuccessExample: { status: 'ok' },
  })
  @ApiOperation({
    summary: 'Get API liveness status without dependency probes',
  })
  getBasicHealth() {
    return this.healthService.getLivenessHealth();
  }

  @Get('health/detailed')
  @UseGuards(RolesGuard)
  @Roles('admin', 'developer', 'superadmin')
  @DiagnosticEndpoint({
    id: 'health.detailed',
    purpose: 'Inspect dependency health with protected detailed results.',
    probeMode: 'manual_only',
    expectedStatuses: [200, 503],
    sanitizedSuccessExample: { status: 'healthy', services: [] },
    sanitizedErrorExamples: [{ statusCode: 403, message: 'Forbidden' }],
  })
  @ApiOperation({ summary: 'Get protected detailed system health metrics' })
  getDetailedHealth(): Promise<SystemHealth> {
    return this.healthService.getSystemHealth();
  }

  @Get('health/deep')
  @UseGuards(RolesGuard)
  @Roles('admin', 'developer', 'superadmin')
  @DiagnosticEndpoint({
    id: 'health.deep',
    purpose:
      'Read protected database, runtime, provider-presence and endpoint diagnostic metadata.',
    probeMode: 'safe_read',
    expectedStatuses: [200],
    sanitizedSuccessExample: {
      status: 'healthy',
      database: { status: 'healthy', migrations: 'present' },
      endpointDiagnostics: [],
    },
    sanitizedErrorExamples: [
      { statusCode: 401, message: 'Unauthorized' },
      { statusCode: 403, message: 'Forbidden' },
    ],
  })
  @ApiOperation({
    summary: 'Get safe protected deep-health and endpoint diagnostic registry',
  })
  getDeepHealth(@Req() request: any) {
    return this.healthService.getDeepHealth(request.user?.userId);
  }

  @Post('health/deep/probes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'developer', 'superadmin')
  @DiagnosticEndpoint({
    id: 'health.probes',
    purpose:
      'Execute a registered probe only after role and probe-mode checks.',
    probeMode: 'manual_only',
    expectedStatuses: [200, 403, 404],
    sanitizedRequestExample: { id: 'health.deep' },
    sanitizedSuccessExample: {
      id: 'health.deep',
      status: 'pass',
      httpStatus: 200,
      latencyMs: 1,
      correlationId: 'diag_redacted',
    },
    sanitizedErrorExamples: [
      { statusCode: 403, message: 'Probe mode not permitted' },
    ],
  })
  @ApiOperation({ summary: 'Run a named, registered, safe diagnostic probe' })
  async runDiagnosticProbe(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const evidence = await this.healthService.runDiagnosticProbe(id);
      response.setHeader('x-correlation-id', evidence.correlationId);
      return evidence;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Diagnostic probe not found'
      ) {
        throw new NotFoundException('Diagnostic probe not found');
      }
      if (
        error instanceof Error &&
        error.message === 'Diagnostic probe is manual only'
      ) {
        throw new ForbiddenException('Diagnostic probe is manual only');
      }
      throw new ForbiddenException('Diagnostic probe mode is not executable');
    }
  }
}
