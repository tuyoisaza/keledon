import type { Flow, FlowStep } from './flow-recorder';

export interface ExecutionResult {
  success: boolean;
  stepId: string;
  stepType: string;
  duration: number;
  data?: any;
  error?: string;
}

export interface FlowExecutionContext {
  variables: Record<string, any>;
  logs: ExecutionResult[];
  startTime: number;
}

export class FlowExecutor {
  private context: FlowExecutionContext = {
    variables: {},
    logs: [],
    startTime: 0,
  };

  async execute(flow: Flow, initialVariables?: Record<string, any>): Promise<{
    success: boolean;
    extractedData: Record<string, any>;
    executionLog: ExecutionResult[];
    totalDuration: number;
  }> {
    this.context = {
      variables: initialVariables || {},
      logs: [],
      startTime: Date.now(),
    };

    let stepIndex = 0;
    let success = true;

    while (stepIndex < flow.steps.length && success) {
      const step = flow.steps[stepIndex];

      if (step.type === 'decision' && step.condition) {
        const shouldSkip = !this.evaluateCondition(step.condition, this.context.variables);
        if (shouldSkip) {
          this.context.logs.push({
            success: true,
            stepId: step.id,
            stepType: step.type,
            duration: 0,
            data: { skipped: true },
          });
          stepIndex++;
          continue;
        }
      }

      const result = await this.executeStep(step);
      this.context.logs.push(result);

      if (result.data && step.extract) {
        this.context.variables[step.extract] = result.data;
      }

      if (!result.success && !step.optional) {
        success = false;
        break;
      }

      if (result.success && step.nextStepId) {
        const nextIndex = flow.steps.findIndex(s => s.id === step.nextStepId);
        if (nextIndex >= 0) {
          stepIndex = nextIndex;
          continue;
        }
      }

      stepIndex++;
    }

    return {
      success,
      extractedData: this.context.variables,
      executionLog: this.context.logs,
      totalDuration: Date.now() - this.context.startTime,
    };
  }

  private async executeStep(step: FlowStep): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      switch (step.type) {
        case 'navigate':
          return await this.executeNavigate(step);
        case 'click':
          return await this.executeClick(step);
        case 'input':
          return await this.executeInput(step);
        case 'read':
          return await this.executeRead(step);
        case 'wait':
          return await this.executeWait(step);
        case 'submit':
          return await this.executeSubmit(step);
        case 'speak':
          return await this.executeSpeak(step);
        case 'decision':
          return await this.executeDecision(step);
        default:
          return {
            success: false,
            stepId: step.id,
            stepType: step.type,
            duration: Date.now() - startTime,
            error: `Unknown step type: ${step.type}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        stepId: step.id,
        stepType: step.type,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async executeNavigate(step: FlowStep): Promise<ExecutionResult> {
    const url = this.interpolate(step.value || '', this.context.variables);
    
    window.location.href = url;
    
    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: Date.now() - Date.now(),
      data: { url },
    };
  }

  private async executeClick(step: FlowStep): Promise<ExecutionResult> {
    const element = await this.waitForElement(step.selector, step.timeout);
    
    if (!element) {
      return {
        success: false,
        stepId: step.id,
        stepType: step.type,
        duration: 0,
        error: `Element not found: ${step.selector}`,
      };
    }

    element.click();

    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: 0,
      data: { clicked: step.selector },
    };
  }

  private async executeInput(step: FlowStep): Promise<ExecutionResult> {
    const element = await this.waitForElement(step.selector, step.timeout) as HTMLInputElement;
    
    if (!element) {
      return {
        success: false,
        stepId: step.id,
        stepType: step.type,
        duration: 0,
        error: `Input element not found: ${step.selector}`,
      };
    }

    const value = this.interpolate(step.value || '', this.context.variables);
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: 0,
      data: { input: value },
    };
  }

  private async executeRead(step: FlowStep): Promise<ExecutionResult> {
    const element = await this.waitForElement(step.selector, step.timeout);
    
    if (!element) {
      return {
        success: false,
        stepId: step.id,
        stepType: step.type,
        duration: 0,
        error: `Element not found: ${step.selector}`,
      };
    }

    const text = element.textContent?.trim() || '';
    const data = { extracted: text };

    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: 0,
      data,
    };
  }

  private async executeWait(step: FlowStep): Promise<ExecutionResult> {
    if (step.waitFor) {
      await this.waitForElement(step.waitFor, step.timeout);
    } else {
      await new Promise(resolve => setTimeout(resolve, step.timeout));
    }

    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: step.timeout,
    };
  }

  private async executeSubmit(step: FlowStep): Promise<ExecutionResult> {
    const form = step.selector 
      ? await this.waitForElement(step.selector, step.timeout) as HTMLFormElement
      : await this.findParentForm(step.selector || '');

    if (form) {
      form.submit();
    }

    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: 0,
    };
  }

  private async executeSpeak(step: FlowStep): Promise<ExecutionResult> {
    const text = this.interpolate(step.value || '', this.context.variables);

    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: 0,
      data: { spoken: text },
    };
  }

  private async executeDecision(step: FlowStep): Promise<ExecutionResult> {
    const result = this.evaluateCondition(step.condition || 'true', this.context.variables);

    return {
      success: true,
      stepId: step.id,
      stepType: step.type,
      duration: 0,
      data: { decision: result },
    };
  }

  private async waitForElement(selector: string, timeout = 10000): Promise<HTMLElement | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = this.querySelector(selector);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  }

  private querySelector(selector: string): HTMLElement | null {
    try {
      if (selector.startsWith('#')) {
        return document.getElementById(selector.slice(1));
      }
      if (selector.startsWith('[') && selector.includes('=')) {
        const match = selector.match(/\[([^=]+)="([^"]+)"\]/);
        if (match) {
          return document.querySelector(`[${match[1]}="${match[2]}"]`);
        }
      }
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  private findParentForm(selector: string): HTMLFormElement | null {
    const element = selector ? this.querySelector(selector) : null;
    if (!element) {
      const form = document.querySelector('form');
      return form;
    }
    let current: HTMLElement | null = element;
    while (current) {
      if (current.tagName === 'FORM') {
        return current as HTMLFormElement;
      }
      current = current.parentElement;
    }
    return null;
  }

  private interpolate(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      const func = new Function('context', `with(context) { return ${condition}; }`);
      return !!func(context);
    } catch {
      return false;
    }
  }
}

export const flowExecutor = new FlowExecutor();
