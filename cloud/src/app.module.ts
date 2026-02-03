import { Module } from '@nestjs/common';
import { RBACModule } from './rbac/rbac.module';
import { AgentGateway } from './gateways/agent.gateway';

@Module({
  imports: [
    RBACModule,
  ],
  providers: [
    AgentGateway,
  ],
})
export class AppModule {}