/**
 * Error Handler
 * 
 * Provides comprehensive error handling for RPA execution
 * including error classification, context collection, and recovery suggestions.
 */

import { RPAStep } from '../../../contracts/v1';

export interface ErrorContext {
  type: string;
  phase: string;
  message: string;
  details: any;
  recovery_suggestions: string[];
  timestamp: number;
}

export interface ErrorRecovery {
  action: () => Promise<boolean>;
  description: string;
  success_criteria: string;
}

export class ErrorHandler {
  private errorPatterns: Map<string, (error: Error, step: RPAStep) => ErrorContext> = new Map();
  private recoveryStrategies: Map<string, ErrorRecovery> = new Map();

  constructor() {
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
  }

  handleError(error: any, step: RPAStep): ErrorContext {
    const errorType = this.classifyError(error);
    const contextBuilder = this.errorPatterns.get(errorType);
    
    if (contextBuilder) {
      return contextBuilder(error, step);
    }

    // Default error handling
    return {
      type: 'UNKNOWN_ERROR',
      phase: 'execution',
      message: error.message || 'Unknown error occurred',
      details: {
        stack: error.stack,
        step: step
      },
      recovery_suggestions: ['Retry the step', 'Check if the page structure has changed'],
      timestamp: Date.now()
    };
  }

  private classifyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (message.includes('not found')) return 'ELEMENT_NOT_FOUND';
    if (message.includes('permission')) return 'PERMISSION_ERROR';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('stale element')) return 'STALE_ELEMENT_ERROR';
    if (message.includes('invalid selector')) return 'INVALID_SELECTOR';
    if (message.includes('detached')) return 'DETACHED_ELEMENT';
    if (message.includes('blocked')) return 'ELEMENT_BLOCKED';
    
    return 'UNKNOWN_ERROR';
  }

  private initializeErrorPatterns(): void {
    // Timeout errors
    this.errorPatterns.set('TIMEOUT_ERROR', (error, step) => ({
      type: 'TIMEOUT_ERROR',
      phase: 'execution',
      message: `Operation timed out: ${error.message}`,
      details: {
        timeout: step.timeout_ms || 5000,
        selector: step.selector,
        action: step.action
      },
      recovery_suggestions: [
        'Increase timeout duration',
        'Check if element is taking longer to load',
        'Wait for specific conditions before acting',
        'Verify element is not hidden or behind other elements'
      ],
      timestamp: Date.now()
    }));

    // Element not found
    this.errorPatterns.set('ELEMENT_NOT_FOUND', (error, step) => ({
      type: 'ELEMENT_NOT_FOUND',
      phase: 'execution',
      message: `Element not found: ${step.selector}`,
      details: {
        selector: step.selector,
        action: step.action,
        page_url: window.location.href,
        page_title: document.title
      },
      recovery_suggestions: [
        'Verify selector is correct',
        'Wait for page to fully load',
        'Use more specific selector',
        'Check if element is inside iframe',
        'Wait for dynamic content to load'
      ],
      timestamp: Date.now()
    }));

    // Permission errors
    this.errorPatterns.set('PERMISSION_ERROR', (error, step) => ({
      type: 'PERMISSION_ERROR',
      phase: 'execution',
      message: `Permission denied: ${error.message}`,
      details: {
        action: step.action,
        selector: step.selector,
        page_domain: window.location.hostname
      },
      recovery_suggestions: [
        'Check browser extension permissions',
        'Verify domain is allowed in manifest',
        'Ensure user has granted necessary permissions',
        'Check if page blocks automation'
      ],
      timestamp: Date.now()
    }));

    // Network errors
    this.errorPatterns.set('NETWORK_ERROR', (error, step) => ({
      type: 'NETWORK_ERROR',
      phase: 'execution',
      message: `Network error: ${error.message}`,
      details: {
        action: step.action,
        url: step.value,
        online_status: navigator.onLine,
        connection_type: (navigator as any).connection?.effectiveType
      },
      recovery_suggestions: [
        'Check internet connection',
        'Retry the operation',
        'Wait for network to stabilize',
        'Check if site is accessible'
      ],
      timestamp: Date.now()
    }));

    // Stale element errors
    this.errorPatterns.set('STALE_ELEMENT_ERROR', (error, step) => ({
      type: 'STALE_ELEMENT_ERROR',
      phase: 'execution',
      message: `Element became stale: ${error.message}`,
      details: {
        selector: step.selector,
        action: step.action,
        page_url: window.location.href
      },
      recovery_suggestions: [
        'Find element again before interaction',
        'Wait for page stabilization',
        'Use more robust selector',
        'Add explicit wait conditions'
      ],
      timestamp: Date.now()
    }));

    // Invalid selector errors
    this.errorPatterns.set('INVALID_SELECTOR', (error, step) => ({
      type: 'INVALID_SELECTOR',
      phase: 'preparation',
      message: `Invalid selector: ${step.selector}`,
      details: {
        selector: step.selector,
        action: step.action,
        error_message: error.message
      },
      recovery_suggestions: [
        'Validate selector syntax',
        'Use CSS selector validator',
        'Try alternative selector format',
        'Use ID or class selectors instead'
      ],
      timestamp: Date.now()
    }));

    // Detached element errors
    this.errorPatterns.set('DETACHED_ELEMENT', (error, step) => ({
      type: 'DETACHED_ELEMENT',
      phase: 'execution',
      message: `Element detached from DOM: ${error.message}`,
      details: {
        selector: step.selector,
        action: step.action,
        page_url: window.location.href
      },
      recovery_suggestions: [
        'Re-find element before interaction',
        'Wait for page to stabilize',
        'Use explicit waits',
        'Check for dynamic content updates'
      ],
      timestamp: Date.now()
    }));

    // Element blocked errors
    this.errorPatterns.set('ELEMENT_BLOCKED', (error, step) => ({
      type: 'ELEMENT_BLOCKED',
      phase: 'execution',
      message: `Element blocked by overlay: ${error.message}`,
      details: {
        selector: step.selector,
        action: step.action,
        page_url: window.location.href
      },
      recovery_suggestions: [
        'Wait for overlays to disappear',
        'Close modal dialogs first',
        'Wait for animations to complete',
        'Use different interaction approach'
      ],
      timestamp: Date.now()
    }));
  }

  private initializeRecoveryStrategies(): void {
    // Wait and retry strategy
    this.recoveryStrategies.set('WAIT_AND_RETRY', {
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      },
      description: 'Wait 2 seconds and retry',
      success_criteria: 'Element becomes accessible after wait'
    });

    // Scroll to element strategy
    this.recoveryStrategies.set('SCROLL_TO_ELEMENT', {
      action: async () => {
        try {
          window.scrollTo(0, document.body.scrollHeight / 2);
          await new Promise(resolve => setTimeout(resolve, 500));
          return true;
        } catch {
          return false;
        }
      },
      description: 'Scroll page to make element visible',
      success_criteria: 'Element becomes visible in viewport'
    });

    // Wait for network idle strategy
    this.recoveryStrategies.set('WAIT_FOR_NETWORK_IDLE', {
      action: async () => {
        const startTime = Date.now();
        const maxWait = 10000;
        
        while (Date.now() - startTime < maxWait) {
          const activeRequests = (performance as any).getEntriesByType('resource')
            .filter((entry: any) => entry.startTime + entry.duration > Date.now());
          
          if (activeRequests.length === 0) {
            return true;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return false;
      },
      description: 'Wait for network requests to complete',
      success_criteria: 'No active network requests detected'
    });
  }

  // Get available recovery strategies
  public getRecoveryStrategies(): string[] {
    return Array.from(this.recoveryStrategies.keys());
  }

  // Execute a recovery strategy
  public async executeRecovery(strategyName: string): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(strategyName);
    if (!strategy) {
      return false;
    }

    try {
      return await strategy.action();
    } catch {
      return false;
    }
  }

  // Add custom error pattern
  public addErrorPattern(
    errorType: string, 
    pattern: (error: Error, step: RPAStep) => ErrorContext
  ): void {
    this.errorPatterns.set(errorType, pattern);
  }

  // Add custom recovery strategy
  public addRecoveryStrategy(
    name: string, 
    strategy: ErrorRecovery
  ): void {
    this.recoveryStrategies.set(name, strategy);
  }
}