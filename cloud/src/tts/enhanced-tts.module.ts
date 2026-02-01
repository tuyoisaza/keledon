import { Module } from '@nestjs/common';
import { EnhancedTTSController } from './enhanced-tts.controller';
import { EnhancedLocalTTSService } from './enhanced-local-tts.service';
import { VoiceProfileService } from './voice-profile.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [EnhancedTTSController],
  providers: [EnhancedLocalTTSService, VoiceProfileService],
  exports: [EnhancedLocalTTSService, VoiceProfileService]
})
export class EnhancedTTSModule {}