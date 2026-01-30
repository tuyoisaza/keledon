/**
 * Step Validator - RPA Step Validation and Schema Compliance
 * Ensures steps follow contracts/rpa/step.schema.json specification
 */

export class StepValidator {
  constructor(config = {}) {
    this.config = {
      strictMode: true,
      maxTimeout: 30000, // 30 seconds max
      maxRetries: 5,
      allowedActions: [
        'click', 'fill', 'read', 'wait_for', 'navigate', 
        'select', 'assert', 'hover'
      ],
      ...config
    };
  }

  /**
   * Validate a single step against schema
   * @param {Object} step - Step to validate
   */
  validateStep(step) {
    const errors = [];

    // Required fields
    if (!step.id || typeof step.id !== 'string') {
      errors.push('Step must have a valid "id" string');
    }

    if (!step.action || !this.config.allowedActions.includes(step.action)) {
      errors.push(`Step must have a valid "action". Allowed: ${this.config.allowedActions.join(', ')}`);
    }

    if (!step.selector || typeof step.selector !== 'string') {
      errors.push('Step must have a valid "selector" string');
    }

    // Action-specific validations
    errors.push(...this.validateActionSpecific(step));

    // Optional fields
    if (step.timeout_ms !== undefined) {
      if (typeof step.timeout_ms !== 'number' || step.timeout_ms <= 0) {
        errors.push('timeout_ms must be a positive number');
      }

      if (step.timeout_ms > this.config.maxTimeout) {
        errors.push(`timeout_ms cannot exceed ${this.config.maxTimeout}ms`);
      }
    }

    if (step.retry !== undefined) {
      if (!this.isValidRetryConfig(step.retry)) {
        errors.push('retry configuration is invalid');
      }
    }

    // Selector validation
    errors.push(...this.validateSelector(step.selector));

    // Template variable validation
    errors.push(...this.validateTemplateVariables(step));

    return {
      valid: errors.length === 0,
      errors,
      step
    };
  }

  /**
   * Validate action-specific requirements
   * @param {Object} step - Step to validate
   */
  validateActionSpecific(step) {
    const errors = [];
    const { action } = step;

    switch (action) {
      case 'fill':
        if (!step.value) {
          errors.push('fill action requires "value" parameter');
        }
        break;

      case 'read':
        if (step.attribute && typeof step.attribute !== 'string') {
          errors.push('attribute must be a string for read action');
        }
        break;

      case 'navigate':
        if (!step.url) {
          errors.push('navigate action requires "url" parameter');
        }
        errors.push(...this.validateUrl(step.url));
        break;

      case 'select':
        if (!step.option) {
          errors.push('select action requires "option" parameter');
        }
        break;

      case 'assert':
        if (!step.text) {
          errors.push('assert action requires "text" parameter');
        }
        break;

      case 'wait_for':
        // wait_for doesn't require additional params
        break;

      case 'click':
      case 'hover':
        // These don't require additional params
        break;

      default:
        errors.push(`Unknown action: ${action}`);
    }

    return errors;
  }

  /**
   * Validate CSS selector
   * @param {string} selector - CSS selector to validate
   */
  validateSelector(selector) {
    const errors = [];

    if (typeof selector !== 'string') {
      errors.push('Selector must be a string');
      return errors;
    }

    // Check for dangerous selectors
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(selector)) {
        errors.push('Selector contains potentially dangerous content');
      }
    }

    // Check for XSS-like patterns
    const xssPatterns = [
      /on\w+=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(selector)) {
        errors.push('Selector contains potentially unsafe patterns');
      }
    }

    // Basic CSS syntax check
    try {
      document.querySelector(selector);
    } catch (error) {
      errors.push(`Invalid CSS selector syntax: ${error.message}`);
    }

    return errors;
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   */
  validateUrl(url) {
    const errors = [];

    if (typeof url !== 'string') {
      errors.push('URL must be a string');
      return errors;
    }

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
    
    for (const protocol of dangerousProtocols) {
      if (url.toLowerCase().startsWith(protocol)) {
        errors.push(`URL uses dangerous protocol: ${protocol}`);
      }
    }

    // Check for XSS patterns in URL
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(url)) {
        errors.push('URL contains potentially unsafe patterns');
      }
    }

    // Basic URL format check (relative or absolute)
    const isValidFormat = /^\/|^https?:\/\//.test(url) || /^\.?\//.test(url);
    
    if (!isValidFormat) {
      errors.push('URL must be absolute (http/https) or relative path');
    }

    return errors;
  }

  /**
   * Validate retry configuration
   * @param {Object} retry - Retry configuration
   */
  isValidRetryConfig(retry) {
    if (typeof retry !== 'object' || retry === null) {
      return true;
    }

    const { max_attempts, delay_ms } = retry;

    if (max_attempts !== undefined) {
      if (typeof max_attempts !== 'number' || max_attempts < 1 || max_attempts > this.config.maxRetries) {
        return false;
      }
    }

    if (delay_ms !== undefined) {
      if (typeof delay_ms !== 'number' || delay_ms < 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate template variables in step
   * @param {Object} step - Step to validate
   */
  validateTemplateVariables(step) {
    const errors = [];
    const templatePattern = /\{\{([^}]+)\}\}/g;
    
    // Find all template variables
    const allText = [
      step.selector || '',
      step.value || '',
      step.text || '',
      step.url || '',
      step.option || ''
    ].join(' ');

    const variables = allText.match(templatePattern) || [];

    for (const variable of variables) {
      const varName = variable.slice(1, -1);
      
      // Check variable name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        errors.push(`Invalid template variable name: ${varName}`);
      }
      
      // Check for potentially dangerous variable names
      const dangerousVars = ['window', 'document', 'location', 'localStorage', 'sessionStorage'];
      if (dangerousVars.includes(varName)) {
        errors.push(`Template variable name is reserved: ${varName}`);
      }
    }

    return errors;
  }

  /**
   * Validate complete flow
   * @param {Object} flow - Flow to validate
   */
  validateFlow(flow) {
    const errors = [];

    if (!flow.id || typeof flow.id !== 'string') {
      errors.push('Flow must have a valid "id" string');
    }

    if (!flow.name || typeof flow.name !== 'string') {
      errors.push('Flow must have a valid "name" string');
    }

    if (!flow.steps || !Array.isArray(flow.steps)) {
      errors.push('Flow must have a "steps" array');
      return { valid: false, errors };
    }

    if (flow.steps.length === 0) {
      errors.push('Flow must have at least one step');
    }

    if (flow.steps.length > 100) {
      errors.push('Flow cannot have more than 100 steps');
    }

    // Validate each step
    const stepIds = new Set();
    for (let i = 0; i < flow.steps.length; i++) {
      const stepErrors = this.validateStep(flow.steps[i]);
      errors.push(...stepErrors);

      const step = flow.steps[i];
      
      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id} at index ${i}`);
      } else {
        stepIds.add(step.id);
      }

      // Check step ID format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(step.id)) {
        errors.push(`Invalid step ID format: ${step.id} at index ${i}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      flow
    };
  }

  /**
   * Sanitize step for execution
   * @param {Object} step - Step to sanitize
   */
  sanitizeStep(step) {
    const sanitized = { ...step };

    // Remove potentially dangerous content
    if (sanitized.value) {
      sanitized.value = this.sanitizeText(sanitized.value);
    }

    if (sanitized.text) {
      sanitized.text = this.sanitizeText(sanitized.text);
    }

    if (sanitized.url) {
      sanitized.url = this.sanitizeUrl(sanitized.url);
    }

    return sanitized;
  }

  /**
   * Sanitize text content
   * @param {string} text - Text to sanitize
   */
  sanitizeText(text) {
    if (typeof text !== 'string') return text;

    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Sanitize URL
   * @param {string} url - URL to sanitize
   */
  sanitizeUrl(url) {
    if (typeof url !== 'string') return url;

    return url
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  /**
   * Get validation summary
   */
  getValidationSummary(validationResult) {
    const { valid, errors } = validationResult;
    
    return {
      isValid: valid,
      errorCount: errors.length,
      errors: errors.map(error => ({
        message: error,
        severity: this.getErrorSeverity(error)
      })),
      recommendations: this.getRecommendations(errors)
    };
  }

  /**
   * Get error severity
   * @param {string} error - Error message
   */
  getErrorSeverity(error) {
    if (error.includes('dangerous') || error.includes('unsafe')) {
      return 'high';
    } else if (error.includes('invalid') || error.includes('missing')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get recommendations for fixing errors
   * @param {Array} errors - Array of error messages
   */
  getRecommendations(errors) {
    const recommendations = [];

    for (const error of errors) {
      if (error.includes('selector')) {
        recommendations.push('Test your CSS selectors in browser dev tools');
      } else if (error.includes('timeout')) {
        recommendations.push('Increase timeout or ensure page loads completely');
      } else if (error.includes('dangerous')) {
        recommendations.push('Review security practices and input sanitization');
      } else if (error.includes('invalid')) {
        recommendations.push('Check step schema for required fields');
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Enable/disable strict mode
   * @param {boolean} strict - Whether to enable strict validation
   */
  setStrictMode(strict) {
    this.config.strictMode = strict;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}