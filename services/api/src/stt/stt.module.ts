import { Module } from '@nestjs/common';
import { DeepgramSTTService } from './deepgram-stt.service';

@Module({
  providers: [DeepgramSTTService],
  exports: [DeepgramSTTService],
})
export class STTModule {}
