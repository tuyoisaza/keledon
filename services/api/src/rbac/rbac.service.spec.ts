import { Test, TestingModule } from '@nestjs/testing';
import { RBACRecommendationService } from '../services/rbac-recommendation.service';

describe('RBACRecommendationService', () => {
  let service: RBACRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RBACRecommendationService],
    }).compile();

    service = module.get<RBACRecommendationService>(RBACRecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should perform RBAC analysis', async () => {
    const analysis = await service.performFullAnalysis();
    expect(analysis).toBeDefined();
    expect(analysis.maturityScore).toBeGreaterThanOrEqual(0);
    expect(analysis.maturityScore).toBeLessThanOrEqual(100);
    expect(analysis.gaps).toBeDefined();
    expect(analysis.recommendations).toBeDefined();
    expect(analysis.riskAssessment).toBeDefined();
  });

  it('should get dashboard data', async () => {
    const dashboard = await service.getDashboardData();
    expect(dashboard).toBeDefined();
    expect(dashboard.maturityScore).toBeDefined();
    expect(dashboard.totalGaps).toBeDefined();
    expect(dashboard.totalRecommendations).toBeDefined();
  });

  it('should get AI insights', async () => {
    const insights = await service.generateAIInsights();
    expect(insights).toBeDefined();
    expect(insights.summary).toBeDefined();
    expect(insights.keyFindings).toBeDefined();
    expect(insights.topPriorities).toBeDefined();
  });

  it('should get implementation plan', async () => {
    const plan = await service.getImplementationPlan();
    expect(plan).toBeDefined();
    expect(plan.phases).toBeDefined();
    expect(plan.totalDuration).toBeDefined();
  });
});