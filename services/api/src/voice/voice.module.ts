import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { VoiceProviderController } from './voice-provider.controller';
import { VoiceProviderRegistry } from './providers/voice-provider.registry';
import { TTSModule } from '../tts/tts.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [TTSModule, LLMModule],
  controllers: [VoiceProviderController],
  providers: [VoiceGateway, VoiceProviderRegistry],
  exports: [VoiceGateway, VoiceProviderRegistry],
})
export class VoiceModule {}
