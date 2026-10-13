import { Module } from '@nestjs/common';
import { ListeningSessionController } from './listening-session.controller';
import { ListeningSessionService } from './listening-session.service';
import { ListeningSessionGateway } from './listening.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { RuntimeActorGuard } from '../gateways/runtime-identity';

@Module({
  imports: [PrismaModule],
  controllers: [ListeningSessionController],
  providers: [
    ListeningSessionService,
    ListeningSessionGateway,
    RuntimeActorGuard,
  ],
  exports: [ListeningSessionService],
})
export class ListeningSessionModule {}
