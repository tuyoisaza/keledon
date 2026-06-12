import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { VoiceProviderController } from './voice-provider.controller';
import { VoiceProviderRegistry } from './providers/voice-provider.registry';
import { ProviderConfigResolver } from './providers/provider-config.resolver';
import { TTSModule } from '../tts/tts.module';
import { LLMModule } from '../llm/llm.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TTSModule, LLMModule, PrismaModule],
  controllers: [VoiceProviderController],
  providers: [VoiceGateway, VoiceProviderRegistry, ProviderConfigResolver],
  exports: [VoiceGateway, VoiceProviderRegistry],
})
export class VoiceModule {}
