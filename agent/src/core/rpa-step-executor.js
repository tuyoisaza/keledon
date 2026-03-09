/**
 * RPA StepExecutor - Deterministic DOM Automation Engine
 * Processes ui_steps from Cloud with post-condition validation
 */

export class RPAStepExecutor {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.currentStep = null;
    this.executionStack = [];
    this.isExecuting = false;
    this.adapters = new Map();
    this.status = 'ready'; // ready | executing | error | paused
    this.config = {
      timeoutMs: 10000,
      retryAttempts: 3,
      ...this.getEnvironmentConfig()
    };
    
    // State tracking for Side Panel
    this.stats = {
      stepsCompleted: 0,
      stepsFailed: 0,
      totalExecutionTime: 0,
      lastStepTime: null
    };
  }

  /**
   * Get configuration from environment (anti-demo)
   */
  getEnvironmentConfig() {
    return {
      timeoutMs: parseInt(process.env?.RPA_TIMEOUT_MS) || 10000,
      retryAttempts: parseInt(process.env?.RPA_RETRY_ATTEMPTS) || 3
    };
  }

  /**
   * Initialize RPA StepExecutor
   */
  async initialize() {
    try {
      // Load page-specific adapters
      await this.loadAdapters();
      
      // Set up DOM monitoring
      this.setupDOMObserver();
      
      this.status = 'ready';
      this.emit('rpa:initialized', { 
        adaptersCount: this.adapters.size,
        config: this.config 
      });

    } catch (error) {
      this.status = 'error';
      this.emit('rpa:error', error);
      throw error;
    }
  }

  /**
   * Load page-specific RPA adapters
   */
  async loadAdapters() {
     try {
       // Import UI automation service for real DOM operations
       const { uiAutomationService } = await import('../services/ui-automation.service');
       
       // Initialize UI automation service
       await uiAutomationService.initialize();
       
       // Store as 'web' adapter for default DOM operations
       this.adapters.set('web', {
         executeStep: (step, context) => uiAutomationService.executeStep(step, context)
       });
       
       console.log(`RPA: Initialized UI automation service`);
     } catch (error) {
       console.error('Failed to initialize RPA adapters:', error);
       throw error;
     }
   }
 }

  /**
   * Process ui_steps from Cloud command
   */
  async executeSteps(steps, options = {}) {
    if (this.isExecuting) {
      throw new Error('RPA execution already in progress');
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('No steps provided for execution');
    }

    const session = this.sessionManager.getCurrentSession();
    if (!session) {
      throw new Error('No active session for RPA execution');
    }

    try {
      this.isExecuting = true;
      this.status = 'executing';
      this.executionStack = [];
      
      const executionId = crypto.randomUUID();
      const startTime = Date.now();
      
      this.emit('rpa:execution_started', {
        executionId,
        stepsCount: steps.length,
        session_id: session.id
      });

      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        try {
          // Execute individual step
          const result = await this.executeStep(step, {
            executionId,
            stepIndex: i,
            totalSteps: steps.length,
            session_id: session.id
          });
          
          this.executionStack.push({
            step,
            result,
            timestamp: new Date().toISOString()
          });
          
          this.emit('rpa:step_completed', {
            step,
            result,
            stepIndex: i,
            executionId
          });
          
        } catch (error) {
          // Step execution failed
          const errorResult = {
            success: false,
            error: error.message,
            step,
            stepIndex: i,
            executionId,
            timestamp: new Date().toISOString()
          };
          
          this.executionStack.push(errorResult);
          
          this.emit('rpa:step_failed', {
            step,
            error: error.message,
            stepIndex: i,
            executionId
          });
          
          // Decide whether to continue or stop
          const shouldStop = this.shouldStopOnError(error, step, i);
          
          if (shouldStop) {
            throw new Error(`RPA execution stopped at step ${i + 1}: ${error.message}`);
          }
        }
      }
      
      // Calculate execution statistics
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      this.stats.stepsCompleted += steps.length;
      this.stats.totalExecutionTime += executionTime;
      this.stats.lastStepTime = new Date().toISOString();
      
      this.isExecuting = false;
      this.status = 'ready';
      
      // Send ui_result event to Cloud
      await this.sendUIResultEvent(executionId, this.executionStack);
      
      this.emit('rpa:execution_completed', {
        executionId,
        stepsCount: steps.length,
        executionTime,
        results: this.executionStack,
        session_id: session.id
      });
      
      return {
        success: true,
        executionId,
        stepsCount: steps.length,
        executionTime,
        results: this.executionStack
      };
      
    } catch (error) {
      this.isExecuting = false;
      this.status = 'error';
      this.stats.stepsFailed++;
      
      this.emit('rpa:execution_failed', {
        error: error.message,
        executionId: options.executionId,
        session_id: session.id
      });
      
      throw error;
    }
  }

  /**
   * Execute individual step with adapter routing
   */
  async executeStep(step, context = {}) {
    if (!step || !step.step_id) {
      throw new Error('Invalid step: missing step_id');
    }

    // Select adapter based on page or step context
    const adapter = this.selectAdapter(step, context);
    
    if (!adapter) {
      throw new Error(`No adapter available for step: ${step.step_id}`);
    }

    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step timeout: ${step.step_id} after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);
    });

    // Execute step with timeout
    const stepPromise = adapter.executeStep(step, context);
    
    return Promise.race([stepPromise, timeoutPromise]);
  }

  /**
   * Select appropriate adapter for step execution
   */
  selectAdapter(step, context) {
    // Check if step specifies adapter
    if (step.adapter && this.adapters.has(step.adapter)) {
      return this.adapters.get(step.adapter);
    }
    
    // Auto-select based on current page
    const currentDomain = this.getCurrentDomain();
    
    switch (currentDomain) {
      case 'salesforce.com':
      case 'force.com':
        return this.adapters.get('salesforce');
        
      default:
        return this.adapters.get('web');
    }
  }

  /**
   * Get current page domain for adapter selection
   */
  getCurrentDomain() {
    try {
      const url = new URL(window.location.href);
      return url.hostname.toLowerCase();
    } catch (error) {
      console.warn('Failed to get current domain:', error);
      return 'unknown';
    }
  }

  /**
   * Send ui_result event to Cloud
   */
  async sendUIResultEvent(executionId, results) {
    try {
      const session = this.sessionManager.getCurrentSession();
      if (!session) {
        throw new Error('No active session for ui_result event');
      }

      const uiResultEvent = {
        session_id: session.id,
        event_type: 'ui_result',
        payload: {
          execution_id: executionId,
          results: results,
          summary: {
            total_steps: results.length,
            successful_steps: results.filter(r => r.success).length,
            failed_steps: results.filter(r => !r.success).length,
            execution_time: Date.now() - new Date(results[0]?.timestamp).getTime()
          },
          metadata: {
            agent_id: this.getAgentId(),
            timestamp: new Date().toISOString(),
            page_domain: this.getCurrentDomain()
          }
        },
        ts: new Date().toISOString(),
        agent_id: this.getAgentId()
      };

      // Add event to session
      this.sessionManager.addSessionEvent(session.id, uiResultEvent);
      
      this.emit('rpa:ui_result_sent', {
        executionId,
        resultsCount: results.length
      });
      
    } catch (error) {
      this.emit('rpa:error', error);
      throw error;
    }
  }

  /**
   * Decide whether to stop execution on error
   */
  shouldStopOnError(error, step, stepIndex) {
    // Critical errors that should stop execution
    const criticalErrors = [
      'Element not found',
      'Timeout waiting for element',
      'Page navigation failed',
      'Permission denied'
    ];
    
    const isCriticalError = criticalErrors.some(criticalError => 
      error.message.includes(criticalError)
    );
    
    // For non-critical errors, check retry count
    if (!isCriticalError && stepIndex < this.config.retryAttempts) {
      return false; // Continue with next step
    }
    
    return true; // Stop execution
  }

  /**
   * Get RPA status for Side Panel
   */
  getStatus() {
    return {
      status: this.status,
      isExecuting: this.isExecuting,
      currentStep: this.currentStep,
      adaptersLoaded: Array.from(this.adapters.keys()),
      config: this.config,
      stats: { ...this.stats },
      currentDomain: this.getCurrentDomain(),
      executionStackLength: this.executionStack.length
    };
  }

  /**
   * Get agent ID
   */
  getAgentId() {
    // Use session agent_id or generate stable ID
    const session = this.sessionManager.getCurrentSession();
    return session?.agent_id || 'Agent-RPA-' + crypto.randomUUID().slice(0, 8);
  }

  /**
   * Set up DOM observer for page changes
   */
  setupDOMObserver() {
    // Observe DOM changes that might affect RPA execution
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          this.emit('rpa:dom_changed', {
            type: 'nodes_added_removed',
            mutations: mutation.addedNodes.length + mutation.removedNodes.length
          });
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.emit('rpa:observer_setup');
  }

  /**
   * Pause current execution
   */
  pauseExecution() {
    if (!this.isExecuting) {
      return { success: false, error: 'No active execution' };
    }

    this.status = 'paused';
    this.emit('rpa:execution_paused', {
      currentStep: this.currentStep,
      executionStackLength: this.executionStack.length
    });
    
    return { success: true };
  }

  /**
   * Resume paused execution
   */
  resumeExecution() {
    if (this.status !== 'paused') {
      return { success: false, error: 'Execution not paused' };
    }

    this.status = 'executing';
    this.emit('rpa:execution_resumed', {
      currentStep: this.currentStep,
      executionStackLength: this.executionStack.length
    });
    
    return { success: true };
  }

  /**
   * Test RPA functionality
   */
  async test(step = { step_id: 'test_click', action: 'click', selector: '#test-button' }) {
    try {
      const result = await this.executeSteps([step]);
      
      this.emit('rpa:test_complete', { result });
      return result.success;
      
    } catch (error) {
      this.emit('rpa:test_failed', { error: error.message });
      return false;
    }
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = new Map();
    }
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (!this.eventHandlers || !this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in RPA executor event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Stop any active execution
    if (this.isExecuting) {
      // Note: In production, might want graceful shutdown
      this.isExecuting = false;
    }

    // Cleanup adapters
    for (const [name, adapter] of this.adapters) {
      try {
        if (adapter.cleanup) {
          await adapter.cleanup();
        }
      } catch (error) {
        console.error(`Failed to cleanup adapter ${name}:`, error);
      }
    }
    
    this.adapters.clear();
    this.status = 'ready';
    this.executionStack = [];

    if (this.eventHandlers) {
      this.eventHandlers.clear();
    }
  }
}