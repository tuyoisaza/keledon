import { Module } from '@nestjs/common';
import { RBACModule } from './rbac/rbac.module';
import { SessionModule } from './modules/session.module';

@Module({
  imports: [
    RBACModule,
    SessionModule,
  ],
})
import { Module } from '@nestjs/common';
import { RBACModule } from './rbac/rbac.module';
import { SessionModule } from './modules/session.module';
import { DatabasePersistenceModule } from './modules/database-persistence.module';
import { RealTimeAlertingModule } from './modules/real-time-alerting.module';
import { SystemMonitoringModule } from './modules/system-monitoring.module';
import { SecurityModule } from './modules/security.module';
import { AI_LOOP_MODULE } from './modules/ai-loop.module';
import { IntegrationHealthModule } from './modules/integration-health.module';
import { LocalServicesModule } from './modules/local-services.module';
import { RagModule } from './modules/rag.module';
import { OpenAIModule } from './modules/openai.module';
import { TTSModule } from './modules/tts.module';
import { HealthModule } from './modules/health/health.module';
import { DashboardModule } from './modules/dashboard.module';

@Module({
  imports: [
    RBACModule,
    SessionModule,
    DatabasePersistenceModule,
    RealTimeAlertingModule,
    SystemMonitoringModule,
    SecurityModule,
    AI_LOOP_MODULE,
    IntegrationHealthModule,
    LocalServicesModule,
    RagModule,
    OpenAIModule,
    OpenAIModule,
    TTSModule,
    HealthModule,
    DashboardModule
  ],
  controllers: [AgentGateway, ...],
  providers: [
    SessionService,
    DecisionEngineService,
    TTSService
  ],
})
export class AppModule {}