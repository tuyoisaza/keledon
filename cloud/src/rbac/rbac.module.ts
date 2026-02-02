import { Module } from '@nestjs/common';
import { RBACRecommendationService } from '../services/rbac-recommendation.service';
import { RBACAnalysisController } from '../controllers/rbac-analysis.controller';

@Module({
  controllers: [RBACAnalysisController],
  providers: [RBACRecommendationService],
  exports: [RBACRecommendationService],
})
export class RBACModule {}