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

@Module({
  // Runtime entry-point map for trace attachment:
  // - HTTP entry: Nest app bootstrap in main.ts
  // - WebSocket entry: AgentGateway events (brain_event / event)
  // - Decision engine: DecisionEngineService.processTextInput
  // - Vector retrieval: RAGService.retrieveKnowledge
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const runtimeTier = getRuntimeTier();
        const isLocalDev = runtimeTier === 'DEV_LOCAL';
        const isManagedTier = isManagedProductionTier(runtimeTier);

        const dbHost = configService.get('SUPABASE_HOST') || (isLocalDev ? 'localhost' : undefined);
        const dbPort = configService.get('SUPABASE_PORT') || (isLocalDev ? 54322 : undefined);
        const dbUser = configService.get('SUPABASE_USER') || (isLocalDev ? 'postgres' : undefined);
        const dbPassword = configService.get('SUPABASE_PASSWORD') || (isLocalDev ? 'postgres' : undefined);
        const dbName = configService.get('SUPABASE_DB') || (isLocalDev ? 'postgres' : undefined);

        if (!dbHost || !dbPort || !dbUser || !dbPassword || !dbName) {
          throw new Error(
            `[Config] Managed database connection env is incomplete for tier ${runtimeTier}.`,
          );
        }
        
        // Detect if connecting to Supabase Cloud (not localhost)
        const isSupabaseCloud = dbHost.includes('supabase') || dbHost.includes('aws-');
        
        if (isLocalDev) {
          console.log('🚀 LOCAL DEV MODE: KELEDON Cloud Backend');
          if (isSupabaseCloud) {
            console.log('✅ SUPABASE CLOUD: Using remote Postgres');
          } else {
            console.log('⚠️  SUPABASE NOT CONNECTED: Fail-fast mode enabled');
          }
          console.log('❌ NO IN-MEMORY FALLBACKS: Database required for production');
        }
        
        // KELEDON ARCHITECTURE: Fail fast without Supabase
        // Enable SSL for Supabase Cloud connections
        const useSSL = isSupabaseCloud || isManagedTier;
        
        return {
          type: 'postgres',
          host: dbHost,
          port: Number(dbPort),
          username: dbUser,
          password: dbPassword,
          database: dbName,
          entities: [Session, Event, User],
          synchronize: false,
          logging: isLocalDev,
          ssl: useSSL ? { rejectUnauthorized: false } : false,
          // KELEDON FAIL-FAST: Disable retry logging in local dev
          keepConnectionAlive: !isLocalDev,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Session, Event, User]),
    HealthModule,
    RAGModule,
    ListeningSessionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SessionService,
    DatabaseHealthService,
    AgentGateway,
    DecisionEngineService,
  ],
  exports: [SessionService, DatabaseHealthService],
})
export class AppModule {
  constructor() {
    console.log('🚀 DATABASE-READY: KELEDON Phase 2 - Supabase Only Mode');
  }
}
