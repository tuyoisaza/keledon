import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { TTSModule } from '../tts/tts.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [TTSModule, LLMModule],
  providers: [VoiceGateway],
  exports: [VoiceGateway],
})
export class VoiceModule {}
