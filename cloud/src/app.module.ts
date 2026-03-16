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
        const isManagedTier = isManagedProductionTier(runtimeTier);

        const databaseUrl = (configService.get<string>('DATABASE_URL') || '').trim();
        if (databaseUrl) {
          if (isLocalDev) {
            console.log('💾 DATABASE_URL mode enabled (Prisma/Railway canonical path).');
          }

          // Detect SQLite (file: path)
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

          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [Session, Event, User],
            synchronize: false,
            logging: isLocalDev,
            ssl: isManagedTier ? { rejectUnauthorized: false } : false,
            keepConnectionAlive: !isLocalDev,
            connectTimeoutMS: 5000,
          };
        }

        // Allow running without DB in DEV_LOCAL for testing
        if (isLocalDev) {
          console.log('⚠️ Running without database (DEV_LOCAL mode)');
          return {
            type: 'postgres' as const,
            host: '127.0.0.1',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'postgres',
            entities: [Session, Event, User],
            synchronize: false,
            logging: false,
            ssl: false,
            keepConnectionAlive: false,
            connectTimeoutMS: 3000,
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
    console.log('🚀 DATABASE-READY: KELEDON Phase 2 - Prisma/managed Postgres canonical mode');
  }
}
