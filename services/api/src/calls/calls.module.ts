import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EscalationService } from '../services/escalation.service';

@Module({
  imports: [PrismaModule],
  controllers: [CallsController],
  providers: [CallsService, EscalationService],
  exports: [CallsService],
})
export class CallsModule {}
