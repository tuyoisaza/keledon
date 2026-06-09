import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseHealthService } from './services/database-health.service';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RAGModule } from './rag/rag.module';
import { AgentGateway } from './gateways/agent.gateway';
import { DeviceGateway } from './gateways/device.gateway';
import { ListeningSessionModule } from './listening-sessions/listening-session.module';
import { PrismaModule } from './prisma/prisma.module';
import { TeamController } from './controllers/team.controller';
import { MvpDataController } from './controllers/mvp-data.controller';
import { ActiveProvidersController } from './controllers/active-providers.controller';
import { MvpStoreService } from './mvp/mvp-store.service';
import { ProviderConfigGlobalModule } from './provider-config-global.module';
import { AuthLocalModule } from './auth-local/auth-local.module';
import { CrudModule } from './crud/crud.module';
import { CrudController } from './crud/crud.controller';
import { TTSModule } from './tts/tts.module';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { VectorStoreController } from './vector-store/vector-store.controller';
import { FlowModule } from './flows/flow.module';
import { FlowController } from './flows/flow.controller';
import { SubAgentModule } from './subagents/subagent.module';
import { SubAgentController } from './subagents/subagent.controller';
import { DeviceModule } from './devices/device.module';
import { DeviceController } from './devices/device.controller';
import { LLMModule } from './llm/llm.module';
import { BrainController } from './controllers/brain.controller';
import { PlannerController } from './controllers/planner.controller';
import { VoiceModule } from './voice/voice.module';
import { STTModule } from './stt/stt.module';
import { AppConfigModule } from './config/config.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { CallsModule } from './calls/calls.module';
import { BrowserCommandsModule } from './browser-commands/browser-commands.module';
import { SessionModule } from './modules/session.module';
import { EscalationModule } from './modules/escalation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AppConfigModule,
    PrismaModule,
    SessionModule,
    HealthModule,
    RAGModule,
    ListeningSessionModule,
    AuthLocalModule,
    CrudModule,
    TTSModule,
    VectorStoreModule,
    KnowledgeModule,
    CallsModule,
    BrowserCommandsModule,
    EscalationModule,
    FlowModule,
    SubAgentModule,
    DeviceModule,
    LLMModule,
    VoiceModule,
    STTModule,
    ProviderConfigGlobalModule,
  ],
  controllers: [
    AppController,
    TeamController,
    MvpDataController,
    CrudController,
    VectorStoreController,
    FlowController,
    SubAgentController,
    DeviceController,
    BrainController,
    PlannerController,
    ActiveProvidersController,
  ],
  providers: [
    AppService,
    DatabaseHealthService,
    AgentGateway,
    DeviceGateway,
    TeamController,
    MvpStoreService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [
    DatabaseHealthService,
    TTSModule,
    VectorStoreModule,
    FlowModule,
    SubAgentModule,
  ],
})
export class AppModule {
  constructor() {
    console.log('🚀 KELEDON - Prisma + PostgreSQL + VOSK + Deepgram');
  }
}
