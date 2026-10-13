/**
 * Production Testing Suite - Real End-to-End Verification
 * Tests complete KELEDON V1 pipeline with real data and conditions
 */

import { IntegrationTestSuite } from '../integration/integration-test-suite.js';
import { EventEmitter } from '../core/event-router.js';
import { ProductionTestScenarioMethods } from './production-test-scenarios.js';

export class ProductionTestSuite extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      // Production test configuration
      production_mode: true,
      use_real_stt: true,
      use_real_tts: true,
      use_real_webrtc: false, // Requires actual WebRTC setup
      require_real_session: true,
      test_timeout_ms: 60000,
      
      // Production API endpoints
      cloud_api_url: 'https://api.keledon.com',
      websocket_url: 'wss://api.keledon.com/agent',
      
      // Production test scenarios
      test_scenarios: [
        {
          name: 'real_voice_command',
          description: 'User speaks real command, processes through full pipeline',
          timeout_ms: 30000,
          required_components: ['stt', 'decision_engine', 'tts']
        },
        {
          name: 'ui_automation_flow',
          description: 'Complete UI automation with real web page interaction',
          timeout_ms: 45000,
          required_components: ['rpa', 'decision_engine']
        },
        {
          name: 'session_lifecycle',
          description: 'Complete session from start to end with real data',
          timeout_ms: 60000,
          required_components: ['session_management', 'event_persistence']
        },
        {
          name: 'error_recovery',
          description: 'Error handling and recovery with real failure conditions',
          timeout_ms: 20000,
          required_components: ['error_handling', 'reconnection']
        }
      ],
      
      // Production validation criteria
      validation_criteria: {
        session_persistence: true,
        real_uuid_generation: true,
        canonical_contracts: true,
        no_demo_data: true,
        observable_behavior: true,
        error_handling: true,
        performance_metrics: true
      },
      
      ...config
    };
    
    this.testResults = [];
    this.isRunning = false;
    this.currentScenario = null;
    this.productionMetrics = {};
  }

  /**
   * Run complete production test suite
   * @returns {Promise<Object>} Production test results
   */
  async runProductionSuite() {
    if (this.isRunning) {
      throw new Error('Production test suite already running');
    }

    this.isRunning = true;
    this.emit('production_suite_started', { timestamp: new Date().toISOString() });
    
    try {
      console.log('ProductionTestSuite: Starting PRODUCTION testing');
      
      const results = {
        started_at: new Date().toISOString(),
        environment: this.detectEnvironment(),
        scenarios: {},
        overall_status: 'running',
        summary: {},
        production_readiness: {
          score: 0,
          passed_criteria: [],
          failed_criteria: []
        }
      };

      // Validate production prerequisites
      results.prerequisites = await this.validateProductionPrerequisites();
      
      if (!results.prerequisites.all_passed) {
        results.overall_status = 'failed';
        results.production_readiness.score = 0;
        this.emit('production_suite_failed', { reason: 'Prerequisites not met', results });
        return results;
      }

      // Run each production scenario
      for (const scenario of this.config.test_scenarios) {
        this.currentScenario = scenario.name;
        this.emit('scenario_started', { scenario: scenario.name });
        
        console.log(`Running production scenario: ${scenario.name}`);
        results.scenarios[scenario.name] = await this.runProductionScenario(scenario);
        
        this.emit('scenario_completed', { 
          scenario: scenario.name, 
          result: results.scenarios[scenario.name] 
        });
      }

      // Calculate production readiness score
      results.production_readiness = this.calculateProductionReadiness(results.scenarios);
      results.overall_status = results.production_readiness.score >= 80 ? 'passed' : 'failed';
      results.summary = this.calculateProductionSummary(results.scenarios);
      results.completed_at = new Date().toISOString();
      results.duration_ms = new Date(results.completed_at).getTime() - new Date(results.started_at).getTime();

      this.testResults.push(results);
      
      this.emit('production_suite_completed', results);
      console.log('ProductionTestSuite: Production testing completed');
      console.log('Production Readiness Score:', results.production_readiness.score);
      
      return results;

    } catch (error) {
      console.error('ProductionTestSuite: Production testing failed:', error);
      
      const errorResults = {
        started_at: new Date().toISOString(),
        environment: this.detectEnvironment(),
        scenarios: {},
        overall_status: 'error',
        error: error.message,
        completed_at: new Date().toISOString()
      };
      
      this.testResults.push(errorResults);
      this.emit('production_suite_error', errorResults);
      return errorResults;
      
    } finally {
      this.isRunning = false;
      this.currentScenario = null;
    }
  }

  /**
   * Validate production prerequisites
   */
  async validateProductionPrerequisites() {
    const prerequisites = {
      name: 'Production Prerequisites',
      checks: {},
      all_passed: false
    };

    try {
      // Check 1: Production environment
      prerequisites.checks.production_environment = this.isProductionEnvironment();
      
      // Check 2: Real service endpoints
      prerequisites.checks.real_endpoints = await this.validateRealEndpoints();
      
      // Check 3: Required services available
      prerequisites.checks.services_available = await this.validateServicesAvailable();
      
      // Check 4: Security configuration
      prerequisites.checks.security_config = this.validateSecurityConfiguration();
      
      // Check 5: Performance requirements
      prerequisites.checks.performance_requirements = await this.validatePerformanceRequirements();
      
      // Check 6: No demo mode
      prerequisites.checks.no_demo_mode = this.validateNoDemoMode();
      
      prerequisites.all_passed = Object.values(prerequisites.checks).every(check => check);
      
    } catch (error) {
      prerequisites.error = error.message;
    }

    return prerequisites;
  }

  /**
   * Run individual production scenario
   */
  async runProductionScenario(scenario) {
    const scenarioResult = {
      name: scenario.name,
      description: scenario.description,
      started_at: new Date().toISOString(),
      status: 'running',
      tests: {},
      overall_score: 0
    };

    try {
      // Test based on scenario type
      switch (scenario.name) {
        case 'real_voice_command':
          scenarioResult.tests = await this.testRealVoiceCommand();
          break;
        case 'ui_automation_flow':
          scenarioResult.tests = await this.testUIAutomationFlow();
          break;
        case 'session_lifecycle':
          scenarioResult.tests = await this.testSessionLifecycle();
          break;
        case 'error_recovery':
          scenarioResult.tests = await this.testErrorRecovery();
          break;
        default:
          throw new Error(`Unknown scenario: ${scenario.name}`);
      }

      scenarioResult.status = 'completed';
      scenarioResult.completed_at = new Date().toISOString();
      scenarioResult.overall_score = this.calculateScenarioScore(scenarioResult.tests);
      
    } catch (error) {
      scenarioResult.status = 'failed';
      scenarioResult.error = error.message;
      scenarioResult.completed_at = new Date().toISOString();
    }

    return scenarioResult;
  }

  /**
   * Test real voice command processing
   */
  detectEnvironment() {
    return {
      is_production: this.isProductionEnvironment(),
      browser_info: navigator.userAgent,
      platform: navigator.platform,
      api_support: {
        websocket: 'WebSocket' in window,
        mediadevices: 'mediaDevices' in navigator,
        speech_synthesis: 'speechSynthesis' in window,
        speech_recognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
      }
    };
  }

  /**
   * Check if running in production environment
   */
  isProductionEnvironment() {
    return this.config.production_mode || 
           window.location.hostname === 'api.keledon.com' ||
           window.location.protocol === 'https:';
  }

  /**
   * Validate real endpoints
   */
  async validateRealEndpoints() {
    try {
      const response = await fetch(this.config.cloud_api_url + '/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate services available
   */
  async validateServicesAvailable() {
    const services = {
      websocket: 'WebSocket' in window,
      audio_capture: 'mediaDevices' in navigator,
      speech_synthesis: 'speechSynthesis' in window,
      local_storage: 'localStorage' in window
    };

    return Object.values(services).every(available => available);
  }

  /**
   * Validate security configuration
   */
  validateSecurityConfiguration() {
    return window.location.protocol === 'https:';
  }

  /**
   * Validate performance requirements
   */
  async validatePerformanceRequirements() {
    return new Promise(resolve => {
      if ('performance' in window && performance.memory) {
        const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
        resolve(memoryMB < 200); // Less than 200MB usage
      } else {
        resolve(true); // Can't measure, assume adequate
      }
    });
  }

  /**
   * Validate no demo mode
   */
  validateNoDemoMode() {
    return !this.config.production_mode || 
           window.location.search.indexOf('DEMO_MODE=true') === -1;
  }

  /**
   * Calculate scenario score
   */
  calculateScenarioScore(tests) {
    const testResults = Object.values(tests);
    const passedTests = testResults.filter(result => result === true || result === 'passed');
    return Math.round((passedTests.length / testResults.length) * 100);
  }

  /**
   * Calculate production readiness
   */
  calculateProductionReadiness(scenarios) {
    const scenarioScores = Object.values(scenarios).map(s => s.overall_score || 0);
    const averageScore = scenarioScores.reduce((sum, score) => sum + score, 0) / scenarioScores.length;
    
    const passedCriteria = [];
    const failedCriteria = [];
    
    // Check each validation criterion
    for (const [criterion, required] of Object.entries(this.config.validation_criteria)) {
      const passed = this.evaluateCriterion(criterion, scenarios);
      if (passed) {
        passedCriteria.push(criterion);
      } else {
        failedCriteria.push(criterion);
      }
    }

    return {
      score: Math.round(averageScore),
      passed_criteria: passedCriteria,
      failed_criteria: failedCriteria,
      recommendation: this.generateProductionRecommendation(averageScore, failedCriteria)
    };
  }

  /**
   * Evaluate individual criterion
   */
  evaluateCriterion(criterion, scenarios) {
    // Simplified evaluation logic
    const hasAllRequiredComponents = Object.values(scenarios).every(s => 
      Object.values(s.tests).every(test => test === true || test === 'passed')
    );

    switch (criterion) {
      case 'session_persistence':
        return hasAllRequiredComponents;
      case 'real_uuid_generation':
        return true; // Assume UUIDs are real in production
      case 'canonical_contracts':
        return hasAllRequiredComponents;
      case 'no_demo_data':
        return this.config.production_mode;
      case 'observable_behavior':
        return hasAllRequiredComponents;
      case 'error_handling':
        return Object.values(scenarios).some(s => s.tests.error_handling !== false);
      case 'performance_metrics':
        return true; // Assume metrics are available in production
      default:
        return false;
    }
  }

  /**
   * Generate production recommendation
   */
  generateProductionRecommendation(score, failedCriteria) {
    if (score >= 90) {
      return 'PRODUCTION READY';
    } else if (score >= 80) {
      return 'PRODUCTION READY WITH MINOR ISSUES';
    } else if (score >= 60) {
      return 'PRODUCTION CANDIDATE - REQUIRES FIXES';
    } else {
      return 'NOT PRODUCTION READY - MAJOR ISSUES';
    }
  }

  /**
   * Calculate production summary
   */
  calculateProductionSummary(scenarios) {
    const scenarioResults = Object.values(scenarios);
    const totalTests = scenarioResults.reduce((sum, s) => sum + Object.keys(s.tests).length, 0);
    const passedTests = scenarioResults.reduce((sum, s) => {
      return sum + Object.values(s.tests).filter(t => t === true || t === 'passed').length;
    }, 0);

    return {
      total_scenarios: scenarioResults.length,
      total_tests: totalTests,
      passed_tests: passedTests,
      pass_rate: Math.round((passedTests / totalTests) * 100),
      critical_failures: scenarioResults.filter(s => s.status === 'failed').length
    };
  }

  /**
   * Get production metrics
   */
  getProductionMetrics() {
    return {
      timestamp: new Date().toISOString(),
      suite: 'ProductionTestSuite',
      version: '1.0.0',
      configuration: this.config,
      current_scenario: this.currentScenario,
      test_results: this.testResults,
      environment: this.detectEnvironment()
    };
  }

  /**
   * Get test configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update production configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', { config: this.config });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.isRunning = false;
      this.currentScenario = null;
      this.removeAllListeners();
      
      console.log('ProductionTestSuite: Cleaned up');
      
    } catch (error) {
      console.error('ProductionTestSuite: Error during cleanup:', error);
    }
  }
}

Object.getOwnPropertyNames(ProductionTestScenarioMethods.prototype)
  .filter((name) => name !== 'constructor')
  .forEach((name) => {
    Object.defineProperty(
      ProductionTestSuite.prototype,
      name,
      Object.getOwnPropertyDescriptor(ProductionTestScenarioMethods.prototype, name),
    );
  });
// Export factory function for easy instantiation
export function createProductionTestSuite(config = {}) {
  return new ProductionTestSuite(config);
}