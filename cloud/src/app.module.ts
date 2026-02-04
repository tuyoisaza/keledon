import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionModule } from './modules/session.module';
import { AgentGateway } from './gateways/agent.gateway';
import { DecisionEngineService } from './services/decision-engine.service';
import { SessionService } from './services/session.service';
import { VectorService } from './services/vector.service';
import { DatabaseService } from './services/database.service';
import { EnvironmentService } from './services/environment.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SessionModule,
  ],
  providers: [
    AgentGateway,
    DecisionEngineService,
    SessionService,
    VectorService,
    DatabaseService,
    EnvironmentService,
  ],
})
export class AppModule {}