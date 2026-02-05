import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Session } from './entities/session.entity';
import { Event } from './entities/event.entity';
import { User } from './entities/user.entity';
import { SessionService } from './services/session.service';
import { DatabaseHealthService } from './services/database-health.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('SUPABASE_HOST') || 'localhost',
        port: configService.get('SUPABASE_PORT') || 54322,
        username: configService.get('SUPABASE_USER') || 'postgres',
        password: configService.get('SUPABASE_PASSWORD') || 'postgres',
        database: configService.get('SUPABASE_DB') || 'postgres',
        entities: [Session, Event, User],
        synchronize: false,
        logging: true,
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Session, Event, User]),
  ],
  providers: [
    SessionService,
    DatabaseHealthService,
  ],
  exports: [SessionService, DatabaseHealthService],
})
export class AppModule {
  constructor() {
    console.log('🚀 DATABASE-READY: KELEDON Phase 2 - Supabase Only Mode');
  }
}