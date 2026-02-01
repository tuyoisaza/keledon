import { Module } from '@nestjs/common';
import { EnhancedSTTController } from './enhanced-stt.controller';
import { EnhancedLocalSTTService } from './enhanced-local-stt.service';
import { StreamingSTTService } from './streaming-stt.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [EnhancedSTTController],
  providers: [EnhancedLocalSTTService, StreamingSTTService],
  exports: [EnhancedLocalSTTService, StreamingSTTService]
})
export class EnhancedSTTModule {}