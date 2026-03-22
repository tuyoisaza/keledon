import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionService } from './services/session.service';
import { DatabaseHealthService } from './services/database-health.service';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RAGModule } from './rag/rag.module';
import { AgentGateway } from './gateways/agent.gateway';
import { DecisionEngineService } from './services/decision-engine.service';
import { ListeningSessionModule } from './listening-sessions/listening-session.module';
import { PrismaModule } from './prisma/prisma.module';
import { TeamController } from './controllers/team.controller';
import { MvpDataController } from './controllers/mvp-data.controller';
import { MvpStoreService } from './mvp/mvp-store.service';
import { AuthLocalModule } from './auth-local/auth-local.module';
import { CrudModule } from './crud/crud.module';
import { CrudController } from './crud/crud.controller';

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
  ],
  controllers: [AppController, TeamController, MvpDataController, CrudController],
  providers: [
    AppService,
    SessionService,
    DatabaseHealthService,
    AgentGateway,
    DecisionEngineService,
    TeamController,
    MvpStoreService,
  ],
  exports: [SessionService, DatabaseHealthService],
})
export class AppModule {
  constructor() {
    console.log('🚀 KELEDON - Prisma-only database mode');
  }
}
