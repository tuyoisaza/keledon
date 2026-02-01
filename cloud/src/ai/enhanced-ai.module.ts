import { Module } from '@nestjs/common';
import { AgentCoordinationController } from './agent-orchestrator.controller';
import { ConversationOrchestratorService } from '../orchestration/conversation-orchestrator.service';
import { MultimodalProcessorService } from '../multimodal/multimodal-processor.service';
import { IntelligentRPAService } from '../automation/intelligent-rpa.service';
import { AgentCoordinationService } from './coordination/agent-orchestrator.service';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [
    ConfigModule,
    AgentCoordinationController,
    ConversationOrchestratorService,
    MultimodalProcessorService,
    IntelligentRPAService,
    AgentCoordinationService
  ],
  controllers: [AgentCoordinationController],
  providers: [
    AgentCoordinationService,
    ConversationOrchestratorService,
    MultimodalProcessorService,
    IntelligentRPAService,
    AgentCoordinationService
  ],
  exports: [
    AgentCoordinationService,
    ConversationOrchestratorService,
    MultimodalProcessorService,
    IntelligentRPAService
  ]
})
export class EnhancedAIModule {}