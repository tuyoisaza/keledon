import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AdminController } from './admin.controller';
import { HealthController } from './health.controller';
import { AppService } from './app.service';
import { AppGateway } from './app.gateway';
import { SttFactory } from './stt.factory';
import { TtsFactory } from './tts.factory';
import { LlmFactory } from './llm.factory';
import { ConversationOrchestrator } from './conversation.orchestrator';
import { ToolExecutor } from './tool.executor';
import { WorkflowStorage } from './workflow.storage';
import { WorkflowController } from './workflow.controller';
import { ProviderCatalogController } from './provider-catalog.controller';
import { RpaFactory } from './rpa.factory';
import { ProvidersController } from './providers.controller';
import { SharedModule } from './core/shared.module';
import { CoreModule } from './core/core.module';
import { TechStatusModule } from './tech-status/tech-status.module';
import { SupabaseModule } from './supabase';
import { ListeningSessionModule } from './listening-sessions/listening-session.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { RAGModule } from './rag/rag.module';

@Module({
  imports: [SharedModule, CoreModule, TechStatusModule, SupabaseModule, ListeningSessionModule, KnowledgeModule, RAGModule],
  controllers: [AppController, AdminController, HealthController, WorkflowController, ProvidersController, ProviderCatalogController],
  providers: [
    AppService,
    AppGateway,
    ConversationOrchestrator,
  ],
})
export class AppModule { }

