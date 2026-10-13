import { Controller, Get } from '@nestjs/common';
import { HealthService, SystemHealth } from './health.service';
import { Public } from '../guards/public.decorator';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  getHello(): string {
    return 'KELEDON Backend is running!';
  }

  @Get('health')
  @Public()
  async getBasicHealth() {
    return this.healthService.getBasicHealth();
  }

  @Get('health/detailed')
  @Public()
  getDetailedHealth(): Promise<SystemHealth> {
    return this.healthService.getSystemHealth();
  }
}
