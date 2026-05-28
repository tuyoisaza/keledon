import { Module } from '@nestjs/common';
import { UIAutomationService } from '../services/ui-automation.service';

@Module({
  providers: [UIAutomationService],
  exports: [UIAutomationService]
})
export class UIAutomationModule {}