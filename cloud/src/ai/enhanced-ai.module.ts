import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { RAGService } from './rag/rag.service';
import { FlowExecutionEngine } from './flow/flow-execution-engine.service';
import { EnhancedRPAService } from './rpa/enhanced-rpa.service';
import { SidePanelService } from './side-panel/side-panel.service';
import { EnhancedConversationOrchestratorService } from './orchestration/enhanced-conversation-orchestrator.service';
import { OrchestrationController } from './orchestration/orchestration.controller';
import { GenesysIntegrationService } from './integration/genesys-integration.service';

/**
 * 🧠 Enhanced AI Module
 * Complete Conversations Orchestrator with RAG, Flow, RPA, and Side Panel integration
 */
@Module({
  imports: [
    ConfigModule,
    // Core AI Services
    // RAG and Vector Database
    // Flow Execution Engine
    // Enhanced RPA Service
    // Side Panel WebSocket
    // Enhanced Conversation Orchestrator
    // External Integrations
  ],
  controllers: [
    OrchestrationController,
  ],
  providers: [
    // Core AI Services
    RAGService,
    FlowExecutionEngine,
    EnhancedRPAService,
    SidePanelService,
    EnhancedConversationOrchestratorService,
    GenesysIntegrationService,
  ],
  exports: [
    // Core AI Services
    RAGService,
    FlowExecutionEngine,
    EnhancedRPAService,
    SidePanelService,
    EnhancedConversationOrchestratorService,
    GenesysIntegrationService,
  ],
})
export class EnhancedAIModule {}