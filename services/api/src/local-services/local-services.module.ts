import { Module } from '@nestjs/common';
import { LocalTTSService } from '../tts/local-tts.service';
import { LocalSTTService } from '../stt/local-stt.service';

@Module({
  providers: [LocalTTSService, LocalSTTService],
  exports: [LocalTTSService, LocalSTTService],
})
export class LocalServicesModule {}