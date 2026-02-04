import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionModule } from './modules/session.module';
import { AgentGateway } from './gateways/agent.gateway';
import { DecisionEngineService } from './services/decision-engine.service';
import { SessionService } from './services/session.service';

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
  ],
})
export class AppModule {}