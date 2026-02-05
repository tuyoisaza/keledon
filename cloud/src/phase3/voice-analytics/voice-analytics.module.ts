import { Module } from '@nestjs/common';
import { VoiceAnalyticsService } from './voice-analytics.service';

@Module({
  providers: [VoiceAnalyticsService],
  exports: [VoiceAnalyticsService],
})
export class VoiceAnalyticsModule {}