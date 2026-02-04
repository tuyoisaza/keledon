import { Module } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { AgentGateway } from '../gateways/agent.gateway';

@Module({
  providers: [SessionService, AgentGateway],
  exports: [SessionService],
})
export class SessionModule {}