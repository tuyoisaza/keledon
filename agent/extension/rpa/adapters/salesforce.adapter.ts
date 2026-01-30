/**
 * Salesforce RPA Adapter
 * Domain-specific adapter for Salesforce CRM platform
 * Handles Salesforce-specific UI elements and workflows
 */

import { RPAStep, RPAResult } from '../../../contracts/types';
import { selectorManager } from '../selectors/selector-maps';

export class SalesforceAdapter {
  private name: string;
  private version: string;
  private eventHandlers: Map<string, Function>;

  constructor() {
    this.name = 'salesforce';
    this.version = '1.0.0';
    this.eventHandlers = new Map();
  }

  /**
   * Detect if current page is Salesforce
   */
  detect(): boolean {
    return (
      window.location.hostname.includes('salesforce.com') ||
      window.location.hostname.includes('force.com') ||
      window.location.hostname.includes('my.salesforce.com') ||
      document.querySelector('meta[name="generator"]')?.content?.includes('salesforce') ||
      document.querySelector('[data-aura-rendered="true"]') !== null ||
      document.querySelector('.forceSalesforceDesktop') !== null
    );
  }

  /**
   * Execute Salesforce-specific step
   */
  async executeStep(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      switch (step.action) {
        case 'create_case':
          return await this.createCase(step);
        case 'update_case':
          return await this.updateCase(step);
        case 'search_records':
          return await this.searchRecords(step);
        case 'navigate_salesforce_ui':
          return await this.navigateSalesforceUI(step);
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
          throw new Error(`Unsupported Salesforce action: ${step.action}`);
      }
    } catch (error) {
      return {
        step_id: step.id,
        status: 'failure',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: {
          code: 'salesforce_action_failed',
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
   * Create a new case
   */
  async createCase(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      // Navigate to case creation
      const newCaseButton = await selectorManager.findElement('salesforce', 'newCaseButton');
      if (!newCaseButton) {
        throw new Error('New Case button not found');
      }
      
      newCaseButton.click();
      
      // Wait for form to load
      await this.waitForTimeout(2000);
      
      // Fill case fields if provided
      if (step.parameters) {
        const fields = step.parameters;
        
        // Case Origin
        if (fields.origin) {
          const originField = await selectorManager.findElement('salesforce', 'caseOriginSelect');
          if (originField) {
            await this.selectDropdownOption(originField, fields.origin);
          }
        }
        
        // Contact Name
        if (fields.contactName) {
          const contactField = await selectorManager.findElement('salesforce', 'contactNameLookup');
          if (contactField) {
            await this.fillInputField(contactField, fields.contactName);
          }
        }
        
        // Account Name
        if (fields.accountName) {
          const accountField = await selectorManager.findElement('salesforce', 'accountNameLookup');
          if (accountField) {
            await this.fillInputField(accountField, fields.accountName);
          }
        }
        
        // Subject
        if (fields.subject) {
          const subjectField = await selectorManager.findElement('salesforce', 'caseSubjectInput');
          if (subjectField) {
            await this.fillInputField(subjectField, fields.subject);
          }
        }
        
        // Description
        if (fields.description) {
          const descriptionField = await selectorManager.findElement('salesforce', 'caseDescriptionTextarea');
          if (descriptionField) {
            await this.fillInputField(descriptionField, fields.description);
          }
        }
        
        // Priority
        if (fields.priority) {
          const priorityField = await selectorManager.findElement('salesforce', 'casePrioritySelect');
          if (priorityField) {
            await this.selectDropdownOption(priorityField, fields.priority);
          }
        }
        
        // Status
        if (fields.status) {
          const statusField = await selectorManager.findElement('salesforce', 'caseStatusSelect');
          if (statusField) {
            await this.selectDropdownOption(statusField, fields.status);
          }
        }
      }
      
      // Save the case
      const saveButton = await selectorManager.findElement('salesforce', 'saveButton');
      if (!saveButton) {
        throw new Error('Save button not found');
      }
      
      saveButton.click();
      
      // Wait for case to be saved
      await this.waitForTimeout(3000);
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'create_case',
          message: 'Case created successfully'
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to create case: ${error.message}`);
    }
  }

  /**
   * Update an existing case
   */
  async updateCase(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.parameters?.caseId) {
        throw new Error('Case ID is required for update operation');
      }
      
      // Navigate to case if not already on case page
      if (!window.location.href.includes(step.parameters.caseId)) {
        await this.navigateToCase(step.parameters.caseId);
      }
      
      // Click Edit button
      const editButton = await selectorManager.findElement('salesforce', 'editButton');
      if (!editButton) {
        throw new Error('Edit button not found');
      }
      
      editButton.click();
      await this.waitForTimeout(1000);
      
      // Update fields if provided
      const fields = step.parameters;
      
      if (fields.status) {
        const statusField = await selectorManager.findElement('salesforce', 'caseStatusSelect');
        if (statusField) {
          await this.selectDropdownOption(statusField, fields.status);
        }
      }
      
      if (fields.priority) {
        const priorityField = await selectorManager.findElement('salesforce', 'casePrioritySelect');
        if (priorityField) {
          await this.selectDropdownOption(priorityField, fields.priority);
        }
      }
      
      if (fields.description) {
        const descriptionField = await selectorManager.findElement('salesforce', 'caseDescriptionTextarea');
        if (descriptionField) {
          await this.fillInputField(descriptionField, fields.description);
        }
      }
      
      if (fields.subject) {
        const subjectField = await selectorManager.findElement('salesforce', 'caseSubjectInput');
        if (subjectField) {
          await this.fillInputField(subjectField, fields.subject);
        }
      }
      
      // Save changes
      const saveButton = await selectorManager.findElement('salesforce', 'saveButton');
      if (!saveButton) {
        throw new Error('Save button not found');
      }
      
      saveButton.click();
      await this.waitForTimeout(2000);
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'update_case',
          caseId: step.parameters.caseId,
          message: 'Case updated successfully'
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to update case: ${error.message}`);
    }
  }

  /**
   * Search for records in Salesforce
   */
  async searchRecords(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.parameters?.query) {
        throw new Error('Search query is required');
      }
      
      // Find search box
      const searchBox = await selectorManager.findElement('salesforce', 'globalSearchInput');
      if (!searchBox) {
        throw new Error('Global search input not found');
      }
      
      // Clear and fill search query
      searchBox.click();
      searchBox.value = '';
      await this.fillInputField(searchBox, step.parameters.query);
      
      // Trigger search
      searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      
      // Wait for search results
      await this.waitForTimeout(2000);
      
      // Look for search results
      const searchResults = await selectorManager.findElement('salesforce', 'searchResultsList');
      
      const results = [];
      if (searchResults) {
        const resultItems = searchResults.querySelectorAll('li, a, .slds-truncate');
        for (let i = 0; i < Math.min(resultItems.length, 10); i++) {
          const item = resultItems[i];
          const text = item.textContent?.trim();
          if (text) {
            results.push({
              index: i,
              text: text,
              element: item.tagName.toLowerCase()
            });
          }
        }
      }
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'search_records',
          query: step.parameters.query,
          results: results,
          count: results.length
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to search records: ${error.message}`);
    }
  }

  /**
   * Navigate Salesforce UI elements
   */
  async navigateSalesforceUI(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.parameters?.target) {
        throw new Error('Navigation target is required');
      }
      
      const target = step.parameters.target;
      let targetElement: Element | null = null;
      
      switch (target) {
        case 'cases':
          targetElement = await selectorManager.findElement('salesforce', 'casesTab');
          break;
        case 'accounts':
          targetElement = await selectorManager.findElement('salesforce', 'accountsTab');
          break;
        case 'contacts':
          targetElement = await selectorManager.findElement('salesforce', 'contactsTab');
          break;
        case 'opportunities':
          targetElement = await selectorManager.findElement('salesforce', 'opportunitiesTab');
          break;
        case 'reports':
          targetElement = await selectorManager.findElement('salesforce', 'reportsTab');
          break;
        case 'dashboard':
          targetElement = await selectorManager.findElement('salesforce', 'dashboardTab');
          break;
        default:
          // Try to find custom navigation item
          targetElement = await selectorManager.findElement('salesforce', 'navItem', { text: target });
      }
      
      if (!targetElement) {
        throw new Error(`Navigation target '${target}' not found`);
      }
      
      targetElement.click();
      await this.waitForTimeout(step.parameters.waitTime || 2000);
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'navigate_salesforce_ui',
          target: target,
          message: `Navigated to ${target} successfully`
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to navigate Salesforce UI: ${error.message}`);
    }
  }

  /**
   * Click an element
   */
  async clickElement(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.selector) {
        throw new Error('Selector is required for click action');
      }
      
      const element = await this.waitForElementSelector(
        step.selector,
        step.timeout_ms || 5000
      );
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }
      
      element.click();
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'click_element',
          selector: step.selector,
          message: 'Element clicked successfully'
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to click element: ${error.message}`);
    }
  }

  /**
   * Fill a field with text
   */
  async fillField(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.selector || !step.parameters?.value) {
        throw new Error('Selector and value are required for fill action');
      }
      
      const element = await this.waitForElementSelector(
        step.selector,
        step.timeout_ms || 5000
      );
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }
      
      await this.fillInputField(element, step.parameters.value);
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'fill_field',
          selector: step.selector,
          value: step.parameters.value,
          message: 'Field filled successfully'
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to fill field: ${error.message}`);
    }
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.selector || !step.parameters?.option) {
        throw new Error('Selector and option are required for select action');
      }
      
      const element = await this.waitForElementSelector(
        step.selector,
        step.timeout_ms || 5000
      );
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }
      
      await this.selectDropdownOption(element, step.parameters.option);
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'select_option',
          selector: step.selector,
          option: step.parameters.option,
          message: 'Option selected successfully'
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to select option: ${error.message}`);
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitForElement(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.selector) {
        throw new Error('Selector is required for wait action');
      }
      
      const element = await this.waitForElementSelector(
        step.selector,
        step.timeout_ms || 10000
      );
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'wait_for_element',
          selector: step.selector,
          found: !!element,
          message: element ? 'Element found' : 'Element not found within timeout'
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to wait for element: ${error.message}`);
    }
  }

  /**
   * Read text from an element
   */
  async readText(step: RPAStep): Promise<RPAResult> {
    const startTime = Date.now();
    
    try {
      if (!step.selector) {
        throw new Error('Selector is required for read action');
      }
      
      const element = await this.waitForElementSelector(
        step.selector,
        step.timeout_ms || 5000
      );
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }
      
      const text = element.textContent || element.innerText || '';
      
      return {
        step_id: step.id,
        status: 'success',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        result: {
          action: 'read_text',
          selector: step.selector,
          text: text.trim(),
          message: 'Text read successfully'
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to read text: ${error.message}`);
    }
  }

  /**
   * Navigate to a specific case
   */
  private async navigateToCase(caseId: string): Promise<void> {
    const currentUrl = window.location.href;
    const caseUrl = `${window.location.origin}/${caseId}`;
    
    if (currentUrl !== caseUrl) {
      window.location.href = caseUrl;
      await this.waitForTimeout(3000);
    }
  }

  /**
   * Wait for element using selector
   */
  private async waitForElementSelector(selector: string, timeout: number): Promise<Element | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(null);
          return;
        }
        
        setTimeout(checkElement, 100);
      };
      
      checkElement();
    });
  }

  /**
   * Fill an input field
   */
  private async fillInputField(element: Element, value: string): Promise<void> {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    
    // Focus and clear
    input.focus();
    input.value = '';
    
    // Trigger input events
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Type the value character by character for better compatibility
    for (let i = 0; i < value.length; i++) {
      input.value += value[i];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await this.waitForTimeout(50);
    }
    
    // Trigger change event
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Select option from dropdown
   */
  private async selectDropdownOption(element: Element, option: string): Promise<void> {
    const select = element as HTMLSelectElement;
    
    // Try to find option by text or value
    let targetOption: HTMLOptionElement | null = null;
    
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      if (opt.text.toLowerCase().includes(option.toLowerCase()) || 
          opt.value.toLowerCase().includes(option.toLowerCase())) {
        targetOption = opt;
        break;
      }
    }
    
    if (!targetOption) {
      throw new Error(`Option '${option}' not found in dropdown`);
    }
    
    select.value = targetOption.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Wait for specified time
   */
  private async waitForTimeout(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get adapter information
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      capabilities: [
        'create_case',
        'update_case',
        'search_records',
        'navigate_salesforce_ui',
        'click_element',
        'fill_field',
        'select_option',
        'wait_for_element',
        'read_text'
      ]
    };
  }
}