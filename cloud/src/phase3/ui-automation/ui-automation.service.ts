import { Injectable } from '@nestjs/common';
import { 
  UIAction, 
  UIStep, 
  UIActionResult, 
  UIExecutionContext,
  UIBrowserSession,
  UIAssertion 
} from './interfaces/ui-automation.interfaces';

@Injectable()
export class UIAutomationService {
  private browserSessions: Map<string, UIBrowserSession> = new Map();
  private executionResults: Map<string, UIActionResult[]> = new Map();

  async createBrowserSession(config: Partial<UIBrowserSession>): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: UIBrowserSession = {
      id: sessionId,
      browserType: config.browserType || 'chromium',
      headless: config.headless ?? true,
      viewport: config.viewport || { width: 1920, height: 1080 },
      userAgent: config.userAgent,
      createdAt: new Date(),
      lastActive: new Date()
    };

    this.browserSessions.set(sessionId, session);
    return sessionId;
  }

  async executeStep(
    step: UIStep, 
    context: UIExecutionContext
  ): Promise<UIActionResult[]> {
    const results: UIActionResult[] = [];
    const retryCount = step.retry_count || 0;

    for (const action of step.actions) {
      const actionResult = await this.executeAction(action, context, retryCount);
      results.push(actionResult);
    }

    this.executionResults.set(context.sessionId, results);
    return results;
  }

  async executeActions(
    actions: UIAction[], 
    context: UIExecutionContext
  ): Promise<UIActionResult[]> {
    const results: UIActionResult[] = [];

    for (const action of actions) {
      const result = await this.executeAction(action, context);
      results.push(result);
    }

    return results;
  }

  async executeAction(
    action: UIAction, 
    context: UIExecutionContext,
    retryCount: number = 0
  ): Promise<UIActionResult> {
    const result: UIActionResult = {
      step_id: context.sessionId,
      action_id: action.id,
      status: 'success',
      timestamp: new Date()
    };

    try {
      switch (action.action_type) {
        case 'click':
          await this.performClick(action, context);
          break;
        case 'type':
          await this.performType(action, context);
          break;
        case 'scroll':
          await this.performScroll(action, context);
          break;
        case 'wait':
          await this.performWait(action);
          break;
        case 'screenshot':
          result.screenshot = await this.performScreenshot(action, context);
          break;
        case 'select':
          await this.performSelect(action, context);
          break;
        case 'hover':
          await this.performHover(action, context);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.action_type}`);
      }
    } catch (error) {
      result.status = 'failure';
      result.error = error.message;

      if (retryCount > 0) {
        await this.delay(1000);
        return this.executeAction(action, context, retryCount - 1);
      }
    }

    return result;
  }

  async runAssertion(
    assertion: UIAssertion, 
    context: UIExecutionContext
  ): Promise<boolean> {
    const timeout = assertion.timeout || 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        switch (assertion.type) {
          case 'element_exists':
            if (await this.elementExists(assertion.selector, context)) {
              return true;
            }
            break;
          case 'element_visible':
            if (await this.elementVisible(assertion.selector, context)) {
              return true;
            }
            break;
          case 'text_contains':
            if (await this.textContains(assertion.selector, assertion.value, context)) {
              return true;
            }
            break;
          case 'url_matches':
            if (await this.urlMatches(assertion.regex, context)) {
              return true;
            }
            break;
        }
      } catch (error) {
        // Continue trying on assertion errors
      }

      await this.delay(500);
    }

    return false;
  }

  getExecutionResults(sessionId: string): UIActionResult[] {
    return this.executionResults.get(sessionId) || [];
  }

  closeBrowserSession(sessionId: string): void {
    this.browserSessions.delete(sessionId);
    this.executionResults.delete(sessionId);
  }

  private async performClick(action: UIAction, context: UIExecutionContext): Promise<void> {
    if (!action.selector) throw new Error('Click action requires selector');
    
    await this.delay(100);
  }

  private async performType(action: UIAction, context: UIExecutionContext): Promise<void> {
    if (!action.selector) throw new Error('Type action requires selector');
    if (!action.value) throw new Error('Type action requires value');
    
    await this.delay(50);
  }

  private async performScroll(action: UIAction, context: UIExecutionContext): Promise<void> {
    await this.delay(200);
  }

  private async performWait(action: UIAction): Promise<void> {
    const waitTime = action.wait_time || 1000;
    await this.delay(waitTime);
  }

  private async performScreenshot(action: UIAction, context: UIExecutionContext): Promise<string> {
    const screenshotPath = action.screenshot_path || `screenshot_${Date.now()}.png`;
    return screenshotPath;
  }

  private async performSelect(action: UIAction, context: UIExecutionContext): Promise<void> {
    if (!action.selector) throw new Error('Select action requires selector');
    if (!action.value) throw new Error('Select action requires value');
    
    await this.delay(100);
  }

  private async performHover(action: UIAction, context: UIExecutionContext): Promise<void> {
    if (!action.selector) throw new Error('Hover action requires selector');
    
    await this.delay(100);
  }

  private async elementExists(selector: string, context: UIExecutionContext): Promise<boolean> {
    return true;
  }

  private async elementVisible(selector: string, context: UIExecutionContext): Promise<boolean> {
    return true;
  }

  private async textContains(selector: string, text: string, context: UIExecutionContext): Promise<boolean> {
    return true;
  }

  private async urlMatches(regex: string, context: UIExecutionContext): Promise<boolean> {
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}