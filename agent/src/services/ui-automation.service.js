/**
 * UI Automation Service - Real DOM Interaction for RPA
 * Provides deterministic DOM element finding and interaction
 */

class UIAutomationServiceImpl {
  constructor() {
    this.defaultTimeout = 10000;
    this.retryAttempts = 3;
    this.retryDelay = 500;
    this.observer = null;
    this.actionLog = [];
  }

  async initialize() {
    console.log('UI Automation Service initialized');
    
    this.setupMutationObserver();
    
    return {
      success: true,
      capabilities: this.getCapabilities()
    };
  }

  getCapabilities() {
    return {
      actions: ['click', 'type', 'select', 'hover', 'scroll', 'wait', 'screenshot', 'evaluate'],
      selectors: ['css', 'xpath', 'id', 'name', 'class', 'text', 'role'],
      waitStrategies: ['visible', 'hidden', 'present', 'clickable', 'text']
    };
  }

  /**
   * Find element with retry logic
   */
  async findElement(selector, options = {}) {
    const { timeout = this.defaultTimeout, selectorType = 'css' } = options;
    
    const startTime = Date.now();
    let lastError = null;

    while (Date.now() - startTime < timeout) {
      try {
        const element = this.querySelector(selector, selectorType);
        if (element) {
          return element;
        }
      } catch (error) {
        lastError = error;
      }

      await this.sleep(this.retryDelay);
    }

    throw new Error(`Element not found: ${selector} (timeout: ${timeout}ms)`);
  }

  /**
   * Query selector with type support
   */
  querySelector(selector, selectorType = 'css') {
    switch (selectorType) {
      case 'xpath':
        return document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      case 'id':
        return document.getElementById(selector);
      case 'name':
        return document.querySelector(`[name="${selector}"]`);
      case 'class':
        return document.querySelector(`.${selector}`);
      case 'text':
        return Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent.trim().includes(selector)
        );
      case 'role':
        return document.querySelector(`[role="${selector}"]`) || document.querySelector(selector);
      case 'css':
      default:
        return document.querySelector(selector);
    }
  }

  /**
   * Click action
   */
  async click(selector, options = {}) {
    const element = await this.findElement(selector, options);
    
    this.ensureVisible(element, selector);
    
    element.click();
    
    this.logAction('click', selector, { success: true });
    
    return {
      success: true,
      action: 'click',
      selector,
      element: this.getElementInfo(element)
    };
  }

  /**
   * Type text action
   */
  async type(selector, text, options = {}) {
    const element = await this.findElement(selector, options);
    
    this.ensureVisible(element, selector);
    
    // Focus and clear existing value
    element.focus();
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = '';
    }

    // Type each character with small delay for reliability
    if (options.slow === true) {
      for (const char of text) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await this.sleep(50);
      }
    } else {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    this.logAction('type', selector, { textLength: text.length, success: true });
    
    return {
      success: true,
      action: 'type',
      selector,
      textLength: text.length,
      element: this.getElementInfo(element)
    };
  }

  /**
   * Select dropdown option
   */
  async select(selector, value, options = {}) {
    const element = await this.findElement(selector, options);
    
    this.ensureVisible(element, selector);

    if (element.tagName === 'SELECT') {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.tagName === 'DIV' && element.getAttribute('role') === 'listbox') {
      // Handle custom dropdowns
      const option = Array.from(element.querySelectorAll('[role="option"]'))
        .find(opt => opt.textContent.trim() === value || opt.getAttribute('data-value') === value);
      
      if (option) {
        option.click();
      } else {
        throw new Error(`Option not found: ${value}`);
      }
    }

    this.logAction('select', selector, { value, success: true });
    
    return {
      success: true,
      action: 'select',
      selector,
      value,
      element: this.getElementInfo(element)
    };
  }

  /**
   * Hover action
   */
  async hover(selector, options = {}) {
    const element = await this.findElement(selector, options);
    
    this.ensureVisible(element, selector);
    
    element.dispatchEvent(new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
    
    element.dispatchEvent(new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window
    }));

    this.logAction('hover', selector, { success: true });
    
    return {
      success: true,
      action: 'hover',
      selector,
      element: this.getElementInfo(element)
    };
  }

  /**
   * Scroll action
   */
  async scroll(selector, options = {}) {
    let element;
    
    if (selector) {
      element = await this.findElement(selector, options);
      this.ensureVisible(element, selector);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Scroll to position
      const { x = 0, y = 0 } = options;
      window.scrollTo({ top: y, left: x, behavior: 'smooth' });
    }

    await this.sleep(300); // Wait for scroll to complete
    
    this.logAction('scroll', selector || 'window', { success: true });
    
    return {
      success: true,
      action: 'scroll',
      selector: selector || 'window',
      element: element ? this.getElementInfo(element) : null
    };
  }

  /**
   * Wait for condition
   */
  async wait(condition, value, options = {}) {
    const { timeout = this.defaultTimeout } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      let satisfied = false;

      switch (condition) {
        case 'visible':
          satisfied = this.isVisible(value);
          break;
        case 'hidden':
          satisfied = !this.isVisible(value);
          break;
        case 'present':
          satisfied = await this.isPresent(value);
          break;
        case 'text':
          satisfied = await this.hasText(value, value.text);
          break;
        case 'clickable':
          satisfied = await this.isClickable(value);
          break;
      }

      if (satisfied) {
        this.logAction('wait', condition, { value, success: true, time: Date.now() - startTime });
        return {
          success: true,
          condition,
          waited: Date.now() - startTime
        };
      }

      await this.sleep(this.retryDelay);
    }

    throw new Error(`Wait condition not met: ${condition} for "${value}" (timeout: ${timeout}ms)`);
  }

  /**
   * Evaluate custom JavaScript
   */
  async evaluate(script, options = {}) {
    try {
      const result = Function('"use strict";return (' + script + ')')();
      
      this.logAction('evaluate', script.substring(0, 50), { success: true });
      
      return {
        success: true,
        result,
        element: result?.tagName ? this.getElementInfo(result) : null
      };
    } catch (error) {
      throw new Error(`Script evaluation failed: ${error.message}`);
    }
  }

  /**
   * Take screenshot (returns data URL)
   */
  async screenshot(options = {}) {
    try {
      // Use chrome APIs if available (extension context)
      if (typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
        return new Promise((resolve) => {
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            resolve({
              success: true,
              dataUrl,
              format: 'png'
            });
          });
        });
      }

      // Fallback: html2canvas approach would go here
      throw new Error('Screenshot requires chrome.tabs API');

    } catch (error) {
      throw new Error(`Screenshot failed: ${error.message}`);
    }
  }

  /**
   * Execute a full RPA step
   */
  async executeStep(step, context = {}) {
    const { step_id, action, selector, value, options = {} } = step;

    try {
      let result;

      switch (action) {
        case 'click':
          result = await this.click(selector, options);
          break;
        case 'type':
          result = await this.type(selector, value, options);
          break;
        case 'select':
          result = await this.select(selector, value, options);
          break;
        case 'hover':
          result = await this.hover(selector, options);
          break;
        case 'scroll':
          result = await this.scroll(selector, options);
          break;
        case 'wait':
          result = await this.wait(value.condition, value.selector || value.text, options);
          break;
        case 'evaluate':
          result = await this.evaluate(selector, options);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return {
        success: true,
        step_id,
        action,
        result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        step_id,
        action,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Helper methods

  ensureVisible(element, selector) {
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      throw new Error(`Element is not visible: ${selector}`);
    }
  }

  isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  async isPresent(selector) {
    try {
      const element = this.querySelector(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  async isClickable(selector) {
    try {
      const element = await this.findElement(selector);
      if (!this.isVisible(element)) return false;
      
      const tagName = element.tagName.toLowerCase();
      if (['button', 'a', 'input'].includes(tagName)) {
        return !element.disabled;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  async hasText(selector, text) {
    try {
      const element = await this.findElement(selector);
      return element.textContent.includes(text);
    } catch {
      return false;
    }
  }

  getElementInfo(element) {
    if (!element) return null;
    
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: element.className.split(' ').filter(c => c) || [],
      text: element.textContent?.substring(0, 100) || '',
      attributes: Object.fromEntries(
        Array.from(element.attributes).map(attr => [attr.name, attr.value])
      )
    };
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      // Can emit events for DOM changes if needed
    });
  }

  logAction(action, selector, result) {
    this.actionLog.push({
      action,
      selector,
      result,
      timestamp: new Date().toISOString()
    });

    if (this.actionLog.length > 100) {
      this.actionLog.shift();
    }
  }

  getActionLog() {
    return [...this.actionLog];
  }

  clearActionLog() {
    this.actionLog = [];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.actionLog = [];
    console.log('UI Automation Service cleaned up');
  }
}

// Export singleton instance and class
export const uiAutomationService = new UIAutomationServiceImpl();
export const UIAutomationService = uiAutomationService;
export { UIAutomationServiceImpl };
