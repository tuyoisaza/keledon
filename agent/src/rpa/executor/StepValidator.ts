/**
 * Step Validator
 * 
 * Provides pre and post-condition validation for RPA steps
 * with support for custom validation rules and evidence collection.
 */

import { RPAStep, RPAResult } from '../../../contracts/v1';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  evidence?: any;
}

export interface ValidationRule {
  name: string;
  validate: (context: ValidationContext) => Promise<boolean>;
  message: string;
}

export interface ValidationContext {
  step: RPAStep;
  phase: 'pre' | 'post';
  result?: RPAResult;
  element?: Element;
}

export class StepValidator {
  private validationRules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  async validate(
    step: RPAStep, 
    phase: 'pre' | 'post', 
    result?: RPAResult
  ): Promise<ValidationResult> {
    const context: ValidationContext = {
      step,
      phase,
      result,
      element: await this.findElement(step.selector)
    };

    const errors: string[] = [];
    
    // Get validation rules for this step type and phase
    const rules = this.getRules(step.action, phase);
    
    // Execute each validation rule
    for (const rule of rules) {
      try {
        const isValid = await rule.validate(context);
        if (!isValid) {
          errors.push(rule.message);
        }
      } catch (error) {
        errors.push(`Validation rule '${rule.name}' failed: ${(error as Error).message}`);
      }
    }

    // Check step-specific post-conditions
    if (phase === 'post' && step.post_condition) {
      const postConditionResult = await this.validatePostCondition(step, context);
      if (!postConditionResult.valid) {
        errors.push(...postConditionResult.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      evidence: context
    };
  }

  private async findElement(selector: string): Promise<Element | null> {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  private getRules(action: string, phase: 'pre' | 'post'): ValidationRule[] {
    const key = `${action}_${phase}`;
    return this.validationRules.get(key) || [];
  }

  private async validatePostCondition(step: RPAStep, context: ValidationContext): Promise<ValidationResult> {
    const { post_condition } = step;
    const errors: string[] = [];

    if (!post_condition) {
      return { valid: true, errors: [] };
    }

    switch (post_condition.type) {
      case 'element_exists':
        const element = document.querySelector(post_condition.selector);
        if (!element) {
          errors.push(`Required element not found: ${post_condition.selector}`);
        }
        break;

      case 'element_visible':
        const visibleEl = document.querySelector(post_condition.selector);
        if (!visibleEl || visibleEl.getClientRects().length === 0) {
          errors.push(`Element not visible: ${post_condition.selector}`);
        }
        break;

      case 'element_hidden':
        const hiddenEl = document.querySelector(post_condition.selector);
        if (hiddenEl && hiddenEl.getClientRects().length > 0) {
          errors.push(`Element should be hidden: ${post_condition.selector}`);
        }
        break;

      case 'field_contains':
        const fieldEl = document.querySelector(post_condition.selector);
        if (!fieldEl || !fieldEl.textContent?.includes(post_condition.value || '')) {
          errors.push(`Field does not contain expected value: ${post_condition.value}`);
        }
        break;

      case 'field_equals':
        const inputEl = document.querySelector(post_condition.selector) as HTMLInputElement;
        if (!inputEl || inputEl.value !== post_condition.value) {
          errors.push(`Field value does not match: expected '${post_condition.value}', got '${inputEl?.value}'`);
        }
        break;

      case 'url_contains':
        if (!window.location.href.includes(post_condition.value || '')) {
          errors.push(`URL does not contain expected value: ${post_condition.value}`);
        }
        break;

      case 'url_equals':
        if (window.location.href !== post_condition.value) {
          errors.push(`URL does not match: expected '${post_condition.value}', got '${window.location.href}'`);
        }
        break;

      case 'custom_js':
        try {
          // Execute custom JavaScript validation
          const customValidation = new Function('document', 'window', post_condition.expression || '');
          const result = customValidation(document, window);
          if (!result) {
            errors.push(`Custom validation failed: ${post_condition.expression}`);
          }
        } catch (error) {
          errors.push(`Custom validation error: ${(error as Error).message}`);
        }
        break;

      default:
        errors.push(`Unknown post-condition type: ${post_condition.type}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private initializeDefaultRules(): void {
    // Pre-execution validation rules
    this.addRule('click_pre', {
      name: 'element_exists',
      validate: async (ctx) => ctx.element !== null,
      message: 'Target element must exist before clicking'
    });

    this.addRule('click_pre', {
      name: 'element_clickable',
      validate: async (ctx) => {
        const el = ctx.element;
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      message: 'Target element must be visible and clickable'
    });

    this.addRule('fill_field_pre', {
      name: 'input_element_exists',
      validate: async (ctx) => {
        const el = ctx.element;
        if (!el) return false;
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      },
      message: 'Target must be an input element for filling'
    });

    this.addRule('fill_field_pre', {
      name: 'field_writable',
      validate: async (ctx) => {
        const el = ctx.element as HTMLInputElement;
        if (!el) return false;
        return !el.disabled && !el.readOnly;
      },
      message: 'Target input field must be writable'
    });

    this.addRule('navigate_pre', {
      name: 'valid_url',
      validate: async (ctx) => {
        try {
          new URL(ctx.step.value || '');
          return true;
        } catch {
          return false;
        }
      },
      message: 'Must provide a valid URL for navigation'
    });

    this.addRule('select_pre', {
      name: 'select_element_exists',
      validate: async (ctx) => {
        const el = ctx.element;
        if (!el) return false;
        return el.tagName === 'SELECT';
      },
      message: 'Target must be a select element for selection'
    });

    // Post-execution validation rules
    this.addRule('fill_field_post', {
      name: 'value_applied',
      validate: async (ctx) => {
        const el = ctx.element as HTMLInputElement;
        if (!el) return false;
        return el.value === (ctx.step.value || '');
      },
      message: 'Field value was not successfully applied'
    });

    this.addRule('navigate_post', {
      name: 'navigation_completed',
      validate: async (ctx) => {
        // Give some time for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        return document.readyState === 'complete';
      },
      message: 'Page navigation did not complete successfully'
    });
  }

  private addRule(key: string, rule: ValidationRule): void {
    if (!this.validationRules.has(key)) {
      this.validationRules.set(key, []);
    }
    this.validationRules.get(key)!.push(rule);
  }

  // Allow adding custom validation rules at runtime
  public addCustomRule(
    action: string, 
    phase: 'pre' | 'post', 
    rule: ValidationRule
  ): void {
    const key = `${action}_${phase}`;
    this.addRule(key, rule);
  }

  // Get all available validation rules
  public getAvailableRules(): string[] {
    return Array.from(this.validationRules.keys());
  }

  // Clear all validation rules (useful for testing)
  public clearRules(): void {
    this.validationRules.clear();
    this.initializeDefaultRules();
  }
}