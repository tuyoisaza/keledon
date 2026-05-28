import { Controller, Get } from '@nestjs/common';
import { HealthService, SystemHealth } from './health.service';
import { Public } from '../guards/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get backend health status' })
  getHello(): string {
    return 'KELEDON Backend is running!';
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Get detailed system health metrics' })
  async getBasicHealth() {
    return this.healthService.getBasicHealth();
  }

  @Public()
  @Get('health/detailed')
  getDetailedHealth(): Promise<SystemHealth> {
    return this.healthService.getSystemHealth();
  }
}
