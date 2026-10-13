export class StepValidationMethods {
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

}
