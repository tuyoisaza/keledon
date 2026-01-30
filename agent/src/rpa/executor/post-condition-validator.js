/**
 * Post-Condition Validator - Validates step execution results
 * Ensures DOM state meets expected conditions after step execution
 */

export class PostConditionValidator {
  constructor(config = {}) {
    this.config = {
      strictMode: true,
      validationDelay: 500, // Wait time before checking post-conditions
      maxWaitTime: 10000, // Maximum wait for dynamic content
      ...config
    };
  }

  /**
   * Validate post-conditions for a step
   * @param {Object} step - Step definition with post_conditions
   * @param {Object} result - Step execution result
   */
  async validatePostConditions(step, result) {
    if (result.status !== 'success' || !step.post_condition) {
      return { valid: true, validations: [] };
    }

    const validations = [];
    const { post_condition } = step;

    // Wait briefly for DOM to stabilize
    await this.delay(this.config.validationDelay);

    try {
      // Element existence validation
      if (post_condition.element_exists !== undefined) {
        validations.push(
          await this.validateElementExists(step.selector, post_condition.element_exists)
        );
      }

      // Element visibility validation
      if (post_condition.element_visible !== undefined) {
        validations.push(
          await this.validateElementVisibility(step.selector, post_condition.element_visible)
        );
      }

      // Element enabled validation
      if (post_condition.element_enabled !== undefined) {
        validations.push(
          await this.validateElementEnabled(step.selector, post_condition.element_enabled)
        );
      }

      // Text content validation
      if (post_condition.text_contains !== undefined) {
        validations.push(
          await this.validateTextContains(step.selector, post_condition.text_contains)
        );
      }

      // Attribute validation
      if (post_condition.attribute_exists !== undefined) {
        validations.push(
          await this.validateAttributeExists(step.selector, post_condition.attribute_exists)
        );
      }

      // Count validation
      if (post_condition.element_count !== undefined) {
        validations.push(
          await this.validateElementCount(step.selector, post_condition.element_count)
        );
      }

      // Class validation
      if (post_condition.has_class !== undefined) {
        validations.push(
          await this.validateHasClass(step.selector, post_condition.has_class)
        );
      }

      // Value validation
      if (post_condition.value_equals !== undefined) {
        validations.push(
          await this.validateValueEquals(step.selector, post_condition.value_equals)
        );
      }

      return {
        valid: validations.every(v => v.passed),
        validations
      };

    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'post_condition_error',
          message: `Post-condition validation failed: ${error.message}`,
          step: step.id,
          originalResult: result
        },
        validations: []
      };
    }
  }

  /**
   * Validate element existence
   * @param {string} selector - CSS selector
   * @param {boolean} expected - Expected existence state
   */
  async validateElementExists(selector, expected) {
    const elements = document.querySelectorAll(selector);
    const exists = elements.length > 0;

    return {
      type: 'element_exists',
      selector,
      expected,
      actual: exists,
      passed: exists === expected,
      details: {
        elementCount: elements.length,
        selector
      }
    };
  }

  /**
   * Validate element visibility
   * @param {string} selector - CSS selector
   * @param {boolean} expected - Expected visibility state
   */
  async validateElementVisibility(selector, expected) {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      const actual = false;
      return {
        type: 'element_visible',
        selector,
        expected,
        actual,
        passed: actual === expected,
        details: { elementCount: 0, selector }
      };
    }

    // Check first visible element
    let visible = false;
    for (const element of elements) {
      if (this.isElementVisible(element)) {
        visible = true;
        break;
      }
    }

    return {
      type: 'element_visible',
      selector,
      expected,
      actual: visible,
      passed: visible === expected,
      details: {
        elementCount: elements.length,
        visibleElements: visible ? 1 : 0,
        selector
      }
    };
  }

  /**
   * Validate element enabled state
   * @param {string} selector - CSS selector
   * @param {boolean} expected - Expected enabled state
   */
  async validateElementEnabled(selector, expected) {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      const actual = false;
      return {
        type: 'element_enabled',
        selector,
        expected,
        actual,
        passed: actual === expected,
        details: { elementCount: 0, selector }
      };
    }

    // Check if at least one element is enabled
    let enabled = false;
    for (const element of elements) {
      if (!element.disabled) {
        enabled = true;
        break;
      }
    }

    return {
      type: 'element_enabled',
      selector,
      expected,
      actual: enabled,
      passed: enabled === expected,
      details: {
        elementCount: elements.length,
        enabledElements: enabled ? 1 : 0,
        selector
      }
    };
  }

  /**
   * Validate text content
   * @param {string} selector - CSS selector
   * @param {string} expectedText - Expected text content
   */
  async validateTextContains(selector, expectedText) {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      return {
        type: 'text_contains',
        selector,
        expected: expectedText,
        actual: '',
        passed: false,
        details: { elementCount: 0, selector }
      };
    }

    // Get text from first element
    const element = elements[0];
    const actualText = (element.textContent || element.innerText || '').trim();

    const passed = actualText.includes(expectedText);

    return {
      type: 'text_contains',
      selector,
      expected: expectedText,
      actual: actualText,
      passed,
      details: {
        elementCount: elements.length,
        textLength: actualText.length,
        selector
      }
    };
  }

  /**
   * Validate attribute existence
   * @param {string} selector - CSS selector
   * @param {Object} attributeCheck - Attribute validation object
   */
  async validateAttributeExists(selector, attributeCheck) {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      return {
        type: 'attribute_exists',
        selector,
        expected: attributeCheck,
        actual: null,
        passed: false,
        details: { elementCount: 0, selector }
      };
    }

    const element = elements[0];
    const { name, value, exists } = attributeCheck;

    if (typeof name !== 'string') {
      return {
        type: 'attribute_exists',
        selector,
        expected: attributeCheck,
        actual: 'Invalid attribute name',
        passed: false,
        details: { selector, error: 'Attribute name must be string' }
      };
    }

    const actualValue = element.getAttribute(name);
    const actualExists = actualValue !== null;

    let passed = actualExists === exists;
    
    // Also check value if specified
    if (exists && value !== undefined) {
      passed = passed && actualValue === value;
    }

    return {
      type: 'attribute_exists',
      selector,
      expected: attributeCheck,
      actual: {
        exists: actualExists,
        value: actualValue
      },
      passed,
      details: {
        elementCount: elements.length,
        attributeName: name,
        attributeValue: actualValue,
        selector
      }
    };
  }

  /**
   * Validate element count
   * @param {string} selector - CSS selector
   * @param {Object} countCheck - Count validation object
   */
  async validateElementCount(selector, countCheck) {
    const elements = document.querySelectorAll(selector);
    const actualCount = elements.length;

    const { operator, value } = countCheck;
    
    let passed = false;
    switch (operator) {
      case 'equals':
        passed = actualCount === value;
        break;
      case 'greater_than':
        passed = actualCount > value;
        break;
      case 'less_than':
        passed = actualCount < value;
        break;
      case 'greater_equal':
        passed = actualCount >= value;
        break;
      case 'less_equal':
        passed = actualCount <= value;
        break;
      case 'not_equals':
        passed = actualCount !== value;
        break;
      default:
        throw new Error(`Invalid count operator: ${operator}`);
    }

    return {
      type: 'element_count',
      selector,
      expected: countCheck,
      actual: actualCount,
      passed,
      details: {
        actualCount,
        operator,
        expectedValue: value,
        selector
      }
    };
  }

  /**
   * Validate class presence
   * @param {string} selector - CSS selector
   * @param {string} className - Class name to check
   */
  async validateHasClass(selector, className) {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      return {
        type: 'has_class',
        selector,
        expected: className,
        actual: false,
        passed: false,
        details: { elementCount: 0, selector }
      };
    }

    const element = elements[0];
    const actual = element.classList.contains(className);

    return {
      type: 'has_class',
      selector,
      expected: className,
      actual,
      passed: actual === true,
      details: {
        elementCount: elements.length,
        className,
        elementClasses: Array.from(element.classList),
        selector
      }
    };
  }

  /**
   * Validate element value
   * @param {string} selector - CSS selector
   * @param {string} expectedValue - Expected value
   */
  async validateValueEquals(selector, expectedValue) {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      return {
        type: 'value_equals',
        selector,
        expected: expectedValue,
        actual: null,
        passed: false,
        details: { elementCount: 0, selector }
      };
    }

    const element = elements[0];
    let actualValue;

    // Get value based on element type
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      actualValue = element.value;
    } else if (element.tagName === 'SELECT') {
      actualValue = element.value;
    } else {
      actualValue = element.textContent?.trim() || element.innerText?.trim() || '';
    }

    const passed = actualValue === expectedValue;

    return {
      type: 'value_equals',
      selector,
      expected: expectedValue,
      actual: actualValue,
      passed,
      details: {
        elementCount: elements.length,
        elementTag: element.tagName,
        actualValue,
        selector
      }
    };
  }

  /**
   * Wait for dynamic content with timeout
   * @param {Function} validator - Validation function to run
   * @param {number} timeout - Maximum wait time
   */
  async waitForCondition(validator, timeout = this.config.maxWaitTime) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await validator();
        if (result.passed) {
          return result;
        }
      } catch (error) {
        // Continue trying on validation errors
      }
      
      await this.delay(200);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Check if element is visible
   * @param {Element} element - DOM element to check
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
   * Generate validation report
   * @param {Array} validations - Array of validation results
   */
  generateReport(validations) {
    const passed = validations.filter(v => v.passed);
    const failed = validations.filter(v => !v.passed);

    return {
      summary: {
        total: validations.length,
        passed: passed.length,
        failed: failed.length,
        successRate: (passed.length / validations.length) * 100
      },
      details: {
        passed: passed.map(v => ({
          type: v.type,
          selector: v.selector,
          expected: v.expected,
          actual: v.actual
        })),
        failed: failed.map(v => ({
          type: v.type,
          selector: v.selector,
          expected: v.expected,
          actual: v.actual,
          error: v.error
        }))
      }
    };
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}