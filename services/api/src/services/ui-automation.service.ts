import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface UIAction {
  id: string;
  action_type: 'click' | 'type' | 'select' | 'hover' | 'scroll' | 'navigate' | 'screenshot' | 'wait' | 'extract_text' | 'submit_form';
  selector: string;
  value?: string;
  options?: any;
  timeout?: number;
  wait_condition?: string;
}

export interface UIActionResult {
  action_id: string;
  success: boolean;
  error?: string;
  element?: string;
  value?: string;
  screenshot?: string;
  text?: string;
  metadata?: any;
  execution_time?: number;
  timestamp: string;
}

export interface UIStep {
  step_id: string;
  action: UIAction;
  description: string;
  result?: UIActionResult;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
}

@Injectable()
export class UIAutomationService {
  private executionHistory = new Map<string, UIStep[]>();
  private currentExecution: { sessionId: string; stepIndex: number } | null = null;
  
  constructor() {
    console.log('UIAutomationService: Initialized');
  }

  /**
   * Execute UI steps from cloud decision
   */
  async executeUISteps(sessionId: string, steps: UIAction[]): Promise<UIActionResult[]> {
    const results: UIActionResult[] = [];
    const executionId = uuidv4();
    
    this.currentExecution = {
      sessionId,
      stepIndex: 0,
      stepCount: steps.length
    };

    console.log(`[UIAutomation] Executing ${steps.length} UI steps for session ${sessionId}`);

    // Initialize page context
    await this.initializePage();

    try {
      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        this.currentExecution.stepIndex = i;
        const step: UIStep = {
          step_id: uuidv4(),
          action: steps[i],
          description: this.getActionDescription(steps[i]),
          status: 'executing',
          started_at: new Date().toISOString()
        };

        const result = await this.executeStep(step, i, steps.length);
        step.result = result;
        step.completed_at = new Date().toISOString();
        step.status = result.success ? 'completed' : 'failed';

        results.push(result);

        if (!result.success) {
          console.error(`[UIAutomation] Step ${i + 1} failed: ${result.error}`);
          // Stop execution on failure
          break;
        }

        console.log(`[UIAutomation] Step ${i + 1}/${steps.length} completed`);
      }

      // Update execution status in session context
      this.currentExecution = null;

      const finalResult = {
        action_id: executionId,
        results,
        summary: {
          total_steps: steps.length,
          successful_steps: results.filter(r => r.success).length,
          failed_steps: results.filter(r => !r.success).length,
          execution_time: Date.now() - new Date().getTime()
        },
        timestamp: new Date().toISOString()
      };

      // Persist UI execution results
      await this.persistUIExecution(sessionId, finalResult);

      console.log(`[UIAutomation] UI execution completed: ${finalResult.summary.successful_steps}/${finalResult.summary.total_steps} steps successful`);
      
      return finalResult;

    } catch (error) {
      console.error('[UIAutomation] UI execution failed:', error);
      
      const errorResult: UIActionResult = {
        action_id: executionId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      return {
        action_id: executionId,
        results: [errorResult],
        summary: {
          total_steps: steps.length,
          successful_steps: 0,
          failed_steps: steps.length,
          execution_time: 0
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Initialize page context for automation
   */
  private async initializePage(): Promise<void> {
    try {
      // Wait for page to be ready
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            setTimeout(resolve, 100);
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize page context:', error);
    }
  }

  /**
   * Execute individual UI step
   */
  private async executeStep(step: UIAction, stepIndex: number, totalSteps: number): Promise<UIActionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[UIAutomation] Executing step ${stepIndex + 1}: ${this.getActionDescription(step)}`);
      
      switch (step.action_type) {
        case 'click':
          return await this.executeClick(step);
        case 'type':
          return await this.executeType(step);
        case 'select':
          return await this.executeSelect(step);
        case 'hover':
          return await this.executeHover(step);
        case 'scroll':
          return await this.executeScroll(step);
        case 'navigate':
          return await this.executeNavigate(step);
        case 'screenshot':
          return await this.executeScreenshot(step);
        case 'wait':
          return await this.executeWait(step);
        case 'extract_text':
          return await this.executeExtractText(step);
        case 'submit_form':
          return await this.executeSubmitForm(step);
        default:
          throw new Error(`Unsupported action type: ${step.action_type}`);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        execution_time
      };
    }
  }

  /**
   * Execute click action
   */
  private async executeClick(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      // Check if element is visible and clickable
      if (!this.isElementVisible(element)) {
        throw new Error(`Element not visible: ${step.selector}`);
      }

      // Scroll element into view if needed
      await this.scrollIntoView(element);

      // Perform click
      element.click();

      // Wait for any navigation or page changes
      await this.waitForPageStability(1000);

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute type action
   */
  private async executeType(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      element.focus();
      
      const text = step.value || '';
      
      if (element instanceof HTMLInputElement) {
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // For contenteditable elements
        element.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }

      await this.waitForPageStability(500);

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        element: step.selector,
        value: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute select action
   */
  private async executeSelect(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      element.selected = true;
      
      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute hover action
   */
  private async executeHover(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      // Scroll element into view
      await this.scrollIntoView(element);

      // Simulate hover
      element.dispatchEvent(new Event('mouseover', { bubbles: true }));
      
      // Wait for hover effects
      await this.waitForPageStability(500);

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute scroll action
   */
  private async executeScroll(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      const scrollOptions = step.options || {};
      const direction = scrollOptions.direction || 'down';
      const amount = scrollOptions.amount || 500;

      // Execute scroll
      switch (direction) {
        case 'up':
          element.scrollTop -= amount;
          break;
        case 'down':
          element.scrollTop += amount;
          break;
        case 'left':
          element.scrollLeft -= amount;
          break;
        case 'right':
          element.scrollLeft += amount;
          break;
        case 'top':
          element.scrollTop = 0;
          break;
        case 'bottom':
          element.scrollTop = element.scrollHeight - element.clientHeight;
          break;
      }

      await this.waitForPageStability(1000);

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute navigation action
   */
  private async executeNavigate(step: UIAction): Promise<UIActionResult> {
    try {
      const url = step.value || step.options?.url;
      
      if (!url) {
        throw new Error('No URL provided for navigation');
      }

      // Navigate to new URL
      window.location.href = url;

      // Wait for page to load
      await this.waitForPageLoad(step.timeout || 5000);

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        value: url,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute screenshot action
   */
  private async executeScreenshot(step: UIAction): Promise<UIActionResult> {
    try {
      // Wait for page to be ready
      await this.waitForPageStability(1000);

      // Capture screenshot
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get device pixel ratio for high-quality screenshots
      const dpr = window.devicePixelRatio || 1;
      
      // Set canvas size
      const width = window.innerWidth * dpr;
      const height = window.innerHeight * dpr;
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the page
      ctx.scale(dpr, dpr);
      ctx.drawWindow(window, 0, 0, width, height);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        screenshot: dataUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute wait action
   */
  private async executeWait(step: UIAction): Promise<UIActionResult> {
    try {
      const condition = step.wait_condition;
      const timeout = step.timeout || 5000;
      
      if (!condition) {
        throw new Error('No wait condition specified');
      }

      const startTime = Date.now();
      
      // Wait for condition to be met
      await this.waitForCondition(condition, timeout);
      
      const executionTime = Date.now() - startTime;

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        execution_time,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute extract text action
   */
  private async executeExtractText(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);
      
      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      const text = element.textContent || element.value || '';
      
      if (!text) {
        throw new Error(`No text content found in element: ${step.selector}`);
      }

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute submit form action
   */
  private async executeSubmitForm(step: UIAction): Promise<UIActionResult> {
    try {
      const form = await this.findParentForm(step.selector);
      const submitButton = await this.findSubmitButton(form);
      
      if (!form || !submitButton) {
        throw new Error('Form or submit button not found');
      }

      // Fill form fields if provided
      if (step.value) {
        await this.fillFormField(form, step.selector, step.value);
      }

      // Submit form
      submitButton.click();
      
      // Wait for form submission
      await this.waitForPageStability(2000);

      return {
        action_id: step.step_id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        action_id: step.step_id || uuidv4(),
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Helper methods for element interaction
   */
  private async waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        }
      };

      const checkInterval = setInterval(checkElement, 100);
      
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Element not found within ${timeout}ms: ${selector}`));
      }, timeout);

      // Check immediately
      checkElement();
      
      // Clear timeout if found
      checkElement = (element) => {
        if (element) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
        }
      };
    });
  }

  private async scrollIntoView(element: Element): Promise<void> {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    await this.waitForPageStability(1000);
  }

  private async waitForPageStability(timeout: number = 1000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, timeout));
  }

  private async waitForPageLoad(timeout: number = 5000): Promise<void> {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      }
      const checkReady = () => {
        if (document.readyState === 'complete') {
          resolve();
        }
      };
      document.addEventListener('readystatechange', checkReady);
      setTimeout(() => reject(new Error('Page load timeout')), timeout);
    });
  }

  private async waitForCondition(condition: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkCondition = () => {
        if (this.evaluateCondition(condition)) {
          resolve();
        }
      };
      
      const checkInterval = setInterval(checkCondition, 100);
      
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Condition not met within ${timeout}ms: ${condition}`));
      }, timeout);
      
      // Check immediately
      checkCondition();
    });
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Simple condition evaluation (can be extended)
      return eval(condition);
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  private async findParentForm(selector: string): Promise<HTMLFormElement | null> {
    let element = document.querySelector(selector) as HTMLElement;
    
    while (element && element.tagName !== 'FORM') {
      element = element.parentElement as HTMLElement;
    }
    
    return element as HTMLFormElement;
  }

  private async findSubmitButton(form: HTMLFormElement): Promise<HTMLButtonElement | null> {
    const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    
    return buttons.length > 0 ? buttons[0] : null;
  }

  private async fillFormField(form: HTMLFormElement, fieldName: string, value: string): Promise<void> {
    const input = form.querySelector(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);
    
    if (input) {
      input.focus();
      input.value = value;
      
      // Trigger change events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && 
           rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
  }

  /**
   * Get description of action for logging
   */
  private getActionDescription(action: UIAction): string {
    const descriptions = {
      click: `Click element: ${action.selector}`,
      type: `Type text: ${action.value || ''} in ${action.selector}`,
      select: `Select element: ${action.selector}`,
      hover: `Hover over element: ${action.selector}`,
      scroll: `Scroll ${action.options?.direction || 'down'} by ${action.options?.amount || 500}px`,
      navigate: `Navigate to: ${action.value || action.options?.url}`,
      screenshot: `Take screenshot of: ${action.selector}`,
      wait: `Wait for condition: ${action.wait_condition}`,
      extract_text: `Extract text from: ${action.selector}`,
      submit_form: `Submit form: ${action.selector}`
    };
    
    return descriptions[action.action_type] || `Unknown action: ${action.action_type}`;
  }

  /**
   * Persist UI execution results
   */
  private async persistUIExecution(sessionId: string, result: any): Promise<void> {
    try {
      // Store execution history (would go to database in production)
      this.executionHistory.set(sessionId, {
        sessionId,
        result,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[UIAutomation] UI execution persisted for session ${sessionId}`);
    } catch (error) {
      console.error('Failed to persist UI execution:', error);
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(sessionId: string): any[] {
    return Array.from(this.executionHistory.get(sessionId) || []);
  }
}