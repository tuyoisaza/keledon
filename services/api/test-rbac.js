// Quick test of RBAC service functionality
const { RBACRecommendationService } = require('./dist/services/rbac-recommendation.service');

async function testRBACService() {
  try {
    console.log('Testing RBAC Service...');
    
    const service = new RBACRecommendationService();
    
    // Test 1: Basic analysis
    console.log('\n1. Testing performFullAnalysis...');
    const analysis = await service.performFullAnalysis();
    console.log('✅ Analysis completed:', {
      id: analysis.id,
      maturityScore: analysis.maturityScore,
      gapsFound: analysis.gaps.length,
      recommendations: analysis.recommendations.length,
      riskLevel: analysis.riskAssessment.overallRisk
    });
    
    // Test 2: Dashboard data
    console.log('\n2. Testing getDashboardData...');
    const dashboard = await service.getDashboardData();
    console.log('✅ Dashboard data:', {
      maturityScore: dashboard.maturityScore,
      totalGaps: dashboard.totalGaps,
      criticalGaps: dashboard.criticalGaps,
      totalRecommendations: dashboard.totalRecommendations,
      riskLevel: dashboard.riskLevel
    });
    
    // Test 3: AI Insights
    console.log('\n3. Testing generateAIInsights...');
    const insights = await service.generateAIInsights();
    console.log('✅ AI Insights:', {
      summary: insights.summary,
      keyFindingsCount: insights.keyFindings.length,
      topPriorities: insights.topPriorities
    });
    
    // Test 4: Implementation Plan
    console.log('\n4. Testing getImplementationPlan...');
    const plan = await service.getImplementationPlan();
    console.log('✅ Implementation Plan:', {
      totalDuration: plan.totalDuration,
      totalEffort: plan.totalEffort,
      phasesCount: plan.phases.length,
      successProbability: plan.successProbability
    });
    
    console.log('\n🎉 All RBAC service tests passed!');
    
  } catch (error) {
    console.error('❌ RBAC service test failed:', error);
  }
}

testRBACService();