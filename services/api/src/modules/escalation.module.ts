import { Module } from '@nestjs/common';
import { EscalationController } from '../controllers/escalation.controller';
import { EscalationService } from '../services/escalation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EscalationController],
  providers: [EscalationService],
  exports: [EscalationService],
})
export class EscalationModule {}
