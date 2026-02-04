/**
 * Production Readiness Assessment - Final KELEDON V1 Validation
 * Determines if system is ready for real production deployment
 */

import { ProductionTestSuite } from './production-test-suite.js';
import { IntegrationTestSuite } from '../integration/integration-test-suite.js';

export class ProductionReadinessAssessment {
  constructor() {
    this.assessmentCriteria = {
      // Must-have criteria for production
      real_websocket_connection: {
        weight: 20,
        description: 'Real WebSocket connection to cloud backend'
      },
      real_session_management: {
        weight: 15,
        description: 'Real session creation and persistence with UUIDs'
      },
      canonical_event_contracts: {
        weight: 15,
        description: 'Events conform to canonical contract schema'
      },
      real_stt_processing: {
        weight: 10,
        description: 'Real speech-to-text processing (no mocks)'
      },
      real_command_execution: {
        weight: 10,
        description: 'Real command execution (say, ui_steps) with observable effects'
      },
      end_to_end_flow: {
        weight: 15,
        description: 'Complete flow from audio input to command execution'
      },
      error_handling: {
        weight: 10,
        description: 'Comprehensive error handling and recovery'
      },
      no_demo_mode: {
        weight: 5,
        description: 'No demo or simulation mode active'
      }
    };

    this.readinessLevels = {
      100: 'PRODUCTION READY',
      85: 'PRODUCTION READY WITH MINORS',
      70: 'PRODUCTION CANDIDATE',
      50: 'DEVELOPMENT NEEDED',
      0: 'NOT READY'
    };
  }

  /**
   * Assess production readiness
   * @returns {Promise<Object>} Production readiness assessment
   */
  async assessReadiness() {
    console.log('🎯 Starting KELEDON Production Readiness Assessment');

    const assessment = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      criteria_scores: {},
      total_score: 0,
      readiness_level: 'NOT READY',
      recommendations: [],
      blockers: [],
      next_steps: []
    };

    try {
      // Evaluate each criterion
      for (const [criterion, config] of Object.entries(this.assessmentCriteria)) {
        assessment.criteria_scores[criterion] = await this.evaluateCriterion(criterion, config);
      }

      // Calculate total weighted score
      assessment.total_score = this.calculateWeightedScore(assessment.criteria_scores);
      
      // Determine readiness level
      assessment.readiness_level = this.determineReadinessLevel(assessment.total_score);
      
      // Generate recommendations
      assessment.recommendations = this.generateRecommendations(assessment.criteria_scores);
      
      // Identify blockers
      assessment.blockers = this.identifyBlockers(assessment.criteria_scores);
      
      // Generate next steps
      assessment.next_steps = this.generateNextSteps(assessment.readiness_level, assessment.blockers);

      console.log(`📊 Assessment Complete - Score: ${assessment.total_score} - Level: ${assessment.readiness_level}`);

    } catch (error) {
      console.error('Assessment failed:', error);
      assessment.error = error.message;
      assessment.readiness_level = 'ERROR';
    }

    return assessment;
  }

  /**
   * Evaluate individual criterion
   */
  async evaluateCriterion(criterion, config) {
    console.log(`🔍 Evaluating criterion: ${criterion}`);

    switch (criterion) {
      case 'real_websocket_connection':
        return await this.testWebSocketConnection();
      
      case 'real_session_management':
        return await this.testSessionManagement();
      
      case 'canonical_event_contracts':
        return await this.testCanonicalContracts();
      
      case 'real_stt_processing':
        return await this.testSTTProcessing();
      
      case 'real_command_execution':
        return await this.testCommandExecution();
      
      case 'end_to_end_flow':
        return await this.testEndToEndFlow();
      
      case 'error_handling':
        return await this.testErrorHandling();
      
      case 'no_demo_mode':
        return this.testNoDemoMode();
      
      default:
        return { score: 0, status: 'unknown', details: 'Unknown criterion' };
    }
  }

  /**
   * Test WebSocket connection
   */
  async testWebSocketConnection() {
    try {
      // Test connection to real WebSocket endpoint
      const response = await fetch('https://api.keledon.com/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      return {
        score: response.ok ? 100 : 0,
        status: response.ok ? 'passed' : 'failed',
        details: response.ok ? 'WebSocket endpoint reachable' : 'WebSocket endpoint unreachable',
        test_url: 'https://api.keledon.com/agent'
      };
    } catch (error) {
      return {
        score: 0,
        status: 'failed',
        details: `Connection test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Test session management
   */
  async testSessionManagement() {
    try {
      // Test session creation endpoint
      const sessionResponse = await fetch('https://api.keledon.com/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      const sessionData = await sessionResponse.json();
      
      const hasRealUUID = sessionData.session_id && 
                             sessionData.session_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{4}-4[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      return {
        score: sessionResponse.ok && hasRealUUID ? 100 : 0,
        status: sessionResponse.ok ? 'passed' : 'failed',
        details: sessionResponse.ok ? 
          'Real session management with UUID generation verified' : 
          'Session management endpoint not responding correctly',
        session_data: sessionData
      };
    } catch (error) {
      return {
        score: 0,
        status: 'failed',
        details: `Session management test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Test canonical contracts
   */
  async testCanonicalContracts() {
    try {
      // Test event contract validation
      const testEvent = {
        event_id: 'test-uuid-validation',
        session_id: 'test-session-validation',
        timestamp: new Date().toISOString(),
        type: 'text_input',
        payload: {
          text: 'Test text',
          confidence: 0.9,
          provider: 'test'
        }
      };

      const contractResponse = await fetch('https://api.keledon.com/validate/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent)
      });

      const isValid = contractResponse.ok;
      
      return {
        score: isValid ? 100 : 0,
        status: isValid ? 'passed' : 'failed',
        details: isValid ? 
          'Canonical event contracts validation passed' : 
          'Canonical event contracts validation failed',
        validation_result: await contractResponse.json()
      };
    } catch (error) {
      return {
        score: 0,
        status: 'failed',
        details: `Contract validation test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Test STT processing
   */
  async testSTTProcessing() {
    try {
      // Test STT availability and configuration
      const sttResponse = await fetch('https://api.keledon.com/test/stt', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const sttData = await sttResponse.json();
      
      const hasRealProvider = sttData.providers && 
                                 sttData.providers.some(p => p.type !== 'mock');
      
      const isConfigured = sttData.configured && 
                           sttData.configured.some(p => p.status === 'active');

      return {
        score: sttResponse.ok && hasRealProvider && isConfigured ? 100 : 0,
        status: sttResponse.ok ? 'passed' : 'failed',
        details: sttResponse.ok ? 
          'Real STT processing with actual providers verified' : 
          'STT processing not properly configured',
        stt_data: sttData
      };
    } catch (error) {
      return {
        score: 0,
        status: 'failed',
        details: `STT processing test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Test command execution
   */
  async testCommandExecution() {
    try {
      // Test command execution capabilities
      const commandResponse = await fetch('https://api.keledon.com/test/commands', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const commandData = await commandResponse.json();
      
      const canExecuteSay = commandData.capabilities && 
                             commandData.capabilities.includes('say');
      
      const canExecuteUISteps = commandData.capabilities && 
                                 commandData.capabilities.includes('ui_steps');
      
      const hasObservableEffects = commandData.observable_effects === true;

      return {
        score: commandResponse.ok && canExecuteSay && hasObservableEffects ? 100 : 50,
        status: commandResponse.ok ? 'passed' : 'failed',
        details: commandResponse.ok ? 
          'Real command execution with observable effects verified' : 
          'Command execution not properly configured',
        command_data: commandData
      };
    } catch (error) {
      return {
        score: 0,
        status: 'failed',
        details: `Command execution test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Test end-to-end flow
   */
  async testEndToEndFlow() {
    try {
      // Test complete flow with simulation
      const flowResponse = await fetch('https://api.keledon.com/test/e2e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'voice_command_to_tts_response',
          timeout_ms: 30000
        })
      });

      const flowData = await flowResponse.json();
      
      const flowCompleted = flowData.status === 'completed';
      const allStepsPassed = flowData.steps && 
                           flowData.steps.every(step => step.status === 'success');
      
      return {
        score: flowResponse.ok && flowCompleted && allStepsPassed ? 100 : 0,
        status: flowResponse.ok ? 'passed' : 'failed',
        details: flowResponse.ok ? 
          'End-to-end flow completed successfully' : 
          'End-to-end flow failed or incomplete',
        flow_data: flowData
      };
    } catch (error) {
      return {
        score: 0,
        status: 'failed',
        details: `End-to-end flow test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    try {
      // Test error handling capabilities
      const errorResponse = await fetch('https://api.keledon.com/test/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_types: ['connection_failure', 'invalid_data', 'timeout']
        })
      });

      const errorData = await errorResponse.json();
      
      const handlesAllErrors = errorData.handled_errors && 
                               errorData.handled_errors.length === 3;
      
      const hasRecovery = errorData.recovery_mechanisms === true;

      return {
        score: errorResponse.ok && handlesAllErrors && hasRecovery ? 100 : 0,
        status: errorResponse.ok ? 'passed' : 'failed',
        details: errorResponse.ok ? 
          'Comprehensive error handling verified' : 
          'Error handling not properly implemented',
        error_data: errorData
      };
    } catch (error) {
      return {
        score: 0,
        status: 'failed',
        details: `Error handling test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Test no demo mode
   */
  testNoDemoMode() {
    const isDemoMode = 
      window.location.search.indexOf('DEMO_MODE=true') !== -1 ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    return {
      score: !isDemoMode ? 100 : 0,
      status: !isDemoMode ? 'passed' : 'failed',
      details: !isDemoMode ? 
        'Production mode verified (no demo flags)' : 
        'Demo mode detected - not production ready',
      demo_indicators: {
        search_params: window.location.search,
        hostname: window.location.hostname,
        protocol: window.location.protocol
      }
    };
  }

  /**
   * Calculate weighted score
   */
  calculateWeightedScore(criteriaScores) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [criterion, result] of Object.entries(criteriaScores)) {
      const weight = this.assessmentCriteria[criterion].weight;
      totalScore += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Determine readiness level
   */
  determineReadinessLevel(score) {
    for (const [threshold, level] of Object.entries(this.readinessLevels).sort((a, b) => b[0] - a[0])) {
      if (score >= parseInt(threshold)) {
        return level;
      }
    }
    return this.readinessLevels[0];
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(criteriaScores) {
    const recommendations = [];

    for (const [criterion, result] of Object.entries(criteriaScores)) {
      if (result.status === 'failed' || result.score < 80) {
        recommendations.push({
          criterion,
          priority: this.assessmentCriteria[criterion].weight,
          description: `Fix: ${this.assessmentCriteria[criterion].description}`,
          current_score: result.score,
          target_score: 100
        });
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Identify blockers
   */
  identifyBlockers(criteriaScores) {
    const blockers = [];
    const criticalCriteria = ['real_websocket_connection', 'real_session_management', 'canonical_event_contracts'];

    for (const criterion of criticalCriteria) {
      const result = criteriaScores[criterion];
      if (result.status === 'failed' || result.score === 0) {
        blockers.push({
          criterion,
          description: this.assessmentCriteria[criterion].description,
          impact: 'BLOCKER'
        });
      }
    }

    return blockers;
  }

  /**
   * Generate next steps
   */
  generateNextSteps(readinessLevel, blockers) {
    const steps = [];

    if (blockers.length > 0) {
      steps.push('Fix all critical blockers before production deployment');
      steps.push('Re-run readiness assessment after fixes');
    }

    switch (readinessLevel) {
      case 'PRODUCTION READY':
        steps.push('Deploy to production environment');
        steps.push('Monitor production metrics');
        steps.push('Set up production alerting');
        break;
      case 'PRODUCTION READY WITH MINORS':
        steps.push('Address minor issues within 7 days');
        steps.push('Deploy to production with monitoring');
        break;
      case 'PRODUCTION CANDIDATE':
        steps.push('Complete remaining development tasks');
        steps.push('Achieve >80% readiness score');
        steps.push('Schedule production deployment');
        break;
      case 'DEVELOPMENT NEEDED':
        steps.push('Complete core functionality development');
        steps.push('Implement missing production features');
        steps.push('Achieve >70% readiness score');
        break;
      default:
        steps.push('Address critical production blockers');
        steps.push('Implement core production requirements');
        break;
    }

    return steps;
  }
}

// Export for easy usage
export default ProductionReadinessAssessment;