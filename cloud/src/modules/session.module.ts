import { Module } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { AgentGateway } from '../gateways/agent.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SessionService, AgentGateway],
  exports: [SessionService],
})
export class SessionModule {}
