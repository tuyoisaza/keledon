/**
 * Command Handler Service - Processes commands from cloud
 * Routes commands to appropriate execution services
 */

import { CommandExecutionService } from './command-execution.service.js';
import { EventEmitter } from '../core/event-router.js';

export class CommandHandlerService extends EventEmitter {
  constructor(sessionManager, config = {}) {
    super();
    this.sessionManager = sessionManager;
    this.config = {
      auto_execute: true,
      validate_commands: true,
      ...config
    };
    
    this.commandExecutionService = null;
    this.isInitialized = false;
    this.commandQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize command handler
   */
  async initialize() {
    try {
      // Create command execution service
      this.commandExecutionService = new CommandExecutionService();
      await this.commandExecutionService.initialize();
      
      this.isInitialized = true;
      
      this.emit('initialized', {});
      console.log('CommandHandlerService: Initialized');
      
    } catch (error) {
      console.error('CommandHandlerService: Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Handle incoming command from cloud
   * @param {Object} command - Command from cloud per canonical contract
   */
  async handleCommand(command) {
    try {
      console.log(`CommandHandlerService: Received command: ${command.type}`);
      
      // Validate command structure
      if (this.config.validate_commands && !this.validateCommand(command)) {
        throw new Error(`Invalid command structure: ${JSON.stringify(command)}`);
      }

      // Check if command is for current session
      const currentSession = this.sessionManager.getCurrentSession();
      if (!currentSession || currentSession.id !== command.session_id) {
        console.warn(`Command session mismatch: ${command.session_id} vs ${currentSession?.id}`);
        return;
      }

      // Queue command or execute immediately
      if (this.config.auto_execute) {
        await this.executeCommand(command);
      } else {
        this.commandQueue.push(command);
        this.emit('command_queued', { command_id: command.command_id });
      }

    } catch (error) {
      console.error('CommandHandlerService: Failed to handle command:', error);
      this.emit('error', error);
      
      // Send error result back to cloud
      await this.sendCommandError(command, error);
    }
  }

  /**
   * Execute command
   * @param {Object} command - Command to execute
   */
  async executeCommand(command) {
    if (!this.commandExecutionService) {
      throw new Error('Command execution service not initialized');
    }

    try {
      this.isProcessing = true;
      
      this.emit('command_started', {
        command_id: command.command_id,
        type: command.type,
        session_id: command.session_id
      });

      // Execute command based on type
      await this.commandExecutionService.executeCommand(command);

      this.emit('command_completed', {
        command_id: command.command_id,
        type: command.type,
        session_id: command.session_id,
        success: true
      });

      console.log(`CommandHandlerService: Command ${command.command_id} completed successfully`);

    } catch (error) {
      console.error(`CommandHandlerService: Command ${command.command_id} failed:`, error);
      
      this.emit('command_failed', {
        command_id: command.command_id,
        type: command.type,
        session_id: command.session_id,
        error: error.message
      });

      // Send error result back to cloud
      await this.sendCommandError(command, error);
      
    } finally {
      this.isProcessing = false;
      
      // Process next command in queue
      if (this.commandQueue.length > 0) {
        const nextCommand = this.commandQueue.shift();
        await this.executeCommand(nextCommand);
      }
    }
  }

  /**
   * Validate command structure against canonical contract
   * @param {Object} command - Command to validate
   * @returns {boolean} Whether command is valid
   */
  validateCommand(command) {
    return !!(
      command.command_id &&
      command.session_id &&
      command.timestamp &&
      ['say', 'ui_steps', 'mode', 'stop'].includes(command.type) &&
      command.payload
    );
  }

  /**
   * Send command error result back to cloud
   * @param {Object} command - Failed command
   * @param {Error} error - Error details
   */
  async sendCommandError(command, error) {
    try {
      // This would be handled by the WebSocket client
      // For now, just emit the error event
      this.emit('command_error', {
        command_id: command.command_id,
        session_id: command.session_id,
        type: command.type,
        error: error.message,
        timestamp: new Date().toISOString()
      });

    } catch (sendError) {
      console.error('CommandHandlerService: Failed to send error:', sendError);
    }
  }

  /**
   * Process queued commands
   */
  async processQueue() {
    if (this.isProcessing || this.commandQueue.length === 0) {
      return;
    }

    const command = this.commandQueue.shift();
    await this.executeCommand(command);
  }

  /**
   * Get command queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      length: this.commandQueue.length,
      processing: this.isProcessing,
      commands: this.commandQueue.map(cmd => ({
        command_id: cmd.command_id,
        type: cmd.type,
        session_id: cmd.session_id
      }))
    };
  }

  /**
   * Clear command queue
   */
  clearQueue() {
    this.commandQueue = [];
    this.emit('queue_cleared', {});
  }

  /**
   * Get execution status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      processing: this.isProcessing,
      queue_status: this.getQueueStatus(),
      execution_service: this.commandExecutionService ? 
        this.commandExecutionService.getStatus() : null,
      capabilities: [
        'say',
        'ui_steps',
        'mode',
        'stop'
      ]
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', { config: this.config });
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Clear queue
      this.clearQueue();
      
      // Cleanup command execution service
      if (this.commandExecutionService) {
        await this.commandExecutionService.cleanup();
        this.commandExecutionService = null;
      }
      
      this.isInitialized = false;
      this.removeAllListeners();
      
      console.log('CommandHandlerService: Cleaned up');
      
    } catch (error) {
      console.error('CommandHandlerService: Error during cleanup:', error);
    }
  }
}