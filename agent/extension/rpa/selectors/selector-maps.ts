/**
 * Selector Maps and Fallbacks
 * Provides reliable element selection with multiple fallback strategies
 */

export interface SelectorMap {
  primary: string;
  fallbacks: string[];
  attributes?: Record<string, string>;
  text?: string;
  index?: number;
}

export interface DomainSelectors {
  [domain: string]: {
    [elementName: string]: SelectorMap;
  };
}

export class SelectorManager {
  private domainSelectors: DomainSelectors;
  private fallbackStrategies: string[];

  constructor() {
    this.domainSelectors = this.initializeDomainSelectors();
    this.fallbackStrategies = [
      'data-test',
      'data-testid',
      'aria-label',
      'title',
      'class',
      'id',
      'text-content',
      'xpath'
    ];
  }

  /**
   * Initialize domain-specific selector maps
   */
  private initializeDomainSelectors(): DomainSelectors {
    return {
      genesys: {
        interactionTab: {
          primary: '[data-test="interaction-tab"]',
          fallbacks: [
            '.interaction-tab',
            '[role="tab"][aria-label*="interaction"]',
            '.cx-interaction-tab'
          ]
        },
        acceptButton: {
          primary: '[data-test="accept-interaction"]',
          fallbacks: [
            '.accept-button',
            '[aria-label*="accept"]',
            'button:contains("Accept")',
            '.btn-accept'
          ]
        },
        rejectButton: {
          primary: '[data-test="reject-interaction"]',
          fallbacks: [
            '.reject-button',
            '[aria-label*="reject"]',
            'button:contains("Reject")',
            '.btn-reject'
          ]
        },
        endButton: {
          primary: '[data-test="end-interaction"]',
          fallbacks: [
            '.end-button',
            '[aria-label*="end"]',
            'button:contains("End")',
            '.btn-end'
          ]
        },
        holdButton: {
          primary: '[data-test="hold-interaction"]',
          fallbacks: [
            '.hold-button',
            '[aria-label*="hold"]',
            'button:contains("Hold")',
            '.btn-hold'
          ]
        },
        muteButton: {
          primary: '[data-test="mute-interaction"]',
          fallbacks: [
            '.mute-button',
            '[aria-label*="mute"]',
            'button:contains("Mute")',
            '.btn-mute'
          ]
        },
        noteField: {
          primary: '[data-test="interaction-notes"] textarea',
          fallbacks: [
            '.notes-field textarea',
            'textarea[placeholder*="notes"]',
            'textarea[aria-label*="notes"]',
            '.interaction-notes textarea'
          ]
        },
        wrapupCode: {
          primary: '[data-test="wrapup-code"] select',
          fallbacks: [
            '.wrapup-code select',
            'select[aria-label*="wrap"]',
            'select[name="wrapupCode"]',
            '.wrap-up-code select'
          ]
        },
        customerInfo: {
          primary: '[data-test="customer-info"]',
          fallbacks: [
            '.customer-info',
            '.customer-details',
            '[data-section="customer"]',
            '.cx-customer-info'
          ]
        },
        dialpadButton: {
          primary: '[data-test="dialpad"]',
          fallbacks: [
            '.dialpad-button',
            '[aria-label*="dialpad"]',
            'button:contains("Dialpad")',
            '.btn-dialpad'
          ]
        }
      },
      salesforce: {
        caseTab: {
          primary: '[data-test="case-tab"]',
          fallbacks: [
            '.caseTab',
            'a[title*="Case"]',
            '[data-label="Case"]',
            '.slds-tabs__item a[href*="case"]'
          ]
        },
        newCaseButton: {
          primary: '[data-test="new-case"]',
          fallbacks: [
            '.btn-new',
            'button[title*="New Case"]',
            'a:contains("New Case")',
            '.slds-button:contains("New")'
          ]
        },
        caseSubject: {
          primary: '[data-test="case-subject"]',
          fallbacks: [
            'input[name="Subject"]',
            'input[aria-label*="Subject"]',
            '.subject-input',
            '.slds-input[name*="subject"]'
          ]
        },
        caseDescription: {
          primary: '[data-test="case-description"] textarea',
          fallbacks: [
            'textarea[name="Description"]',
            'textarea[aria-label*="Description"]',
            '.description-textarea',
            '.slds-textarea[name*="description"]'
          ]
        },
        caseStatus: {
          primary: '[data-test="case-status"] select',
          fallbacks: [
            'select[name="Status"]',
            'select[aria-label*="Status"]',
            '.status-select',
            '.slds-select[name*="status"]'
          ]
        },
        casePriority: {
          primary: '[data-test="case-priority"] select',
          fallbacks: [
            'select[name="Priority"]',
            'select[aria-label*="Priority"]',
            '.priority-select',
            '.slds-select[name*="priority"]'
          ]
        },
        saveButton: {
          primary: '[data-test="save"]',
          fallbacks: [
            '.btn-save',
            'button[title*="Save"]',
            'button:contains("Save")',
            '.slds-button:contains("Save")'
          ]
        },
        cancelButton: {
          primary: '[data-test="cancel"]',
          fallbacks: [
            '.btn-cancel',
            'button[title*="Cancel"]',
            'button:contains("Cancel")',
            '.slds-button:contains("Cancel")'
          ]
        },
        searchField: {
          primary: '[data-test="search"] input',
          fallbacks: [
            '.search-input',
            'input[placeholder*="Search"]',
            'input[aria-label*="Search"]',
            '.slds-input[type="search"]'
          ]
        },
        listView: {
          primary: '[data-test="list-view"]',
          fallbacks: [
            '.list-view',
            '.slds-table',
            'table[data-type="list"]',
            '.forceList'
          ]
        }
      },
      generic: {
        button: {
          primary: 'button',
          fallbacks: [
            'input[type="button"]',
            'input[type="submit"]',
            '[role="button"]',
            '.btn',
            '.button'
          ]
        },
        input: {
          primary: 'input',
          fallbacks: [
            'textarea',
            '[contenteditable="true"]',
            '.input',
            '.form-control'
          ]
        },
        select: {
          primary: 'select',
          fallbacks: [
            '[role="combobox"]',
            '.select',
            '.form-select',
            '.dropdown'
          ]
        },
        link: {
          primary: 'a',
          fallbacks: [
            '[role="link"]',
            '.link',
            '.hyperlink',
            'button[onclick*="window.location"]'
          ]
        },
        modal: {
          primary: '.modal',
          fallbacks: [
            '.dialog',
            '.popup',
            '[role="dialog"]',
            '.overlay'
          ]
        },
        table: {
          primary: 'table',
          fallbacks: [
            '.table',
            '.grid',
            '[role="table"]',
            '.slds-table'
          ]
        },
        loading: {
          primary: '.loading',
          fallbacks: [
            '.spinner',
            '.loader',
            '[aria-busy="true"]',
            '.slds-spinner'
          ]
        },
        error: {
          primary: '.error',
          fallbacks: [
            '.error-message',
            '[role="alert"]',
            '.alert-danger',
            '.slds-notify_error'
          ]
        },
        success: {
          primary: '.success',
          fallbacks: [
            '.success-message',
            '.alert-success',
            '[role="status"]',
            '.slds-notify_success'
          ]
        }
      }
    };
  }

  /**
   * Get selector map for domain and element
   */
  getSelectorMap(domain: string, elementName: string): SelectorMap | null {
    const domainMap = this.domainSelectors[domain];
    if (!domainMap) {
      // Fall back to generic selectors
      return this.domainSelectors.generic[elementName] || null;
    }
    return domainMap[elementName] || null;
  }

  /**
   * Find element using selector map with fallbacks
   */
  async findElement(domain: string, elementName: string, context: Document | Element = document): Promise<Element | null> {
    const selectorMap = this.getSelectorMap(domain, elementName);
    if (!selectorMap) {
      console.warn(`No selector map found for ${domain}:${elementName}`);
      return null;
    }

    // Try primary selector first
    let element = context.querySelector(selectorMap.primary);
    if (element && this.isElementVisible(element)) {
      return element;
    }

    // Try fallback selectors
    for (const fallback of selectorMap.fallbacks) {
      element = context.querySelector(fallback);
      if (element && this.isElementVisible(element)) {
        console.log(`Used fallback selector for ${domain}:${elementName} - ${fallback}`);
        return element;
      }
    }

    // Try attribute-based selection
    if (selectorMap.attributes) {
      element = this.findByAttributes(selectorMap.attributes, context);
      if (element && this.isElementVisible(element)) {
        return element;
      }
    }

    // Try text content matching
    if (selectorMap.text) {
      element = this.findByText(selectorMap.text, context);
      if (element && this.isElementVisible(element)) {
        return element;
      }
    }

    // Try index-based selection
    if (selectorMap.index !== undefined) {
      const elements = context.querySelectorAll(selectorMap.primary);
      if (elements.length > selectorMap.index) {
        return elements[selectorMap.index];
      }
    }

    return null;
  }

  /**
   * Find all elements matching selector map
   */
  async findAllElements(domain: string, elementName: string, context: Document | Element = document): Promise<Element[]> {
    const selectorMap = this.getSelectorMap(domain, elementName);
    if (!selectorMap) {
      return [];
    }

    const elements: Element[] = [];

    // Try primary selector
    const primaryElements = context.querySelectorAll(selectorMap.primary);
    elements.push(...Array.from(primaryElements).filter(el => this.isElementVisible(el)));

    // Try fallback selectors if no elements found
    if (elements.length === 0) {
      for (const fallback of selectorMap.fallbacks) {
        const fallbackElements = context.querySelectorAll(fallback);
        const visibleElements = Array.from(fallbackElements).filter(el => this.isElementVisible(el));
        if (visibleElements.length > 0) {
          elements.push(...visibleElements);
          console.log(`Used fallback selector for ${domain}:${elementName} - ${fallback}`);
          break;
        }
      }
    }

    return elements;
  }

  /**
   * Find element by attributes
   */
  private findByAttributes(attributes: Record<string, string>, context: Document | Element): Element | null {
    const selector = Object.entries(attributes)
      .map(([key, value]) => `[${key}="${value}"]`)
      .join('');
    
    const element = context.querySelector(selector);
    return element && this.isElementVisible(element) ? element : null;
  }

  /**
   * Find element by text content
   */
  private findByText(text: string, context: Document | Element): Element | null {
    const xpath = `//*[contains(text(), "${text}")]`;
    const result = document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const element = result.singleNodeValue as Element;
    
    return element && this.isElementVisible(element) ? element : null;
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Add custom selector map
   */
  addSelectorMap(domain: string, elementName: string, selectorMap: SelectorMap): void {
    if (!this.domainSelectors[domain]) {
      this.domainSelectors[domain] = {};
    }
    this.domainSelectors[domain][elementName] = selectorMap;
  }

  /**
   * Get all available domains
   */
  getAvailableDomains(): string[] {
    return Object.keys(this.domainSelectors);
  }

  /**
   * Get all available elements for domain
   */
  getAvailableElements(domain: string): string[] {
    const domainMap = this.domainSelectors[domain];
    return domainMap ? Object.keys(domainMap) : [];
  }

  /**
   * Validate selector map
   */
  validateSelectorMap(selectorMap: SelectorMap): boolean {
    return !!(selectorMap.primary && 
             Array.isArray(selectorMap.fallbacks) && 
             selectorMap.fallbacks.length > 0);
  }

  /**
   * Generate XPath from element
   */
  generateXPath(element: Element): string {
    const components: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let component = current.tagName.toLowerCase();
      
      if (current.id) {
        component += `[@id="${current.id}"]`;
        components.unshift(component);
        break;
      }

      let sibling = current;
      let siblingIndex = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.tagName === current.tagName) {
          siblingIndex++;
        }
      }

      if (siblingIndex > 1) {
        component += `[${siblingIndex}]`;
      }

      components.unshift(component);
      current = current.parentElement;
    }

    return '/' + components.join('/');
  }

  /**
   * Create dynamic selector based on element properties
   */
  createDynamicSelector(element: Element): SelectorMap {
    const primary = this.generateXPath(element);
    const fallbacks: string[] = [];

    // Add ID-based fallback
    if (element.id) {
      fallbacks.unshift(`#${element.id}`);
    }

    // Add class-based fallback
    if (element.className) {
      const classes = element.className.split(' ').filter(cls => cls.trim());
      if (classes.length > 0) {
        fallbacks.unshift(`.${classes.join('.')}`);
      }
    }

    // Add attribute-based fallbacks
    const attributes = ['data-test', 'data-testid', 'aria-label', 'title', 'name'];
    for (const attr of attributes) {
      const value = element.getAttribute(attr);
      if (value) {
        fallbacks.unshift(`[${attr}="${value}"]`);
      }
    }

    return {
      primary,
      fallbacks: fallbacks.slice(0, 5) // Limit to 5 fallbacks
    };
  }
}

// Export singleton instance
export const selectorManager = new SelectorManager();