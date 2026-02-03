/**
 * Salesforce RPA Adapter - Page-specific automation for Salesforce
 * Implements deterministic DOM steps for Salesforce interface
 */

export class SalesforceAdapter {
  constructor() {
    this.name = 'salesforce';
    this.domain = 'salesforce.com';
    this.selectors = {
      // Common Salesforce selectors
      loginButton: '[title="Log In"]',
      usernameField: '#username, input[name="username"], input[name="user_login"]',
      passwordField: '#password, input[name="password"], input[name="pw"]',
      searchField: '[name="search-term"], input[name="str"]',
      saveButton: '[title="Save"], [title="Save & New"]',
      newButton: '[title="New"], [title="New"]',
      editButton: '[title="Edit"], [title="Change"]',
      deleteButton: '[title="Delete"]',
      tabLink: 'a[data-tab="true"], .oneTab',
      opportunityLink: 'a[title*="Opportunity"], .opportunityLink',
      accountLink: 'a[title*="Account"], .accountLink'
    };
  }

  /**
   * Initialize Salesforce adapter
   */
  async initialize() {
    try {
      // Verify we're on Salesforce domain
      if (!this.isSalesforcePage()) {
        throw new Error('Not on Salesforce page');
      }
      
      console.log('Salesforce adapter initialized');
      
    } catch (error) {
      console.error('Salesforce adapter initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute step with Salesforce-specific logic
   */
  async executeStep(step, context = {}) {
    try {
      switch (step.action) {
        case 'click':
          return await this.executeClick(step, context);
          
        case 'fill_field':
          return await this.executeFillField(step, context);
          
        case 'wait_for':
          return await this.executeWaitFor(step, context);
          
        case 'submit':
          return await this.executeSubmit(step, context);
          
        case 'navigate':
          return await this.executeNavigate(step, context);
          
        case 'extract_text':
          return await this.executeExtractText(step, context);
          
        case 'select_option':
          return await this.executeSelectOption(step, context);
          
        case 'scroll':
          return await this.executeScroll(step, context);
          
        default:
          throw new Error(`Unsupported action: ${step.action}`);
      }
    } catch (error) {
      throw new Error(`Salesforce step execution failed: ${error.message}`);
    }
  }

  /**
   * Execute click action
   */
  async executeClick(step, context) {
    const selector = this.resolveSelector(step.selector);
    const element = await this.waitForElement(selector);
    
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Check post-condition
    const postCondition = step.post_condition;
    if (postCondition) {
      await this.validatePostCondition(postCondition, element);
    }

    // Click element
    element.click();
    
    // Wait for potential page change
    await this.waitForPageChange(1000);
    
    return {
      success: true,
      action: 'click',
      selector,
      element: element.tagName + (element.className ? '.' + element.className : ''),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute fill field action
   */
  async executeFillField(step, context) {
    const selector = this.resolveSelector(step.selector);
    const element = await this.waitForElement(selector);
    
    if (!element) {
      throw new Error(`Field not found: ${selector}`);
    }

    // Handle different input types
    if (element.tagName === 'SELECT') {
      this.selectDropdownOption(element, step.value);
    } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = step.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      element.textContent = step.value;
    }

    // Check post-condition
    const postCondition = step.post_condition;
    if (postCondition) {
      await this.validatePostCondition(postCondition, element);
    }

    return {
      success: true,
      action: 'fill_field',
      selector,
      value: step.value,
      elementType: element.tagName,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute wait for element action
   */
  async executeWaitFor(step, context) {
    const selector = this.resolveSelector(step.selector);
    const element = await this.waitForElement(selector);
    
    if (!element) {
      throw new Error(`Element not found for wait: ${selector}`);
    }

    const timeout = step.timeout_ms || 5000;
    const startTime = Date.now();
    
    // Wait for post-condition
    while (Date.now() - startTime < timeout) {
      const conditionMet = await this.checkPostCondition(step.post_condition, element);
      if (conditionMet) {
        break;
      }
      await this.sleep(100);
    }

    if (Date.now() - startTime >= timeout) {
      throw new Error(`Timeout waiting for condition: ${selector}`);
    }

    return {
      success: true,
      action: 'wait_for',
      selector,
      timeout,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute submit action
   */
  async executeSubmit(step, context) {
    const selector = this.resolveSelector(step.selector);
    const element = await this.waitForElement(selector);
    
    if (!element) {
      throw new Error(`Submit element not found: ${selector}`);
    }

    // Check post-condition
    const postCondition = step.post_condition;
    if (postCondition) {
      await this.validatePostCondition(postCondition, element);
    }

    element.click();
    
    // Wait for potential navigation/form submission
    await this.waitForPageChange(2000);
    
    return {
      success: true,
      action: 'submit',
      selector,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute navigate action
   */
  async executeNavigate(step, context) {
    if (!step.value || !step.value.startsWith('http')) {
      throw new Error('Invalid URL for navigation');
    }

    const currentUrl = window.location.href;
    const targetUrl = step.value;

    if (currentUrl === targetUrl) {
      return {
        success: true,
        action: 'navigate',
        url: targetUrl,
        timestamp: new Date().toISOString(),
        note: 'Already at target URL'
      };
    }

    window.location.href = targetUrl;
    
    // Wait for navigation
    await this.waitForPageChange(3000);
    
    return {
      success: true,
      action: 'navigate',
      from: currentUrl,
      to: targetUrl,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute extract text action
   */
  async executeExtractText(step, context) {
    const selector = this.resolveSelector(step.selector);
    const element = await this.waitForElement(selector);
    
    if (!element) {
      throw new Error(`Element not found for text extraction: ${selector}`);
    }

    const text = element.textContent || element.value || '';
    
    // Check post-condition
    const postCondition = step.post_condition;
    if (postCondition) {
      await this.validatePostCondition(postCondition, element);
    }

    return {
      success: true,
      action: 'extract_text',
      selector,
      text,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute select option action
   */
  async executeSelectOption(step, context) {
    const selector = this.resolveSelector(step.selector);
    const element = await this.waitForElement(selector);
    
    if (!element) {
      throw new Error(`Select element not found: ${selector}`);
    }

    if (element.tagName !== 'SELECT') {
      throw new Error(`Element is not a dropdown: ${selector}`);
    }

    // Find and select the option
    const option = Array.from(element.options).find(opt => 
      opt.value === step.value || opt.textContent === step.value
    );
    
    if (!option) {
      throw new Error(`Option not found: ${step.value}`);
    }

    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Check post-condition
    const postCondition = step.post_condition;
    if (postCondition) {
      await this.validatePostCondition(postCondition, element);
    }

    return {
      success: true,
      action: 'select_option',
      selector,
      value: step.value,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute scroll action
   */
  async executeScroll(step, context) {
    const scrollTarget = step.value || 'document.body';
    
    if (typeof scrollTarget === 'string') {
      const element = await this.waitForElement(scrollTarget);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo(step.x || 0, step.y || 0);
    }

    await this.sleep(500);
    
    return {
      success: true,
      action: 'scroll',
      target: scrollTarget,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Resolve selector with fallback logic
   */
  resolveSelector(selector) {
    // Use provided selector, or try Salesforce-specific defaults
    return selector || this.selectors.loginButton;
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element not found within timeout: ${selector}`));
          return;
        }
        
        setTimeout(checkElement, 100);
      };
      
      checkElement();
    });
  }

  /**
   * Wait for page change
   */
  async waitForPageChange(timeout = 3000) {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }

  /**
   * Validate post-condition
   */
  async validatePostCondition(postCondition, element) {
    if (!postCondition) return true;
    
    const { type, selector, expected, value } = postCondition;
    
    switch (type) {
      case 'exists':
        const targetElement = document.querySelector(selector);
        if (!targetElement) {
          throw new Error(`Post-condition failed: element does not exist: ${selector}`);
        }
        break;
        
      case 'dom_equals':
        const targetElement = document.querySelector(selector);
        const actualValue = targetElement ? targetElement[value] || targetElement.textContent : '';
        
        if (actualValue !== expected) {
          throw new Error(`Post-condition failed: expected "${expected}" but got "${actualValue}"`);
        }
        break;
        
      default:
        throw new Error(`Unknown post-condition type: ${type}`);
    }
    
    return true;
  }

  /**
   * Select dropdown option
   */
  selectDropdownOption(selectElement, value) {
    const option = Array.from(selectElement.options).find(opt => 
      opt.value === value || opt.textContent === value
    );
    
    if (option) {
      option.selected = true;
    }
  }

  /**
   * Check if current page is Salesforce
   */
  isSalesforcePage() {
    const domain = window.location.hostname.toLowerCase();
    return domain.includes('salesforce.com') || domain.includes('force.com');
  }

  /**
   * Sleep utility
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get adapter info
   */
  getAdapterInfo() {
    return {
      name: this.name,
      domain: this.domain,
      version: '1.0.0',
      capabilities: ['click', 'fill_field', 'wait_for', 'submit', 'navigate', 'extract_text', 'select_option', 'scroll'],
      selectors: Object.keys(this.selectors)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('Salesforce adapter cleaned up');
  }
}