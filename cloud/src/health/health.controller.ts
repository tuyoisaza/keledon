import { Controller, Get } from '@nestjs/common';
import { HealthService, SystemHealth } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHello(): string {
    return 'KELEDON Backend is running!';
  }

  @Get('health')
  async getBasicHealth() {
    return this.healthService.getBasicHealth();
  }

  @Get('health/detailed')
  getDetailedHealth(): Promise<SystemHealth> {
    return this.healthService.getSystemHealth();
  }
}
