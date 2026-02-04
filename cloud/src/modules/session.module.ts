import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session, Event, User } from '../entities';
import { SessionService } from '../services/session.service';
import { AgentGateway } from '../gateways/agent.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Event, User])],
  providers: [SessionService, AgentGateway],
  exports: [SessionService],
})
export class SessionModule {}