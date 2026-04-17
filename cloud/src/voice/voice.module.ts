import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { TTSModule } from '../tts/tts.module';

@Module({
  imports: [TTSModule],
  providers: [VoiceGateway],
  exports: [VoiceGateway],
})
export class VoiceModule {}