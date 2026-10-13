import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { TTSModule } from '../tts/tts.module';
import { DeviceAccessGuard } from '../guards/device-access.guard';

@Module({
  imports: [TTSModule],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceAccessGuard],
  exports: [DeviceService],
})
export class DeviceModule {}
