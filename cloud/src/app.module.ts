import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Session } from './entities/session.entity';
import { Event } from './entities/event.entity';
import { User } from './entities/user.entity';
import { SessionService } from './services/session.service';
import { DatabaseHealthService } from './services/database-health.service';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RAGModule } from './rag/rag.module';
import { AgentGateway } from './gateways/agent.gateway';
import { DecisionEngineService } from './services/decision-engine.service';
import { getRuntimeTier, isManagedProductionTier } from './config/runtime-tier';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const runtimeTier = getRuntimeTier();
        const isLocalDev = runtimeTier === 'DEV_LOCAL';

        const databaseUrl = (configService.get<string>('DATABASE_URL') || '').trim();
        
        if (databaseUrl) {
          // SQLite mode (Railway canonical path)
          if (databaseUrl.startsWith('file:')) {
            const dbPath = databaseUrl.replace('file:', '');
            console.log('💾 Using SQLite database at:', dbPath);
            return {
              type: 'better-sqlite3' as const,
              database: dbPath,
              entities: [Session, Event, User],
              synchronize: true,
              logging: isLocalDev,
            };
          }

          // Local file SQLite
          if (!databaseUrl.includes('://')) {
            console.log('💾 Using local SQLite database:', databaseUrl);
            return {
              type: 'better-sqlite3' as const,
              database: databaseUrl,
              entities: [Session, Event, User],
              synchronize: true,
              logging: isLocalDev,
            };
          }
        }

        // Default fallback: in-memory SQLite for testing
        console.log('💾 Using in-memory SQLite database');
        return {
          type: 'better-sqlite3' as const,
          database: ':memory:',
          entities: [Session, Event, User],
          synchronize: true,
          logging: isLocalDev,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Session, Event, User]),
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
    console.log('🚀 DATABASE-READY: KELEDON - SQLite mode');
  }
}
