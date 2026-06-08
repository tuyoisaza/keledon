import { Module } from '@nestjs/common';
import { TTSService } from './tts.service';
import { TTSController } from './tts.controller';
import { MvpStoreService } from '../mvp/mvp-store.service';

@Module({
  controllers: [TTSController],
  providers: [TTSService, MvpStoreService],
  exports: [TTSService],
})
export class TTSModule {}
