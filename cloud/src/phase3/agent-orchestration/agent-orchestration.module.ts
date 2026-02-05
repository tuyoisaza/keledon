import { Module } from '@nestjs/common';
import { AgentOrchestrationService } from './agent-orchestration.service';

@Module({
  providers: [AgentOrchestrationService],
  exports: [AgentOrchestrationService],
})
export class AgentOrchestrationModule {}