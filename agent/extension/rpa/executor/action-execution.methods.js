export class ActionExecutionMethods {
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

}
