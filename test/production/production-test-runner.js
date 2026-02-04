/**
 * Production Test Runner - Executes Complete KELEDON V1 Production Testing
 * Comprehensive testing for production deployment readiness
 */

import { ProductionTestSuite } from './production-test-suite.js';
import { ProductionReadinessAssessment } from './production-readiness-assessment.js';
import { EventEmitter } from '../../core/event-router.js';

class ProductionTestRunner extends EventEmitter {
  constructor() {
    this.testSuite = null;
    this.readinessAssessment = null;
    this.isRunning = false;
    this.currentPhase = 'idle';
    this.results = {};
  }

  /**
   * Run complete production testing sequence
   */
  async runCompleteProductionTest() {
    if (this.isRunning) {
      throw new Error('Production testing already running');
    }

    this.isRunning = true;
    this.currentPhase = 'initializing';
    this.emit('production_testing_started', { timestamp: new Date().toISOString() });

    try {
      console.log('🚀 Starting KELEDON Complete Production Testing');
      
      // Phase 1: Readiness Assessment
      this.currentPhase = 'readiness_assessment';
      this.emit('phase_started', { phase: this.currentPhase });
      
      this.readinessAssessment = new ProductionReadinessAssessment();
      this.results.readiness = await this.readinessAssessment.assessReadiness();
      
      this.emit('phase_completed', { 
        phase: this.currentPhase, 
        results: this.results.readiness 
      });

      // Phase 2: Production Scenarios
      this.currentPhase = 'production_scenarios';
      this.emit('phase_started', { phase: this.currentPhase });
      
      this.testSuite = new ProductionTestSuite({
        production_mode: true,
        use_real_stt: true,
        use_real_tts: true,
        test_timeout_ms: 60000
      });

      // Setup event listeners
      this.setupTestSuiteListeners();
      
      this.results.production = await this.testSuite.runProductionSuite();
      
      this.emit('phase_completed', { 
        phase: this.currentPhase, 
        results: this.results.production 
      });

      // Phase 3: Final Assessment
      this.currentPhase = 'final_assessment';
      this.emit('phase_started', { phase: this.currentPhase });
      
      this.results.final = this.generateFinalAssessment();
      
      this.emit('phase_completed', { 
        phase: this.currentPhase, 
        results: this.results.final 
      });

      // Phase 4: Production Verdict
      this.currentPhase = 'verdict';
      this.emit('phase_started', { phase: this.currentPhase });
      
      const verdict = this.generateProductionVerdict();
      this.results.verdict = verdict;
      
      this.emit('production_testing_completed', verdict);
      
      console.log('🏁 Complete Production Testing Finished');
      this.displayFinalResults(verdict);

      this.currentPhase = 'completed';
      return verdict;

    } catch (error) {
      console.error('Production testing failed:', error);
      
      this.results.error = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      };
      
      this.emit('production_testing_failed', this.results.error);
      return this.results.error;
      
    } finally {
      this.isRunning = false;
      this.currentPhase = 'idle';
    }
  }

  /**
   * Setup test suite event listeners
   */
  setupTestSuiteListeners() {
    this.testSuite.on('production_suite_started', (data) => {
      console.log('🎯 Production Suite Started:', data.timestamp);
    });

    this.testSuite.on('scenario_started', (data) => {
      console.log(`📋 Scenario: ${data.scenario}`);
    });

    this.testSuite.on('scenario_completed', (data) => {
      console.log(`✅ Scenario: ${data.scenario} - Score: ${data.result.overall_score}`);
    });

    this.testSuite.on('production_suite_completed', (results) => {
      console.log('📊 Production Suite Completed');
      console.log('Production Readiness Score:', results.production_readiness.score);
      console.log('Status:', results.overall_status);
    });
  }

  /**
   * Generate final assessment
   */
  generateFinalAssessment() {
    return {
      timestamp: new Date().toISOString(),
      readiness_assessment: this.results.readiness,
      production_scenarios: this.results.production,
      overall_score: this.calculateOverallScore(),
      production_ready: this.isProductionReady(),
      critical_issues: this.identifyCriticalIssues(),
      recommendations: this.generateFinalRecommendations()
    };
  }

  /**
   * Generate production verdict
   */
  generateProductionVerdict() {
    const finalAssessment = this.results.final;
    
    return {
      timestamp: new Date().toISOString(),
      verdict: finalAssessment.production_ready ? 'PRODUCTION READY' : 'NOT PRODUCTION READY',
      overall_score: finalAssessment.overall_score,
      readiness_score: finalAssessment.readiness_assessment.total_score,
      critical_blockers: finalAssessment.critical_issues.filter(issue => issue.severity === 'critical'),
      recommendation: finalAssessment.production_ready ? 
        'Deploy to production environment' : 
        'Address critical issues before production',
      deployment_risk: this.assessDeploymentRisk(),
      next_steps: finalAssessment.production_ready ? [
        'Deploy to production',
        'Monitor production metrics',
        'Set up production alerting'
      ] : [
        'Fix critical blockers',
        'Re-run production testing',
        'Schedule production readiness review'
      ]
    };
  }

  /**
   * Calculate overall score
   */
  calculateOverallScore() {
    const readinessScore = this.results.readiness?.total_score || 0;
    const productionScore = this.results.production?.production_readiness?.score || 0;
    
    return Math.round((readinessScore + productionScore) / 2);
  }

  /**
   * Check if production ready
   */
  isProductionReady() {
    const readinessScore = this.results.readiness?.total_score || 0;
    const productionScore = this.results.production?.production_readiness?.score || 0;
    
    return readinessScore >= 85 && productionScore >= 85;
  }

  /**
   * Identify critical issues
   */
  identifyCriticalIssues() {
    const issues = [];
    
    // Check readiness assessment critical issues
    if (this.results.readiness) {
      const blockers = this.results.readiness.blockers || [];
      blockers.forEach(blocker => {
        issues.push({
          type: 'blocker',
          category: 'readiness_assessment',
          severity: 'critical',
          description: blocker.description,
          impact: 'Prevents production deployment'
        });
      });
    }

    // Check production scenario issues
    if (this.results.production) {
      const scenarios = Object.values(this.results.production.scenarios || {});
      scenarios.forEach(scenario => {
        if (scenario.status === 'failed') {
          issues.push({
            type: 'scenario_failure',
            category: 'production_scenario',
            severity: scenario.name === 'real_voice_command' ? 'critical' : 'high',
            description: `Failed scenario: ${scenario.name}`,
            impact: scenario.error
          });
        }
      });
    }

    return issues.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Assess deployment risk
   */
  assessDeploymentRisk() {
    const score = this.calculateOverallScore();
    
    if (score >= 95) return 'LOW';
    if (score >= 85) return 'MEDIUM';
    if (score >= 70) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Generate final recommendations
   */
  generateFinalRecommendations() {
    const recommendations = [];
    const criticalIssues = this.identifyCriticalIssues();

    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        type: 'immediate',
        description: 'Address all critical blockers before any production deployment',
        timeframe: 'Immediate'
      });
    }

    const readinessScore = this.results.readiness?.total_score || 0;
    
    if (readinessScore < 100) {
      recommendations.push({
        priority: 'HIGH',
        type: 'readiness',
        description: 'Complete remaining readiness criteria',
        timeframe: '1-2 weeks'
      });
    }

    const productionScore = this.results.production?.production_readiness?.score || 0;
    
    if (productionScore < 100) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'production',
        description: 'Improve production scenario performance',
        timeframe: '2-4 weeks'
      });
    }

    return recommendations;
  }

  /**
   * Display final results
   */
  displayFinalResults(verdict) {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 KELEDON PRODUCTION TESTING RESULTS');
    console.log('='.repeat(80));
    console.log('\n📊 OVERALL ASSESSMENT:');
    console.log(`   Overall Score: ${verdict.overall_score}/100`);
    console.log(`   Readiness Score: ${verdict.readiness_score}/100`);
    console.log(`   Production Verdict: ${verdict.verdict}`);
    console.log(`   Deployment Risk: ${verdict.deployment_risk}`);
    
    console.log('\n⚠️  CRITICAL ISSUES:');
    if (verdict.critical_blockers.length === 0) {
      console.log('   ✅ No critical issues identified');
    } else {
      verdict.critical_blockers.forEach(issue => {
        console.log(`   ❌ ${issue.description} (${issue.severity.toUpperCase()})`);
      });
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    verdict.next_steps.forEach(step => {
      console.log(`   • ${step}`);
    });
    
    console.log('\n🎯 PRODUCTION READINESS:');
    if (verdict.verdict === 'PRODUCTION READY') {
      console.log('   ✅ KELEDON IS PRODUCTION READY');
      console.log('   ✅ All critical criteria met');
      console.log('   ✅ Ready for production deployment');
    } else {
      console.log('   ❌ KELEDON IS NOT PRODUCTION READY');
      console.log('   ❌ Critical issues must be addressed');
      console.log('   ❌ Do not deploy to production');
    }
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      is_running: this.isRunning,
      current_phase: this.currentPhase,
      results: this.results,
      configuration: {
        test_suite: this.testSuite?.getConfig() || null,
        readiness_assessment: this.readinessAssessment?.assessmentCriteria || null
      }
    };
  }

  /**
   * Get test results
   */
  getResults() {
    return this.results;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.testSuite) {
      this.testSuite.removeAllListeners();
      this.testSuite = null;
    }
    
    this.readinessAssessment = null;
    this.removeAllListeners();
    this.isRunning = false;
    this.currentPhase = 'idle';
    this.results = {};
  }
}

// Export for direct usage
export default ProductionTestRunner;