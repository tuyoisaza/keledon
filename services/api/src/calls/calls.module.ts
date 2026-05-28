import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../modules/session.module';
import { DecisionEngineService } from '../services/decision-engine.service';
import { EscalationService } from '../services/escalation.service';

@Module({
  imports: [PrismaModule, SessionModule],
  controllers: [CallsController],
  providers: [CallsService, DecisionEngineService, EscalationService],
  exports: [CallsService],
})
export class CallsModule {}
