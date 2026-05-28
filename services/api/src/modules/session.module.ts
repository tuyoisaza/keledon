import { Module } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { AgentGateway } from '../gateways/agent.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { DecisionEngineService } from '../services/decision-engine.service';

@Module({
  imports: [PrismaModule],
  providers: [SessionService, AgentGateway, DecisionEngineService],
  exports: [SessionService],
})
export class SessionModule {}
