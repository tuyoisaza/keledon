export class FlowExecutionMethods {
  async executeFlow(flow, context = {}) {
    if (this.isExecuting) {
      throw new Error('RPA Executor is already executing a flow');
    }

    if (!flow || !flow.steps || !Array.isArray(flow.steps)) {
      throw new Error('Invalid flow: must have steps array');
    }

    this.currentFlow = { ...flow };
    this.executionContext = { ...context };
    this.isExecuting = true;

    this.emit('execution:started', {
      flowId: flow.id,
      stepCount: flow.steps.length,
      context: this.executionContext
    });

    try {
      const results = [];
      
      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];
        this.currentStep = step;

        // Check if we should continue
        if (this.shouldStopExecution()) {
          this.emit('execution:stopped', {
            flowId: flow.id,
            stepIndex: i,
            stepId: step.id,
            reason: 'manual_stop'
          });
          break;
        }

        const result = await this.executeStep(step, i);
        results.push(result);

        // Check for step failure
        if (result.status === 'failure' || result.status === 'timeout') {
          this.emit('execution:failed', {
            flowId: flow.id,
            stepIndex: i,
            stepId: step.id,
            step,
            result,
            totalSteps: i + 1
          });
          break;
        }

        // Update context with step results
        if (result.result) {
          this.executionContext = {
            ...this.executionContext,
            [`step_${step.id}_result`]: result.result,
            [`step_${step.id}_duration`]: result.duration_ms
          };
        }

        this.emit('step:completed', {
          flowId: flow.id,
          stepIndex: i,
          stepId: step.id,
          step,
          result
        });

        // Brief delay between steps (configurable)
        if (i < flow.steps.length - 1) {
          await this.delay(100);
        }
      }

      const finalResult = {
        flowId: flow.id,
        status: this.determineFinalStatus(results),
        steps: results,
        duration_ms: Date.now() - this.executionContext.startTime,
        context: this.executionContext
      };

      this.emit('execution:completed', finalResult);
      this.resultHistory.push(finalResult);

      return finalResult;

    } catch (error) {
      const errorResult = {
        flowId: flow.id,
        status: 'error',
        error: {
          code: 'execution_error',
          message: error.message,
          stack: error.stack
        },
        steps: this.resultHistory.map(r => r.steps).flat(),
        context: this.executionContext
      };

      this.emit('execution:error', errorResult);
      this.resultHistory.push(errorResult);

      throw errorResult;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Execute a single step with all error handling and retry logic
   * @param {Object} step - Step definition
   * @param {number} stepIndex - Index of step in flow
   */
  async executeStep(step, stepIndex) {
    const stepId = step.id;
    const startTime = Date.now();

    this.emit('step:started', {
      flowId: this.currentFlow.id,
      stepIndex,
      stepId,
      step
    });

    try {
      // Pre-execution validation
      await this.validatePreConditions(step);

      // Execute the step with retry logic
      const result = await this.executeStepWithRetry(step);

      // Post-execution validation
      await this.validatePostConditions(step, result);

      const duration = Date.now() - startTime;

      return {
        stepId,
        status: result.status,
        duration_ms: duration,
        result: result.data,
        error: result.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Take screenshot on failure if enabled
      if (this.config.screenshotOnFailure) {
        const screenshot = await this.takeScreenshot();
        error.screenshot = screenshot;
      }

      return {
        stepId,
        status: 'failure',
        duration_ms: duration,
        error: {
          code: 'step_execution_failed',
          message: error.message,
          step: step,
          index: stepIndex
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute step with retry logic
   * @param {Object} step - Step definition
   */
  async executeStepWithRetry(step) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.performStepAction(step);
        
        if (result.status === 'success') {
          return result;
        } else {
          lastError = result.error;
          
          if (attempt < this.config.retryAttempts) {
            this.emit('step:retry', {
              stepId: step.id,
              attempt,
              error: result.error,
              delay: this.config.retryDelay
            });
            
            await this.delay(this.config.retryDelay);
          }
        }
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts) {
          this.emit('step:retry', {
            stepId: step.id,
            attempt,
            error,
            delay: this.config.retryDelay
          });
          
          await this.delay(this.config.retryDelay);
        }
      }
    }

    return {
      status: 'failure',
      error: lastError || new Error('Max retry attempts exceeded')
    };
  }

  /**
   * Perform the actual step action
   * @param {Object} step - Step definition
   */

}
