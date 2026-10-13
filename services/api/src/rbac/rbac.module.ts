import { Module } from '@nestjs/common';
import { RBACRecommendationService } from '../services/rbac-recommendation.service';
import { RBACAnalysisController } from '../controllers/rbac-analysis.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminGuard } from '../guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RBACAnalysisController],
  providers: [RBACRecommendationService, SuperAdminGuard],
  exports: [RBACRecommendationService],
})
export class RBACModule {}
