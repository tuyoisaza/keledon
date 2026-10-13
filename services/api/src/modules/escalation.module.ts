import { Module } from '@nestjs/common';
import { EscalationController } from '../controllers/escalation.controller';
import { EscalationService } from '../services/escalation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EscalationAccessGuard } from '../guards/escalation-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [EscalationController],
  providers: [EscalationService, EscalationAccessGuard],
  exports: [EscalationService],
})
export class EscalationModule {}
