import { Module } from '@nestjs/common';
import { SubAgentController } from './subagent.controller';
import { SubAgentService } from './subagent.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubAgentController],
  providers: [SubAgentService],
  exports: [SubAgentService],
})
export class SubAgentModule {}
