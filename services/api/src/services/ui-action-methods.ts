import { v4 as uuidv4 } from 'uuid';
import { UIAction, UIActionResult } from './ui-automation.types';
import { UIDomMethods } from './ui-dom-methods';

export class UIActionMethods extends UIDomMethods {
  protected async executeClick(step: UIAction): Promise<UIActionResult> {
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
      const clickable = element as HTMLElement;
      clickable.click?.();

      // Wait for any navigation or page changes
      await this.waitForPageStability(1000);

      return {
        action_id: step.id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute type action
   */
  protected async executeType(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);

      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      const focusable = element as HTMLElement;
      focusable.focus?.();

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
        action_id: step.id || uuidv4(),
        success: true,
        element: step.selector,
        value: text,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute select action
   */
  protected async executeSelect(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);

      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      const optionEl = element as HTMLOptionElement;
      optionEl.selected = true;

      return {
        action_id: step.id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute hover action
   */
  protected async executeHover(step: UIAction): Promise<UIActionResult> {
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
        action_id: step.id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute scroll action
   */
  protected async executeScroll(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);

      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      const scrollOptions = step.options || {};
      const direction = (scrollOptions.direction as string) || 'down';
      const amount = (scrollOptions.amount as number) || 500;

      const scrollable = element as HTMLElement;

      // Execute scroll
      switch (direction) {
        case 'up':
          scrollable.scrollTop -= amount;
          break;
        case 'down':
          scrollable.scrollTop += amount;
          break;
        case 'left':
          scrollable.scrollLeft -= amount;
          break;
        case 'right':
          scrollable.scrollLeft += amount;
          break;
        case 'top':
          scrollable.scrollTop = 0;
          break;
        case 'bottom':
          scrollable.scrollTop =
            scrollable.scrollHeight - scrollable.clientHeight;
          break;
      }

      await this.waitForPageStability(1000);

      return {
        action_id: step.id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute navigation action
   */
  protected async executeNavigate(step: UIAction): Promise<UIActionResult> {
    try {
      const url = step.value || (step.options?.url as string);

      if (!url) {
        throw new Error('No URL provided for navigation');
      }

      // Navigate to new URL
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }

      // Wait for page to load
      await this.waitForPageLoad(step.timeout || 5000);

      return {
        action_id: step.id || uuidv4(),
        success: true,
        value: url,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute screenshot action
   */
  protected async executeScreenshot(step: UIAction): Promise<UIActionResult> {
    try {
      // Wait for page to be ready
      await this.waitForPageStability(1000);

      // Capture screenshot using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Get device pixel ratio for high-quality screenshots
      const dpr = window.devicePixelRatio || 1;

      // Set canvas size
      const width = window.innerWidth * dpr;
      const height = window.innerHeight * dpr;

      canvas.width = width;
      canvas.height = height;

      // Draw the page - note: drawWindow is Firefox-specific
      // This will only work in Firefox environments
      const drawWindow = (
        ctx as CanvasRenderingContext2D & {
          drawWindow?: (
            win: Window,
            x: number,
            y: number,
            w: number,
            h: number,
          ) => void;
        }
      ).drawWindow;
      if (typeof drawWindow !== 'function') {
        throw new Error('Page screenshots are not supported by this browser');
      }
      drawWindow.call(ctx, window, 0, 0, width, height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');

      return {
        action_id: step.id || uuidv4(),
        success: true,
        screenshot: dataUrl,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute wait action
   */
  protected async executeWait(step: UIAction): Promise<UIActionResult> {
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
        action_id: step.id || uuidv4(),
        success: true,
        execution_time: executionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute extract text action
   */
  protected async executeExtractText(step: UIAction): Promise<UIActionResult> {
    try {
      const element = await this.waitForElement(step.selector, step.timeout);

      if (!element) {
        throw new Error(`Element not found: ${step.selector}`);
      }

      const text =
        element.textContent || (element as HTMLInputElement).value || '';

      if (!text) {
        throw new Error(`No text content found in element: ${step.selector}`);
      }

      return {
        action_id: step.id || uuidv4(),
        success: true,
        text,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute submit form action
   */
  protected async executeSubmitForm(step: UIAction): Promise<UIActionResult> {
    try {
      const form = this.findParentForm(step.selector);
      const submitButton = form ? this.findSubmitButton(form) : null;

      if (!form || !submitButton) {
        throw new Error('Form or submit button not found');
      }

      // Fill form fields if provided
      if (step.value) {
        this.fillFormField(form, step.selector, step.value);
      }

      // Submit form
      submitButton.click();

      // Wait for form submission
      await this.waitForPageStability(2000);

      return {
        action_id: step.id || uuidv4(),
        success: true,
        element: step.selector,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        action_id: step.id || uuidv4(),
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Helper methods for element interaction
   */
}
