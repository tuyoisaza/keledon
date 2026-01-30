/**
 * Genesys RPA Adapter
 * Domain-specific adapter for Genesys Cloud CX platform
 * Handles Genesys-specific UI elements and workflows
 */

import { RPAStep, RPAResult } from '../../../contracts/types';

export class GenesysAdapter {
  constructor() {
    this.name = 'genesys';
    this.version = '1.0.0';
    this.selectors = this.initializeSelectors();
    this.eventHandlers = new Map();
  }

  /**
   * Initialize Genesys-specific selectors
   */
  initializeSelectors() {
    return {
      // Interaction workspace
      interactionTab: '[data-test="interaction-tab"]',
      interactionList: '[data-test="interaction-list"]',
      activeInteraction: '.cx-interaction.active',
      
      // Agent controls
      acceptButton: '[data-test="accept-interaction"]',
      rejectButton: '[data-test="reject-interaction"]',
      endButton: '[data-test="end-interaction"]',
      holdButton: '[data-test="hold-interaction"]',
      muteButton: '[data-test="mute-interaction"]',
      
      // Communication
      dialpadButton: '[data-test="dialpad"]',
      noteField: '[data-test="interaction-notes"] textarea',
      wrapupCode: '[data-test="wrapup-code"] select',
      
      // Customer information
      customerInfo: '[data-test="customer-info"]',
      customerName: '.customer-name',
      customerPhone: '.customer-phone',
      customerEmail: '.customer-email',
      
      // Script/Assist
      scriptPanel: '[data-test="script-panel"]',
      scriptContent: '.script-content',
      
      // Common Genesys elements
      loadingSpinner: '.cx-loading',
      notificationToast: '.cx-notification',
      errorBanner: '.cx-error'
    };
  }

  /**
   * Detect if current page is Genesys
   */
  detect() {
    return (
      window.location.hostname.includes('genesys.com') ||
      window.location.hostname.includes('mypurecloud.com') ||
      document.querySelector('meta[name="generator"]')?.content?.includes('genesys') ||
      document.querySelector('[data-app="genesys-cloud"]') !== null
    );
  }

  /**
   * Execute Genesys-specific step
   */
  async executeStep(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      switch (step.action) {
        case 'accept_interaction':
          return await this.acceptInteraction(step);
        case 'reject_interaction':
          return await this.rejectInteraction(step);
        case 'end_interaction':
          return await this.endInteraction(step);
        case 'hold_interaction':
          return await this.holdInteraction(step);
        case 'mute_interaction':
          return await this.muteInteraction(step);
        case 'add_note':
          return await this.addNote(step);
        case 'set_wrapup_code':
          return await this.setWrapupCode(step);
        case 'open_dialpad':
          return await this.openDialpad(step);
        case 'dial_number':
          return await this.dialNumber(step);
        case 'get_customer_info':
          return await this.getCustomerInfo(step);
        case 'wait_for_interaction':
          return await this.waitForInteraction(step);
        case 'click_element':
          return await this.clickElement(step);
        case 'fill_field':
          return await this.fillField(step);
        case 'select_option':
          return await this.selectOption(step);
        case 'wait_for_element':
          return await this.waitForElement(step);
        case 'read_text':
          return await this.readText(step);
        default:
          throw new Error(`Unsupported Genesys action: ${step.action}`);
      }
    } catch (error) {
      return {
        step_id: step.id,
        status: 'failure',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: {
          code: 'genesys_action_failed',
          message: error.message,
          details: {
            action: step.action,
            selector: step.selector
          }
        }
      };
    }
  }

  /**
   * Accept incoming interaction
   */
  async acceptInteraction(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(
      this.selectors.acceptButton, 
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('Accept button not found');
    }

    element.click();
    
    // Wait for interaction to be active
    await this.waitForElementSelector(
      this.selectors.activeInteraction,
      3000
    );

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        element_count: 1,
        element_state: {
          visible: true,
          enabled: false // Disabled after acceptance
        }
      }
    };
  }

  /**
   * Reject incoming interaction
   */
  async rejectInteraction(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(
      this.selectors.rejectButton,
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('Reject button not found');
    }

    element.click();

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        element_count: 1
      }
    };
  }

  /**
   * End current interaction
   */
  async endInteraction(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(
      this.selectors.endButton,
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('End button not found');
    }

    element.click();

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        element_count: 1
      }
    };
  }

  /**
   * Place interaction on hold
   */
  async holdInteraction(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(
      this.selectors.holdButton,
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('Hold button not found');
    }

    const isHeld = element.classList.contains('held');
    element.click();

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: isHeld ? 'unheld' : 'held',
        element_count: 1
      }
    };
  }

  /**
   * Mute/unmute microphone
   */
  async muteInteraction(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(
      this.selectors.muteButton,
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('Mute button not found');
    }

    const isMuted = element.classList.contains('muted');
    element.click();

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: isMuted ? 'unmuted' : 'muted',
        element_count: 1
      }
    };
  }

  /**
   * Add note to interaction
   */
  async addNote(step: RPAStep): Promise<RPAResult> {
    if (!step.value) {
      throw new Error('Note text is required');
    }

    const element = await this.waitForElementSelector(
      this.selectors.noteField,
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('Note field not found');
    }

    // Clear existing content and add new note
    element.value = '';
    element.focus();
    
    // Type the note character by character for better reliability
    for (const char of step.value) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: step.value,
        element_count: 1
      }
    };
  }

  /**
   * Set wrap-up code
   */
  async setWrapupCode(step: RPAStep): Promise<RPAResult> {
    if (!step.value) {
      throw new Error('Wrap-up code is required');
    }

    const element = await this.waitForElementSelector(
      this.selectors.wrapupCode,
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('Wrap-up code selector not found');
    }

    // Select the wrap-up code
    const option = Array.from(element.options).find(opt => 
      opt.value === step.value || opt.text === step.value
    );
    
    if (!option) {
      throw new Error(`Wrap-up code not found: ${step.value}`);
    }

    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: option.text,
        element_count: 1
      }
    };
  }

  /**
   * Open dialpad
   */
  async openDialpad(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(
      this.selectors.dialpadButton,
      step.timeout_ms || 5000
    );
    
    if (!element) {
      throw new Error('Dialpad button not found');
    }

    element.click();

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        element_count: 1
      }
    };
  }

  /**
   * Dial a number
   */
  async dialNumber(step: RPAStep): Promise<RPAResult> {
    if (!step.value) {
      throw new Error('Phone number is required');
    }

    // First open dialpad
    await this.openDialpad({ id: 'temp', action: 'wait_for_element', selector: 'dialpad' } as RPAStep);

    // Find number input in dialpad
    const numberInput = await this.waitForElementSelector(
      'input[type="tel"], .dialpad-input',
      3000
    );

    if (!numberInput) {
      throw new Error('Dialpad input not found');
    }

    numberInput.value = step.value;
    numberInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Find and click dial button
    const dialButton = await this.waitForElementSelector(
      '.dial-button, [data-test="dial-button"]',
      3000
    );

    if (dialButton) {
      dialButton.click();
    }

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: step.value,
        element_count: 2
      }
    };
  }

  /**
   * Get customer information
   */
  async getCustomerInfo(step: RPAStep): Promise<RPAResult> {
    const customerInfo = await this.waitForElementSelector(
      this.selectors.customerInfo,
      step.timeout_ms || 5000
    );
    
    if (!customerInfo) {
      throw new Error('Customer information panel not found');
    }

    const nameElement = customerInfo.querySelector(this.selectors.customerName);
    const phoneElement = customerInfo.querySelector(this.selectors.customerPhone);
    const emailElement = customerInfo.querySelector(this.selectors.customerEmail);

    const info = {
      name: nameElement?.textContent?.trim() || '',
      phone: phoneElement?.textContent?.trim() || '',
      email: emailElement?.textContent?.trim() || ''
    };

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: JSON.stringify(info),
        element_count: Object.values(info).filter(v => v).length
      }
    };
  }

  /**
   * Wait for new interaction
   */
  async waitForInteraction(step: RPAStep): Promise<RPAResult> {
    const timeout = step.timeout_ms || 30000; // 30 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const interactions = document.querySelectorAll(this.selectors.interactionList);
      
      for (const interaction of interactions) {
        if (!interaction.classList.contains('active') && 
            !interaction.classList.contains('handled')) {
          return {
            step_id: step.id,
            status: 'success',
            timestamp: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            result: {
              text: 'New interaction available',
              element_count: 1
            }
          };
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('No new interaction received within timeout');
  }

  /**
   * Generic element click
   */
  async clickElement(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(step.selector, step.timeout_ms || 5000);
    
    if (!element) {
      throw new Error(`Element not found: ${step.selector}`);
    }

    element.click();

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        element_count: 1
      }
    };
  }

  /**
   * Generic field fill
   */
  async fillField(step: RPAStep): Promise<RPAResult> {
    if (!step.value) {
      throw new Error('Value is required for fill action');
    }

    const element = await this.waitForElementSelector(step.selector, step.timeout_ms || 5000);
    
    if (!element) {
      throw new Error(`Element not found: ${step.selector}`);
    }

    element.value = step.value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: step.value,
        element_count: 1
      }
    };
  }

  /**
   * Generic option select
   */
  async selectOption(step: RPAStep): Promise<RPAResult> {
    if (!step.option) {
      throw new Error('Option is required for select action');
    }

    const element = await this.waitForElementSelector(step.selector, step.timeout_ms || 5000);
    
    if (!element) {
      throw new Error(`Element not found: ${step.selector}`);
    }

    const option = Array.from(element.options).find(opt => 
      opt.value === step.option || opt.text === step.option
    );
    
    if (!option) {
      throw new Error(`Option not found: ${step.option}`);
    }

    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: option.text,
        element_count: 1
      }
    };
  }

  /**
   * Generic wait for element
   */
  async waitForElement(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(step.selector, step.timeout_ms || 5000);
    
    if (!element) {
      throw new Error(`Element not found within timeout: ${step.selector}`);
    }

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        element_count: 1,
        element_state: {
          visible: this.isElementVisible(element),
          enabled: !element.disabled
        }
      }
    };
  }

  /**
   * Generic text read
   */
  async readText(step: RPAStep): Promise<RPAResult> {
    const element = await this.waitForElementSelector(step.selector, step.timeout_ms || 5000);
    
    if (!element) {
      throw new Error(`Element not found: ${step.selector}`);
    }

    const text = step.attribute ? 
      element.getAttribute(step.attribute) : 
      element.textContent || element.value || '';

    return {
      step_id: step.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      result: {
        text: text.trim(),
        element_count: 1
      }
    };
  }

  /**
   * Wait for element selector with timeout
   */
  async waitForElementSelector(selector: string, timeout: number): Promise<Element | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element && this.isElementVisible(element)) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
  }

  /**
   * Check if element is visible
   */
  isElementVisible(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Event handling
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event: string, data: any): void {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach((handler: Function) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in Genesys adapter event handler for ${event}:`, error);
      }
    });
  }
}