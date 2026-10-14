import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { TTSModule } from '../tts/tts.module';
import { AuthLocalModule } from '../auth-local/auth-local.module';

@Module({
  imports: [TTSModule, AuthLocalModule],
  providers: [VoiceGateway],
  exports: [VoiceGateway],
})
export class VoiceModule {}
