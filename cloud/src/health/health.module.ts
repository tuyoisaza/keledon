import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
