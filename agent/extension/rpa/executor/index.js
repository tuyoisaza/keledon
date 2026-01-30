/**
 * RPA Executor - Deterministic Browser Automation
 * Executes flows step-by-step with post-condition validation
 */

export class RPAExecutor {
  constructor(config = {}) {
    this.config = {
      defaultTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      screenshotOnFailure: true,
      strictMode: true,
      ...config
    };
    this.currentFlow = null;
    this.currentStep = null;
    this.isExecuting = false;
    this.eventHandlers = new Map();
    this.executionContext = {};
    this.resultHistory = [];
  }

  /**
   * Execute a flow deterministically
   * @param {Object} flow - Flow definition with steps
   * @param {Object} context - Execution context variables
   */
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
  async performStepAction(step) {
    const action = step.action;
    const selector = this.resolveSelectors(step);

    switch (action) {
      case 'click':
        return await this.performClick(selector, step);
      case 'fill':
        return await this.performFill(selector, step);
      case 'read':
        return await this.performRead(selector, step);
      case 'wait_for':
        return await this.performWaitFor(selector, step);
      case 'navigate':
        return await this.performNavigate(step);
      case 'select':
        return await this.performSelect(selector, step);
      case 'assert':
        return await this.performAssert(selector, step);
      case 'hover':
        return await this.performHover(selector, step);
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }

  /**
   * Resolve selectors with template variables
   * @param {Object} step - Step definition
   */
  resolveSelectors(step) {
    let selector = step.selector;
    
    // Replace template variables with context values
    for (const [key, value] of Object.entries(this.executionContext)) {
      const templateVar = `{{${key}}}`;
      if (typeof selector === 'string' && selector.includes(templateVar)) {
        selector = selector.replace(new RegExp(templateVar, 'g'), value);
      }
    }

    return selector;
  }

  /**
   * Perform click action
   */
  async performClick(selector, step) {
    const timeout = step.timeout_ms || this.config.defaultTimeout;
    
    const element = await this.waitForElement(selector, timeout);
    
    // Check if element is clickable
    if (!this.isElementClickable(element)) {
      throw new Error(`Element is not clickable: ${selector}`);
    }

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.delay(200);

    // Perform click
    element.click();
    
    return {
      status: 'success',
      data: {
        action: 'click',
        selector,
        tagName: element.tagName,
        text: element.textContent?.substring(0, 100)
      }
    };
  }

  /**
   * Perform fill action
   */
  async performFill(selector, step) {
    const timeout = step.timeout_ms || this.config.defaultTimeout;
    const value = this.resolveTemplateVariables(step.value);
    
    const element = await this.waitForElement(selector, timeout);
    
    // Clear field first
    element.value = '';
    element.focus();
    await this.delay(100);

    // Type the value
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = value;
    } else {
      // For contenteditable or other elements
      element.innerText = value;
    }

    // Trigger change event
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      status: 'success',
      data: {
        action: 'fill',
        selector,
        value,
        tagName: element.tagName
      }
    };
  }

  /**
   * Perform read action
   */
  async performRead(selector, step) {
    const timeout = step.timeout_ms || this.config.defaultTimeout;
    const attribute = step.attribute;
    
    const element = await this.waitForElement(selector, timeout);
    
    let result;
    if (attribute) {
      result = element.getAttribute(attribute);
    } else {
      result = element.textContent?.trim() || element.innerText?.trim() || '';
    }

    return {
      status: 'success',
      data: {
        action: 'read',
        selector,
        attribute,
        value: result,
        tagName: element.tagName
      }
    };
  }

  /**
   * Perform wait_for action
   */
  async performWaitFor(step) {
    const timeout = step.timeout_ms || this.config.defaultTimeout;
    
    try {
      const element = await this.waitForElement(step.selector, timeout);
      
      return {
        status: 'success',
        data: {
          action: 'wait_for',
          selector: step.selector,
          found: true,
          tagName: element.tagName
        }
      };
    } catch (error) {
      if (error.message.includes('timeout')) {
        return {
          status: 'timeout',
          error: {
            code: 'wait_timeout',
            message: `Element not found within ${timeout}ms: ${step.selector}`
          }
        };
      }
      throw error;
    }
  }

  /**
   * Perform navigate action
   */
  async performNavigate(step) {
    const url = this.resolveTemplateVariables(step.url);
    
    if (!this.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const timeout = step.timeout_ms || this.config.defaultTimeout;
      
      // Set up page load timeout
      const timeoutId = setTimeout(() => {
        resolve({
          status: 'timeout',
          error: {
            code: 'navigation_timeout',
            message: `Page load timeout: ${url}`
          }
        });
      }, timeout);

      // Listen for page load
      const handleLoad = () => {
        clearTimeout(timeoutId);
        window.removeEventListener('load', handleLoad);
        
        const duration = Date.now() - startTime;
        
        resolve({
          status: 'success',
          data: {
            action: 'navigate',
            url,
            duration_ms: duration,
            finalUrl: window.location.href
          }
        });
      };

      window.addEventListener('load', handleLoad);
      
      // Navigate to the URL
      window.location.href = url;
    });
  }

  /**
   * Perform select action
   */
  async performSelect(selector, step) {
    const timeout = step.timeout_ms || this.config.defaultTimeout;
    const option = this.resolveTemplateVariables(step.option);
    
    const element = await this.waitForElement(selector, timeout);
    
    if (element.tagName !== 'SELECT') {
      throw new Error(`Element is not a select dropdown: ${selector}`);
    }

    // Find and select the option
    const optionElement = Array.from(element.options).find(opt => 
      opt.value === option || opt.textContent?.trim() === option
    );

    if (!optionElement) {
      throw new Error(`Option not found: ${option}`);
    }

    element.value = optionElement.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      status: 'success',
      data: {
        action: 'select',
        selector,
        option,
        tagName: element.tagName
      }
    };
  }

  /**
   * Perform assert action
   */
  async performAssert(selector, step) {
    const timeout = step.timeout_ms || this.config.defaultTimeout;
    const expectedText = this.resolveTemplateVariables(step.text);
    
    const element = await this.waitForElement(selector, timeout);
    const actualText = element.textContent?.trim() || element.innerText?.trim() || '';
    
    if (actualText === expectedText) {
      return {
        status: 'success',
        data: {
          action: 'assert',
          selector,
          expectedText,
          actualText,
          passed: true
        }
      };
    } else {
      throw new Error(`Assertion failed. Expected: "${expectedText}", Actual: "${actualText}"`);
    }
  }

  /**
   * Perform hover action
   */
  async performHover(selector, step) {
    const timeout = step.timeout_ms || this.config.defaultTimeout;
    
    const element = await this.waitForElement(selector, timeout);
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.delay(200);

    // Create and dispatch hover events
    const mouseEnterEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true
    });
    
    const mouseOverEvent = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(mouseEnterEvent);
    element.dispatchEvent(mouseOverEvent);

    return {
      status: 'success',
      data: {
        action: 'hover',
        selector,
        tagName: element.tagName
      }
    };
  }

  /**
   * Wait for element to appear
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForElement(selector, timeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          return element;
        }
      } catch (error) {
        // Continue trying on DOM errors
      }
      
      await this.delay(100);
    }

    throw new Error(`Element not found within ${timeout}ms: ${selector}`);
  }

  /**
   * Check if element is visible
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           rect.width > 0 && 
           rect.height > 0;
  }

  /**
   * Check if element is clickable
   */
  isElementClickable(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.pointerEvents !== 'none' && 
           !element.disabled && 
           rect.width > 0 && 
           rect.height > 0;
  }

  /**
   * Validate pre-conditions before step execution
   */
  async validatePreConditions(step) {
    if (!step.condition) return;

    const { element_exists, element_visible, element_enabled } = step.condition;

    try {
      const element = document.querySelector(step.selector);
      
      if (element_exists !== undefined) {
        const exists = !!element;
        if (element_exists !== exists) {
          throw new Error(`Pre-condition failed: element exists=${exists}, actual=${exists}`);
        }
      }

      if (element_visible !== undefined) {
        const visible = element ? this.isElementVisible(element) : false;
        if (element_visible !== visible) {
          throw new Error(`Pre-condition failed: element visible=${element_visible}, actual=${visible}`);
        }
      }

      if (element_enabled !== undefined) {
        const enabled = element ? !element.disabled : false;
        if (element_enabled !== enabled) {
          throw new Error(`Pre-condition failed: element enabled=${element_enabled}, actual=${enabled}`);
        }
      }

    } catch (error) {
      throw new Error(`Pre-condition validation error: ${error.message}`);
    }
  }

  /**
   * Validate post-conditions after step execution
   */
  async validatePostConditions(step, result) {
    if (!step.post_condition || result.status !== 'success') return;

    const { element_exists, element_visible, text_contains } = step.post_condition;

    try {
      const element = document.querySelector(step.selector);
      
      if (element_exists !== undefined) {
        const exists = !!element;
        if (element_exists !== exists) {
          throw new Error(`Post-condition failed: element exists=${element_exists}, actual=${exists}`);
        }
      }

      if (element_visible !== undefined) {
        const visible = element ? this.isElementVisible(element) : false;
        if (element_visible !== visible) {
          throw new Error(`Post-condition failed: element visible=${element_visible}, actual=${visible}`);
        }
      }

      if (text_contains !== undefined) {
        const text = element ? (element.textContent || '').trim() : '';
        const contains = text.includes(text_contains);
        if (!contains) {
          throw new Error(`Post-condition failed: text contains=${text_contains}, actual="${text}"`);
        }
      }

    } catch (error) {
      if (this.config.strictMode) {
        throw new Error(`Post-condition validation error: ${error.message}`);
      } else {
        console.warn(`Post-condition validation warning: ${error.message}`);
      }
    }
  }

  /**
   * Resolve template variables with context
   */
  resolveTemplateVariables(text) {
    if (typeof text !== 'string') return text;

    let resolved = text;
    
    for (const [key, value] of Object.entries(this.executionContext)) {
      const templateVar = `{{${key}}}`;
      resolved = resolved.replace(new RegExp(templateVar, 'g'), String(value));
    }

    return resolved;
  }

  /**
   * Check if execution should stop
   */
  shouldStopExecution() {
    // Check for stop conditions (can be extended)
    return false; // Default: don't stop
  }

  /**
   * Determine final execution status
   */
  determineFinalStatus(results) {
    const failedStep = results.find(r => r.status === 'failure' || r.status === 'timeout');
    const hasError = results.some(r => r.status === 'error');
    
    if (hasError) {
      return 'error';
    } else if (failedStep) {
      return 'failed';
    } else {
      return 'success';
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot() {
    try {
      // Create offscreen canvas for screenshot
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get viewport dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the current page
      ctx.drawImage(window.document.body, 0, 0, width, height);
      
      // Convert to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.warn('Failed to take screenshot:', error);
      return null;
    }
  }

  /**
   * Validate URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
    } catch {
      return false;
    }
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in RPA executor event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Get execution status
   */
  getExecutionStatus() {
    return {
      isExecuting: this.isExecuting,
      currentFlow: this.currentFlow,
      currentStep: this.currentStep,
      context: this.executionContext,
      resultHistory: [...this.resultHistory]
    };
  }

  /**
   * Stop current execution
   */
  stopExecution(reason = 'manual_stop') {
    if (!this.isExecuting) return;

    this.emit('execution:stopping', { reason });
    
    // The actual stop will happen in the execution loop
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isExecuting = false;
    this.currentFlow = null;
    this.currentStep = null;
    this.executionContext = {};
    // Don't clear resultHistory - it's useful for debugging
  }
}