/**
 * Integration Test Suite - End-to-End Runtime Verification
 * Tests complete WebRTC flow from agent to cloud and back
 */

import { MainTextInputService } from '../services/main-text-input.service.js';
import { CommandResponseIntegrationService } from '../services/command-response-integration.service.js';
import { WebSocketClient } from '../core/websocket-client.js';
import { SessionManager } from '../core/session-manager.js';
import { EventEmitter } from '../core/event-router.js';

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
  async testServiceInitialization() {
    const test = {
      name: 'Service Initialization',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {}
    };

    try {
      this.emit('test_started', { test: test.name });

      // Initialize session manager
      this.services.sessionManager = new SessionManager();
      await this.services.sessionManager.initializeSession('test-session-' + Date.now());
      
      // Initialize WebSocket client
      this.services.websocketClient = new WebSocketClient(this.services.sessionManager);
      
      // Initialize text input service
      this.services.textInputService = new MainTextInputService(
        this.services.websocketClient,
        this.services.sessionManager,
        {
          stt_provider: 'local', // Use local STT for testing
          confidence_threshold: 0.5,
          request_permissions_on_init: false
        }
      );
      
      // Initialize command response service
      this.services.commandResponseService = new CommandResponseIntegrationService(
        this.services.websocketClient,
        this.services.sessionManager,
        {
          auto_execute_commands: true
        }
      );
      
      // Initialize all services
      await this.services.textInputService.initialize();
      await this.services.commandResponseService.initialize();
      
      test.status = 'passed';
      test.details = {
        session_manager_initialized: true,
        websocket_client_initialized: true,
        text_input_service_initialized: true,
        command_response_service_initialized: true
      };
      
      this.emit('test_passed', { test: test.name, details: test.details });
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Test WebSocket connection
   */
  async testWebSocketConnection() {
    const test = {
      name: 'WebSocket Connection',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {}
    };

    try {
      this.emit('test_started', { test: test.name });

      if (!this.services.websocketClient) {
        throw new Error('WebSocket client not initialized');
      }

      // Attempt connection
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.connection_timeout_ms);

        this.services.websocketClient.on('connection:established', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.services.websocketClient.on('connection:error', reject);
        this.services.websocketClient.connect(this.config.test_websocket_url);
      });

      await connectionPromise;

      test.status = 'passed';
      test.details = {
        connected: this.services.websocketClient.isConnected(),
        url: this.config.test_websocket_url,
        connection_time_ms: Date.now() - new Date(test.started_at).getTime()
      };
      
      this.emit('test_passed', { test: test.name, details: test.details });
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Test session creation
   */
  async testSessionCreation() {
    const test = {
      name: 'Session Creation',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {}
    };

    try {
      this.emit('test_started', { test: test.name });

      if (!this.services.websocketClient.isConnected()) {
        throw new Error('WebSocket not connected');
      }

      // Request session creation
      const sessionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Session creation timeout'));
        }, this.config.session_timeout_ms);

        this.services.websocketClient.on('session_created', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        this.services.websocketClient.emit('create_session', {
          name: this.config.test_session_name,
          user_id: 'test-user-' + Date.now()
        });
      });

      const sessionData = await sessionPromise;

      // Verify session data
      if (!sessionData.session_id || !sessionData.status) {
        throw new Error('Invalid session data received');
      }

      test.status = 'passed';
      test.details = {
        session_id: sessionData.session_id,
        session_status: sessionData.status,
        created_at: sessionData.timestamp,
        current_session: this.services.sessionManager.getCurrentSession()?.id || null
      };
      
      this.emit('test_passed', { test: test.name, details: test.details });
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Test audio permissions
   */
  async testAudioPermissions() {
    const test = {
      name: 'Audio Permissions',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {}
    };

    try {
      this.emit('test_started', { test: test.name });

      if (!this.services.textInputService) {
        throw new Error('Text input service not initialized');
      }

      // Check permissions
      const permissionState = await this.services.textInputService.checkPermissions();
      
      // Request permissions if not granted
      let permissionsGranted = false;
      if (permissionState === 'granted' || this.config.skip_permissions_test) {
        permissionsGranted = true;
      } else {
        permissionsGranted = await this.services.textInputService.requestPermissions();
      }

      test.status = permissionsGranted ? 'passed' : 'failed';
      test.details = {
        permission_state: permissionState,
        permissions_granted: permissionsGranted,
        audio_devices_available: await this.services.textInputService.getAudioDevices()
      };
      
      if (permissionsGranted) {
        this.emit('test_passed', { test: test.name, details: test.details });
      } else {
        this.emit('test_failed', { test: test.name, error: 'Audio permissions not granted' });
      }
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Test text input flow
   */
  async testTextInputFlow() {
    const test = {
      name: 'Text Input Flow',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {}
    };

    try {
      this.emit('test_started', { test: test.name });

      if (!this.services.textInputService) {
        throw new Error('Text input service not initialized');
      }

      // Mock audio capture for testing
      if (this.config.simulate_audio) {
        console.log('IntegrationTestSuite: Simulating audio capture for testing');
      }

      // Start text input service
      await this.services.textInputService.start();
      
      // Wait for text input processing to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const textInputStatus = this.services.textInputService.getStatus();
      
      test.status = textInputStatus.initialized && textInputStatus.active ? 'passed' : 'failed';
      test.details = {
        service_initialized: textInputStatus.initialized,
        service_active: textInputStatus.active,
        websocket_connected: textInputStatus.websocket,
        current_session: textInputStatus.current_session,
        stt_stats: textInputStatus.stt
      };
      
      if (test.status === 'passed') {
        this.emit('test_passed', { test: test.name, details: test.details });
      } else {
        this.emit('test_failed', { test: test.name, error: 'Text input service not ready' });
      }
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Test command processing
   */
  async testCommandProcessing() {
    const test = {
      name: 'Command Processing',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {}
    };

    try {
      this.emit('test_started', { test: test.name });

      if (!this.services.commandResponseService) {
        throw new Error('Command response service not initialized');
      }

      // Start command response service
      await this.services.commandResponseService.start();
      
      // Wait for command processing to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const commandStatus = this.services.commandResponseService.getStatus();
      
      test.status = commandStatus.initialized && commandStatus.active ? 'passed' : 'failed';
      test.details = {
        service_initialized: commandStatus.initialized,
        service_active: commandStatus.active,
        capabilities: commandStatus.capabilities,
        handler_status: commandStatus.components?.handler
      };
      
      if (test.status === 'passed') {
        this.emit('test_passed', { test: test.name, details: test.details });
      } else {
        this.emit('test_failed', { test: test.name, error: 'Command response service not ready' });
      }
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Test complete end-to-end flow
   */
  async testEndToEndFlow() {
    const test = {
      name: 'End-to-End Flow',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {
        flow_steps: []
      }
    };

    try {
      this.emit('test_started', { test: test.name });

      // Step 1: Verify all services are ready
      const servicesReady = await this.verifyAllServicesReady();
      test.details.flow_steps.push({
        step: 'services_ready',
        status: servicesReady ? 'passed' : 'failed',
        timestamp: new Date().toISOString()
      });

      // Step 2: Send simulated text input event
      if (servicesReady) {
        const textInputSent = await this.sendSimulatedTextInput();
        test.details.flow_steps.push({
          step: 'text_input_sent',
          status: textInputSent ? 'passed' : 'failed',
          timestamp: new Date().toISOString()
        });
      }

      // Step 3: Wait for command response
      if (textInputSent) {
        const commandReceived = await this.waitForCommandResponse();
        test.details.flow_steps.push({
          step: 'command_received',
          status: commandReceived ? 'passed' : 'failed',
          timestamp: new Date().toISOString()
        });
      }

      // Step 4: Verify command execution
      if (commandReceived) {
        const commandExecuted = await this.verifyCommandExecution();
        test.details.flow_steps.push({
          step: 'command_executed',
          status: commandExecuted ? 'passed' : 'failed',
          timestamp: new Date().toISOString()
        });
      }

      // Determine overall test status
      const allStepsPassed = test.details.flow_steps.every(step => step.status === 'passed');
      test.status = allStepsPassed ? 'passed' : 'failed';
      test.details.flow_summary = {
        total_steps: test.details.flow_steps.length,
        passed_steps: test.details.flow_steps.filter(step => step.status === 'passed').length,
        failed_steps: test.details.flow_steps.filter(step => step.status === 'failed').length
      };
      
      if (test.status === 'passed') {
        this.emit('test_passed', { test: test.name, details: test.details });
      } else {
        this.emit('test_failed', { test: test.name, error: 'End-to-end flow failed' });
      }
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    const test = {
      name: 'Error Handling',
      started_at: new Date().toISOString(),
      status: 'running',
      details: {}
    };

    try {
      this.emit('test_started', { test: test.name });

      // Test 1: Invalid event structure
      const invalidEventHandled = await this.testInvalidEventHandling();
      
      // Test 2: WebSocket disconnection
      const disconnectionHandled = await this.testWebSocketDisconnection();
      
      // Test 3: Service error handling
      const serviceErrorHandled = await this.testServiceErrorHandling();

      test.status = (invalidEventHandled && disconnectionHandled && serviceErrorHandled) ? 'passed' : 'failed';
      test.details = {
        invalid_event_handling: invalidEventHandled,
        disconnection_handling: disconnectionHandled,
        service_error_handling: serviceErrorHandled
      };
      
      if (test.status === 'passed') {
        this.emit('test_passed', { test: test.name, details: test.details });
      } else {
        this.emit('test_failed', { test: test.name, error: 'Error handling tests failed' });
      }
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.emit('test_failed', { test: test.name, error: error.message });
    }

    test.completed_at = new Date().toISOString();
    return test;
  }

  /**
   * Helper: Verify all services are ready
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