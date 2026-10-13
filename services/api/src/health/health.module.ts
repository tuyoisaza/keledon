import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { RolesGuard } from '../guards/roles.guard';
import { DiscoveryModule } from '@nestjs/core';
import { EndpointDiagnosticsRegistry } from './endpoint-diagnostics.registry';

@Module({
  imports: [AppConfigModule, DiscoveryModule],
  controllers: [HealthController],
  providers: [HealthService, RolesGuard, EndpointDiagnosticsRegistry],
  exports: [HealthService],
})
export class HealthModule {}
