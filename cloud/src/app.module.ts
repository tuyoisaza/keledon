import { Module } from '@nestjs/common';
import { RBACModule } from './rbac/rbac.module';
import { SessionModule } from './modules/session.module';
import { AgentGateway } from './gateways/agent.gateway';
import { DecisionEngineService } from './services/decision-engine.service';

@Module({
  imports: [
    RBACModule,
    SessionModule,
  ],
  providers: [
    AgentGateway,
    DecisionEngineService,
  ],
})
export class AppModule {}