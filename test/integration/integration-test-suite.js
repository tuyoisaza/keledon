/**
 * Integration Test Suite - End-to-End Runtime Verification
 * Tests complete WebRTC flow from agent to cloud and back
 */

import { EventEmitter } from '../core/event-router.js';
import { IntegrationTestCaseMethods } from './integration-test-cases.js';

export class IntegrationTestSuite extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      // Test configuration
      test_websocket_url: 'ws://localhost:3001/agent',
      test_session_name: 'Integration Test Session',
      
      // Test timeout settings
      connection_timeout_ms: 10000,
      session_timeout_ms: 30000,
      text_input_timeout_ms: 15000,
      command_timeout_ms: 10000,
      
      // Test data
      test_phrases: [
        'Hello KELEDON',
        'What can you do?',
        'Thank you'
      ],
      
      // Test controls
      simulate_audio: true,
      simulate_speech: true,
      skip_permissions_test: false,
      
      ...config
    };
    
    this.services = {};
    this.testResults = [];
    this.isRunning = false;
    this.currentTest = null;
  }

  /**
   * Run complete integration test suite
   * @returns {Promise<Object>} Test results
   */
  async runFullSuite() {
    if (this.isRunning) {
      throw new Error('Test suite already running');
    }

    this.isRunning = true;
    this.emit('suite_started', { timestamp: new Date().toISOString() });
    
    try {
      console.log('IntegrationTestSuite: Starting full integration test suite');
      
      const results = {
        started_at: new Date().toISOString(),
        tests: {},
        overall_status: 'running',
        summary: {}
      };

      // Test 1: Service Initialization
      results.tests.service_initialization = await this.testServiceInitialization();
      
      // Test 2: WebSocket Connection
      results.tests.websocket_connection = await this.testWebSocketConnection();
      
      // Test 3: Session Creation
      results.tests.session_creation = await this.testSessionCreation();
      
      // Test 4: Audio Permissions
      results.tests.audio_permissions = await this.testAudioPermissions();
      
      // Test 5: Text Input Flow
      results.tests.text_input_flow = await this.testTextInputFlow();
      
      // Test 6: Command Processing
      results.tests.command_processing = await this.testCommandProcessing();
      
      // Test 7: End-to-End Flow
      results.tests.end_to_end_flow = await this.testEndToEndFlow();
      
      // Test 8: Error Handling
      results.tests.error_handling = await this.testErrorHandling();
      
      // Calculate summary
      results.summary = this.calculateTestSummary(results.tests);
      results.overall_status = results.summary.all_passed ? 'passed' : 'failed';
      results.completed_at = new Date().toISOString();
      results.duration_ms = new Date(results.completed_at).getTime() - new Date(results.started_at).getTime();

      this.testResults.push(results);
      
      this.emit('suite_completed', results);
      console.log('IntegrationTestSuite: Test suite completed');
      
      return results;

    } catch (error) {
      console.error('IntegrationTestSuite: Test suite failed:', error);
      
      const errorResults = {
        started_at: new Date().toISOString(),
        tests: {},
        overall_status: 'error',
        error: error.message,
        completed_at: new Date().toISOString()
      };
      
      this.testResults.push(errorResults);
      this.emit('suite_error', errorResults);
      
      return errorResults;
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test service initialization
   */
  async verifyAllServicesReady() {
    const textInputStatus = this.services.textInputService?.getStatus();
    const commandStatus = this.services.commandResponseService?.getStatus();
    
    return (
      textInputStatus?.initialized &&
      textInputStatus?.active &&
      commandStatus?.initialized &&
      commandStatus?.active &&
      this.services.websocketClient?.isConnected()
    );
  }

  /**
   * Helper: Send simulated text input event
   */
  async sendSimulatedTextInput() {
    if (!this.services.websocketClient?.isConnected()) {
      return false;
    }

    try {
      // Send simulated text input event
      const success = this.services.websocketClient.sendBrainEvent('text_input', {
        text: this.config.test_phrases[0],
        confidence: 0.9,
        provider: 'test',
        metadata: {
          simulated: true,
          test_timestamp: new Date().toISOString()
        }
      });

      return success;
      
    } catch (error) {
      console.error('Failed to send simulated text input:', error);
      return false;
    }
  }

  /**
   * Helper: Wait for command response
   */
  async waitForCommandResponse() {
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, this.config.command_timeout_ms);

      this.services.commandResponseService.on('command_started', (data) => {
        clearTimeout(timeout);
        resolve(true);
      });

      this.services.websocketClient.on('command:received', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  /**
   * Helper: Verify command execution
   */
  async verifyCommandExecution() {
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, this.config.command_timeout_ms);

      this.services.commandResponseService.on('command_completed', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }

  /**
   * Helper: Test invalid event handling
   */
  async testInvalidEventHandling() {
    return new Promise(resolve => {
      this.services.websocketClient.on('error', () => {
        resolve(true);
      });

      // Send invalid event
      this.services.websocketClient.send({
        invalid: 'event'
      });

      setTimeout(() => resolve(false), 2000);
    });
  }

  /**
   * Helper: Test WebSocket disconnection
   */
  async testWebSocketDisconnection() {
    return new Promise(resolve => {
      this.services.websocketClient.on('connection:closed', () => {
        resolve(true);
      });

      // Disconnect WebSocket
      this.services.websocketClient.disconnect();

      setTimeout(() => resolve(false), 5000);
    });
  }

  /**
   * Helper: Test service error handling
   */
  async testServiceErrorHandling() {
    return new Promise(resolve => {
      this.services.textInputService.on('error', () => {
        resolve(true);
      });

      // Trigger error by trying to start without permissions
      this.services.textInputService.start().catch(() => {
        setTimeout(() => resolve(false), 1000);
      });
    });
  }

  /**
   * Calculate test summary
   */
  calculateTestSummary(tests) {
    const testNames = Object.keys(tests);
    const passedTests = testNames.filter(name => tests[name].status === 'passed');
    const failedTests = testNames.filter(name => tests[name].status === 'failed');

    return {
      total_tests: testNames.length,
      passed_tests: passedTests.length,
      failed_tests: failedTests.length,
      pass_rate: Math.round((passedTests.length / testNames.length) * 100),
      all_passed: failedTests.length === 0,
      test_results: tests
    };
  }

  /**
   * Get test configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update test configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', { config: this.config });
  }

  /**
   * Get current test results
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults = [];
    this.emit('results_cleared', {});
  }

  /**
   * Generate test report
   */
  generateReport() {
    if (this.testResults.length === 0) {
      return null;
    }

    const latestResults = this.testResults[this.testResults.length - 1];
    
    return {
      timestamp: new Date().toISOString(),
      suite: 'KELEDON Integration Test Suite',
      version: '1.0.0',
      configuration: this.config,
      results: latestResults,
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        webSocket: 'WebSocket' in window,
        audioContext: 'AudioContext' in window
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Stop all services
      if (this.services.textInputService) {
        await this.services.textInputService.cleanup();
      }
      
      if (this.services.commandResponseService) {
        await this.services.commandResponseService.cleanup();
      }
      
      if (this.services.websocketClient) {
        this.services.websocketClient.disconnect();
      }
      
      if (this.services.sessionManager) {
        this.services.sessionManager.cleanup();
      }
      
      // Clear results
      this.clearResults();
      
      this.removeAllListeners();
      
      console.log('IntegrationTestSuite: Cleaned up');
      
    } catch (error) {
      console.error('IntegrationTestSuite: Error during cleanup:', error);
    }
  }
}
Object.getOwnPropertyNames(IntegrationTestCaseMethods.prototype)
  .filter((name) => name !== 'constructor')
  .forEach((name) => {
    Object.defineProperty(
      IntegrationTestSuite.prototype,
      name,
      Object.getOwnPropertyDescriptor(IntegrationTestCaseMethods.prototype, name)
    );
  });