import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionService } from './services/session.service';
import { DatabaseHealthService } from './services/database-health.service';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RAGModule } from './rag/rag.module';
import { AgentGateway } from './gateways/agent.gateway';
import { DeviceGateway } from './gateways/device.gateway';
import { DecisionEngineService } from './services/decision-engine.service';
import { ListeningSessionModule } from './listening-sessions/listening-session.module';
import { PrismaModule } from './prisma/prisma.module';
import { TeamController } from './controllers/team.controller';
import { MvpDataController } from './controllers/mvp-data.controller';
import { MvpStoreService } from './mvp/mvp-store.service';
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
import { EscalationService } from './services/escalation.service';
import { EscalationController } from './controllers/escalation.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    RAGModule,
    ListeningSessionModule,
    AuthLocalModule,
    CrudModule,
    TTSModule,
    VectorStoreModule,
    FlowModule,
    SubAgentModule,
    DeviceModule,
    LLMModule,
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
    EscalationController,
  ],
  providers: [
    AppService,
    SessionService,
    DatabaseHealthService,
    AgentGateway,
    DeviceGateway,
    DecisionEngineService,
    EscalationService,
    TeamController,
    MvpStoreService,
  ],
  exports: [SessionService, DatabaseHealthService, TTSModule, VectorStoreModule, FlowModule, SubAgentModule],
})
export class AppModule {
  constructor() {
    console.log('🚀 KELEDON - Prisma + PostgreSQL + VOSK');
  }
}
