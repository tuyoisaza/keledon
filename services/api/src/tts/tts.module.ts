import { Module } from '@nestjs/common';
import { TTSService } from './tts.service';
import { TTSController } from './tts.controller';
import { MvpStoreService } from '../mvp/mvp-store.service';
import { TtsActorGuard } from './tts-actor.guard';

@Module({
  controllers: [TTSController],
  providers: [TTSService, MvpStoreService, TtsActorGuard],
  exports: [TTSService],
})
export class TTSModule {}
