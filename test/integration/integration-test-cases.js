import { MainTextInputService } from '../services/main-text-input.service.js';
import { CommandResponseIntegrationService } from '../services/command-response-integration.service.js';
import { WebSocketClient } from '../core/websocket-client.js';
import { SessionManager } from '../core/session-manager.js';

export class IntegrationTestCaseMethods {
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
}
