import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
  imports: [AppConfigModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
