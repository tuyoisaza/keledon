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
        const isLocalDev = configService.get('NODE_ENV') === 'development';
        
        if (isLocalDev) {
          console.log('🚀 LOCAL DEV MODE: KELEDON Cloud Backend');
          console.log('⚠️  SUPABASE NOT CONNECTED: Fail-fast mode enabled');
          console.log('❌ NO IN-MEMORY FALLBACKS: Database required for production');
        }
        
        // KELEDON ARCHITECTURE: Fail fast without Supabase
        return {
          type: 'postgres',
          host: configService.get('SUPABASE_HOST') || 'localhost',
          port: configService.get('SUPABASE_PORT') || 54322,
          username: configService.get('SUPABASE_USER') || 'postgres',
          password: configService.get('SUPABASE_PASSWORD') || 'postgres',
          database: configService.get('SUPABASE_DB') || 'postgres',
          entities: [Session, Event, User],
          synchronize: false,
          logging: isLocalDev,
          ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
          // KELEDON FAIL-FAST: Disable retry logging in local dev
          keepConnectionAlive: !isLocalDev,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Session, Event, User]),
    HealthModule,
    RAGModule,
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
