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
        const isManagedTier = isManagedProductionTier(runtimeTier);

        const databaseUrl = (configService.get<string>('DATABASE_URL') || '').trim();
        if (databaseUrl) {
          if (isLocalDev) {
            console.log('💾 DATABASE_URL mode enabled (Prisma/Railway canonical path).');
          }

          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [Session, Event, User],
            synchronize: false,
            logging: isLocalDev,
            ssl: isManagedTier ? { rejectUnauthorized: false } : false,
            keepConnectionAlive: !isLocalDev,
          };
        }

        const dbHost = configService.get('SUPABASE_HOST') || (isLocalDev ? 'localhost' : undefined);
        const dbPort = configService.get('SUPABASE_PORT') || (isLocalDev ? 54322 : undefined);
        const dbUser = configService.get('SUPABASE_USER') || (isLocalDev ? 'postgres' : undefined);
        const dbPassword = configService.get('SUPABASE_PASSWORD') || (isLocalDev ? 'postgres' : undefined);
        const dbName = configService.get('SUPABASE_DB') || (isLocalDev ? 'postgres' : undefined);

        if (!dbHost || !dbPort || !dbUser || !dbPassword || !dbName) {
          throw new Error(
            `[Config] Missing DB configuration. Prefer DATABASE_URL (canonical). Legacy SUPABASE_* env is incomplete for tier ${runtimeTier}.`,
          );
        }

        const useSSL = isManagedTier;

        return {
          type: 'postgres' as const,
          host: dbHost,
          port: Number(dbPort),
          username: dbUser,
          password: dbPassword,
          database: dbName,
          entities: [Session, Event, User],
          synchronize: false,
          logging: isLocalDev,
          ssl: useSSL ? { rejectUnauthorized: false } : false,
          keepConnectionAlive: !isLocalDev,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Session, Event, User]),
    PrismaModule,
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
    console.log('🚀 DATABASE-READY: KELEDON Phase 2 - Prisma/managed Postgres canonical mode');
  }
}
