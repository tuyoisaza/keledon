import { Module } from '@nestjs/common';
import { SidePanelIntelligenceService } from './side-panel-intelligence.service';

@Module({
  providers: [SidePanelIntelligenceService],
  exports: [SidePanelIntelligenceService],
})
export class SidePanelIntelligenceModule {}