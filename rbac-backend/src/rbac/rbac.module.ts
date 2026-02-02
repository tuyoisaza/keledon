import { Module } from '@nestjs/common';
import { RBACRecommendationService } from './rbac-recommendation.service';
import { RBACAnalysisController } from './rbac-analysis.controller';

@Module({
  controllers: [RBACAnalysisController],
  providers: [RBACRecommendationService],
  exports: [RBACRecommendationService],
})
export class RBACModule {}