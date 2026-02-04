/**
 * Command Response Integration Service - Complete Implementation
 * Provides simple API for the full command response pipeline
 */

import { CommandHandlerService } from './command-handler.service.js';
import { EventEmitter } from '../core/event-router.js';

export class CommandResponseIntegrationService extends EventEmitter {
  constructor(websocketClient, sessionManager, config = {}) {
    super();
    this.websocketClient = websocketClient;
    this.sessionManager = sessionManager;
    this.config = {
      // Command processing config
      auto_execute_commands: true,
      validate_commands: true,
      max_queue_size: 10,
      
      // Execution config
      enable_tts: true,
      enable_ui_steps: true,
      enable_mode_changes: true,
      
      // Recovery config
      auto_retry_errors: true,
      max_retry_attempts: 3,
      
      ...config
    };
    
    this.commandHandler = null;
    this.isInitialized = false;
    this.isActive = false;
  }

  /**
   * Initialize command response integration
   */
  async initialize() {
    try {
      this.emit('initializing', {});
      
      // Create command handler service
      this.commandHandler = new CommandHandlerService(
        this.sessionManager,
        {
          auto_execute: this.config.auto_execute_commands,
          validate_commands: this.config.validate_commands
        }
      );
      
      // Setup command handler event handlers
      this.setupCommandHandlers();
      
      // Initialize the command handler
      await this.commandHandler.initialize();
      
      // Setup WebSocket client to receive commands
      this.setupWebSocketHandlers();
      
      this.isInitialized = true;
      
      this.emit('initialized', { 
        config: this.config,
        capabilities: this.getCapabilities()
      });
      
      console.log('CommandResponseIntegrationService: Initialized successfully');
      
    } catch (error) {
      console.error('CommandResponseIntegrationService: Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start command response processing
   */
  async start() {
    if (this.isActive) {
      console.warn('CommandResponseIntegrationService: Already active');
      return;
    }

    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      this.emit('starting', {});
      
      this.isActive = true;
      
      this.emit('started', { 
        session_id: this.sessionManager.getCurrentSession()?.id,
        config: this.config
      });
      
      console.log('CommandResponseIntegrationService: Started command response flow');
      
    } catch (error) {
      console.error('CommandResponseIntegrationService: Failed to start:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop command response processing
   */
  async stop() {
    if (!this.isActive) return;

    try {
      this.emit('stopping', {});
      
      // Clear any pending commands
      if (this.commandHandler) {
        this.commandHandler.clearQueue();
      }
      
      this.isActive = false;
      
      this.emit('stopped', {});
      console.log('CommandResponseIntegrationService: Stopped command response flow');
      
    } catch (error) {
      console.error('CommandResponseIntegrationService: Failed to stop:', error);
      this.emit('error', error);
    }
  }

  /**
   * Setup WebSocket client to receive commands from cloud
   */
  setupWebSocketHandlers() {
    // Handle incoming commands from cloud
    this.websocketClient.on('command:received', (command) => {
      this.handleIncomingCommand(command);
    });

    // Handle command acknowledgments
    this.websocketClient.on('acknowledgment:received', (data) => {
      this.emit('command_acknowledged', data);
    });
  }

  /**
   * Handle incoming command from cloud
   * @param {Object} command - Command from cloud per canonical contract
   */
  async handleIncomingCommand(command) {
    try {
      console.log(`CommandResponseIntegrationService: Received command: ${command.type}`);
      
      // Validate command is for current session
      const currentSession = this.sessionManager.getCurrentSession();
      if (!currentSession || currentSession.id !== command.session_id) {
        console.warn(`Command session mismatch: ${command.session_id} vs ${currentSession?.id}`);
        return;
      }

      // Check capabilities
      if (!this.isCommandSupported(command.type)) {
        console.warn(`Command type not supported: ${command.type}`);
        this.emit('command_rejected', {
          command_id: command.command_id,
          reason: 'Command type not supported'
        });
        return;
      }

      // Route command to handler
      if (this.commandHandler) {
        await this.commandHandler.handleCommand(command);
      }

    } catch (error) {
      console.error('CommandResponseIntegrationService: Failed to handle command:', error);
      this.emit('command_error', {
        command_id: command.command_id,
        error: error.message
      });
    }
  }

  /**
   * Setup command handler event forwarding
   */
  setupCommandHandlers() {
    if (!this.commandHandler) return;

    // Forward all command handler events with additional context
    this.commandHandler.on('command_started', (data) => {
      this.emit('command_started', {
        ...data,
        service: 'command_response_integration'
      });
    });

    this.commandHandler.on('command_completed', (data) => {
      this.emit('command_completed', {
        ...data,
        service: 'command_response_integration'
      });
    });

    this.commandHandler.on('command_failed', (data) => {
      this.emit('command_failed', {
        ...data,
        service: 'command_response_integration'
      });
    });

    this.commandHandler.on('command_queued', (data) => {
      this.emit('command_queued', {
        ...data,
        service: 'command_response_integration'
      });
    });

    this.commandHandler.on('command_error', (data) => {
      this.emit('command_error', {
        ...data,
        service: 'command_response_integration'
      });
    });

    this.commandHandler.on('queue_cleared', () => {
      this.emit('queue_cleared', {
        service: 'command_response_integration'
      });
    });

    this.commandHandler.on('config_updated', (data) => {
      this.emit('config_updated', {
        ...data,
        service: 'command_response_integration'
      });
    });
  }

  /**
   * Check if command type is supported
   * @param {string} commandType - Command type
   * @returns {boolean} Whether supported
   */
  isCommandSupported(commandType) {
    const supportedCommands = [];
    
    if (this.config.enable_tts) supportedCommands.push('say');
    if (this.config.enable_ui_steps) supportedCommands.push('ui_steps');
    if (this.config.enable_mode_changes) supportedCommands.push('mode');
    supportedCommands.push('stop'); // Always support stop

    return supportedCommands.includes(commandType);
  }

  /**
   * Get service capabilities
   * @returns {Object} Available capabilities
   */
  getCapabilities() {
    return {
      command_execution: true,
      tts_response: this.config.enable_tts,
      ui_step_execution: this.config.enable_ui_steps,
      mode_changes: this.config.enable_mode_changes,
      command_validation: this.config.validate_commands,
      auto_execution: this.config.auto_execute_commands,
      command_queuing: true,
      error_handling: this.config.auto_retry_errors,
      retry_logic: this.config.max_retry_attempts > 0,
      session_validation: true
    };
  }

  /**
   * Get current status
   * @returns {Object} Current status
   */
  getStatus() {
    if (!this.commandHandler) {
      return {
        initialized: this.isInitialized,
        active: this.isActive,
        capabilities: this.getCapabilities(),
        components: {
          handler: null
        }
      };
    }

    const handlerStatus = this.commandHandler.getStatus();
    
    return {
      initialized: this.isInitialized,
      active: this.isActive,
      config: this.config,
      capabilities: this.getCapabilities(),
      components: {
        handler: handlerStatus,
        websocket: {
          connected: this.websocketClient.isConnected()
        },
        session: {
          current: this.sessionManager.getCurrentSession()?.id || null,
          state: this.sessionManager.getCurrentSession()?.state || 'none'
        }
      }
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  async updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    try {
      // Update command handler config
      if (this.commandHandler) {
        await this.commandHandler.updateConfig({
          auto_execute: this.config.auto_execute_commands,
          validate_commands: this.config.validate_commands
        });
      }

      this.emit('config_updated', { oldConfig, newConfig: this.config });
      
    } catch (error) {
      // Revert config on error
      this.config = oldConfig;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute command manually (for testing)
   * @param {Object} command - Command to execute
   */
  async executeCommand(command) {
    if (!this.commandHandler) {
      throw new Error('Command handler not initialized');
    }

    return await this.commandHandler.executeCommand(command);
  }

  /**
   * Get command queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    if (!this.commandHandler) {
      return { length: 0, processing: false, commands: [] };
    }

    return this.commandHandler.getQueueStatus();
  }

  /**
   * Clear command queue
   */
  clearQueue() {
    if (this.commandHandler) {
      this.commandHandler.clearQueue();
    }
  }

  /**
   * Test the complete command response pipeline
   * @returns {Promise<Object>} Test results
   */
  async testPipeline() {
    const testResults = {
      timestamp: new Date().toISOString(),
      components: {},
      overall: false
    };

    try {
      // Test WebSocket connection
      testResults.components.websocket = this.websocketClient.isConnected();
      
      // Test session
      testResults.components.session = !!this.sessionManager.getCurrentSession();
      
      // Test command handler
      if (this.commandHandler) {
        testResults.components.handler = {
          initialized: this.commandHandler.isInitialized,
          execution_service: this.commandHandler.commandExecutionService ? true : false
        };
      }
      
      // Test capabilities
      testResults.components.capabilities = this.getCapabilities();
      
      // Overall test result
      testResults.overall = Object.values(testResults.components).every(
        value => typeof value === 'boolean' ? value : value !== null && value !== undefined
      );
      
    } catch (error) {
      testResults.error = error.message;
    }

    return testResults;
  }

  /**
   * Get diagnostic information
   * @returns {Object} Diagnostic data
   */
  getDiagnostics() {
    return {
      timestamp: new Date().toISOString(),
      service: 'CommandResponseIntegrationService',
      version: '1.0.0',
      config: this.config,
      status: this.getStatus(),
      capabilities: this.getCapabilities(),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        languages: navigator.languages,
        webSocket: 'WebSocket' in window
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await this.stop();
      
      if (this.commandHandler) {
        await this.commandHandler.cleanup();
        this.commandHandler = null;
      }
      
      this.removeAllListeners();
      
      console.log('CommandResponseIntegrationService: Cleaned up');
      
    } catch (error) {
      console.error('CommandResponseIntegrationService: Error during cleanup:', error);
    }
  }
}

// Export factory function for easy instantiation
export function createCommandResponseIntegrationService(websocketClient, sessionManager, config = {}) {
  return new CommandResponseIntegrationService(websocketClient, sessionManager, config);
}