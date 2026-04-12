import { chromium, Browser, Page, ChromiumBrowser } from 'playwright-core';

export interface CDPBrowserConfig {
  cdpUrl: string;
  timeout?: number;
}

export interface ExecutionContext {
  sessionId: string;
  flowId: string;
  tabId?: string;
  targetUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuredGoal {
  objective: string;
  target_app?: 'salesforce' | 'genesys' | 'web' | 'custom';
  target_url?: string;
  constraints?: {
    max_steps?: number;
    timeout_ms?: number;
    interactive?: boolean;
  };
}

export interface StepResult {
  step_id: string;
  action: string;
  status: 'success' | 'failure' | 'timeout' | 'uncertain';
  timestamp: string;
  duration_ms?: number;
  result?: {
    text?: string;
    attribute?: string;
    element_count?: number;
    url?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  screenshot?: {
    data_url: string;
    width: number;
    height: number;
  };
  evidence?: Record<string, unknown>;
}

export interface ExecutionResult {
  execution_id: string;
  goal: string;
  goal_status: 'achieved' | 'failed' | 'uncertain';
  results: StepResult[];
  summary: {
    total_steps: number;
    successful_steps: number;
    failed_steps: number;
    uncertain_steps: number;
    execution_time_ms: number;
  };
  final_state: {
    url: string;
    title?: string;
    screenshots: string[];
  };
  timestamp: string;
}

export class AutoBrowseExecutor {
  private browser: ChromiumBrowser | null = null;
  private page: Page | null = null;
  private isInitialized = false;
  private isCDPMode = false;

  /**
   * Initialize using CDP (connect to existing Electron Chromium)
   * This is the mode for Electron integration
   */
  async connectOverCDP(config: CDPBrowserConfig): Promise<void> {
    if (this.isInitialized && this.isCDPMode) {
      return;
    }

    try {
      this.browser = await chromium.connectOverCDP(config.cdpUrl, {
        timeout: config.timeout || 30000
      }) as ChromiumBrowser;
      
      this.isInitialized = true;
      this.isCDPMode = true;
      console.log('AutoBrowseExecutor: Connected over CDP');
    } catch (error) {
      console.error('AutoBrowseExecutor: Failed to connect over CDP:', error);
      throw error;
    }
  }

  /**
   * Legacy mode - launch own browser (for standalone service)
   * @deprecated Use connectOverCDP for Electron integration
   */
  async launch(options?: {
    headless?: boolean;
    args?: string[];
  }): Promise<void> {
    if (this.isInitialized && !this.isCDPMode) {
      return;
    }

    this.browser = await chromium.launch({
      headless: options?.headless ?? true,
      args: options?.args ?? ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.isInitialized = true;
    this.isCDPMode = false;
    console.log('AutoBrowseExecutor: Launched browser');
  }

  /**
   * Get or create a page for execution
   */
  async getPage(targetUrl?: string): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    if (this.page) {
      if (targetUrl && targetUrl !== await this.page.url()) {
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      }
      return this.page;
    }

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    this.page = await context.newPage();

    if (targetUrl) {
      await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    }

    return this.page;
  }

  /**
   * Execute structured goal
   */
  async executeGoal(
    goal: StructuredGoal,
    executionContext: ExecutionContext
  ): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      await this.launch();
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const startTime = Date.now();
    const results: StepResult[] = [];
    const screenshots: string[] = [];

    try {
      const page = await this.getPage(goal.target_url || executionContext.targetUrl);

      const plan = this.planExecution(goal);
      
      for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        const stepResult = await this.executeStep(page, step, i, plan.length);
        results.push(stepResult);

        if (stepResult.screenshot?.data_url) {
          screenshots.push(stepResult.screenshot.data_url);
        }

        const shouldStop = this.shouldStopExecution(stepResult, goal);
        if (shouldStop) {
          break;
        }
      }

      const endTime = Date.now();
      const successfulSteps = results.filter(r => r.status === 'success').length;
      const failedSteps = results.filter(r => r.status === 'failure').length;
      const uncertainSteps = results.filter(r => r.status === 'uncertain').length;

      const goalStatus = this.determineGoalStatus(results, goal);

      return {
        execution_id: executionId,
        goal: goal.objective,
        goal_status: goalStatus,
        results,
        summary: {
          total_steps: results.length,
          successful_steps: successfulSteps,
          failed_steps: failedSteps,
          uncertain_steps: uncertainSteps,
          execution_time_ms: endTime - startTime
        },
        final_state: {
          url: page.url(),
          title: await page.title().catch(() => undefined),
          screenshots
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        execution_id: executionId,
        goal: goal.objective,
        goal_status: 'failed',
        results,
        summary: {
          total_steps: results.length,
          successful_steps: results.filter(r => r.status === 'success').length,
          failed_steps: results.length,
          uncertain_steps: 0,
          execution_time_ms: Date.now() - startTime
        },
        final_state: {
          url: this.page?.url() || 'unknown',
          screenshots
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Plan execution based on structured goal
   */
  private planExecution(goal: StructuredGoal): Array<{
    action: string;
    target?: string;
    value?: string;
    description: string;
  }> {
    const app = goal.target_app || 'web';
    const objective = goal.objective.toLowerCase();

    switch (app) {
      case 'salesforce':
        return this.planSalesforce(objective, goal.target_url);
      case 'genesys':
        return this.planGenesys(objective);
      default:
        return this.planGeneric(objective, goal.target_url);
    }
  }

  private planSalesforce(objective: string, targetUrl?: string): Array<{
    action: string;
    target?: string;
    value?: string;
    description: string;
  }> {
    const steps = [];

    if (targetUrl) {
      steps.push({ action: 'navigate', target: targetUrl, description: 'Navigate to target URL' });
    }

    if (objective.includes('case') || objective.includes('caso')) {
      steps.push(
        { action: 'wait_for_selector', target: '[title="Cases"]', description: 'Wait for Cases tab' },
        { action: 'click', target: '[title="Cases"]', description: 'Click Cases tab' },
        { action: 'wait_for_load', description: 'Wait for page load' }
      );

      if (objective.includes('search') || objective.includes('buscar')) {
        steps.push(
          { action: 'wait_for_selector', target: '.forceSearchInput', description: 'Wait for search box' },
          { action: 'read_content', description: 'Read cases list' }
        );
      }
    }

    if (objective.includes('contact') || objective.includes('cliente')) {
      steps.push(
        { action: 'wait_for_selector', target: '[title="Contacts"]', description: 'Wait for Contacts tab' },
        { action: 'click', target: '[title="Contacts"]', description: 'Click Contacts tab' }
      );
    }

    steps.push({ action: 'capture_screenshot', description: 'Capture final state' });

    return steps;
  }

  private planGenesys(objective: string): Array<{
    action: string;
    target?: string;
    value?: string;
    description: string;
  }> {
    return [
      { action: 'wait_for_load', description: 'Wait for Genesys load' },
      { action: 'read_content', description: 'Read current state' },
      { action: 'capture_screenshot', description: 'Capture state' }
    ];
  }

  private planGeneric(objective: string, targetUrl?: string): Array<{
    action: string;
    target?: string;
    value?: string;
    description: string;
  }> {
    const steps = [];

    if (targetUrl) {
      steps.push({ action: 'navigate', target: targetUrl, description: 'Navigate to target' });
    }

    steps.push(
      { action: 'wait_for_load', description: 'Wait for page load' },
      { action: 'read_content', description: 'Read page content' },
      { action: 'capture_screenshot', description: 'Capture current state' }
    );

    return steps;
  }

  private async executeStep(
    page: Page,
    step: { action: string; target?: string; value?: string; description: string },
    index: number,
    total: number
  ): Promise<StepResult> {
    const stepId = `step-${index + 1}`;
    const startTime = Date.now();

    try {
      let result: StepResult;

      switch (step.action) {
        case 'navigate':
          await page.goto(step.target || 'about:blank', { waitUntil: 'domcontentloaded', timeout: 30000 });
          result = {
            step_id: stepId,
            action: step.action,
            status: 'success',
            timestamp: new Date().toISOString(),
            result: { url: page.url() }
          };
          break;

        case 'wait_for_selector':
          await page.waitForSelector(step.target || 'body', { timeout: 10000 });
          result = { step_id: stepId, action: step.action, status: 'success', timestamp: new Date().toISOString() };
          break;

        case 'click':
          await page.click(step.target || 'body', { timeout: 5000 });
          result = { step_id: stepId, action: step.action, status: 'success', timestamp: new Date().toISOString() };
          break;

        case 'fill':
          await page.fill(step.target || 'body', step.value || '');
          result = { step_id: stepId, action: step.action, status: 'success', timestamp: new Date().toISOString() };
          break;

        case 'read_content':
          const text = await page.textContent('body');
          const html = await page.content();
          result = {
            step_id: stepId,
            action: step.action,
            status: 'success',
            timestamp: new Date().toISOString(),
            result: { text: text?.slice(0, 2000), element_count: html.split('<').length }
          };
          break;

        case 'wait_for_load':
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
          result = { step_id: stepId, action: step.action, status: 'success', timestamp: new Date().toISOString() };
          break;

        case 'capture_screenshot':
          const screenshot = await page.screenshot({ encoding: 'base64' });
          result = {
            step_id: stepId,
            action: step.action,
            status: 'success',
            timestamp: new Date().toISOString(),
            screenshot: {
              data_url: `data:image/png;base64,${screenshot}`,
              width: 1280,
              height: 720
            }
          };
          break;

        default:
          result = {
            step_id: stepId,
            action: step.action,
            status: 'uncertain',
            timestamp: new Date().toISOString(),
            error: { code: 'unknown_action', message: `Unknown action: ${step.action}` }
          };
      }

      result.duration_ms = Date.now() - startTime;
      return result;

    } catch (error) {
      return {
        step_id: stepId,
        action: step.action,
        status: 'failure',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: {
          code: 'execution_error',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private shouldStopExecution(stepResult: StepResult, goal: StructuredGoal): boolean {
    if (stepResult.status === 'failure' && !goal.constraints?.interactive) {
      return true;
    }

    if (stepResult.status === 'failure' && goal.constraints?.interactive) {
      return false;
    }

    return false;
  }

  private determineGoalStatus(
    results: StepResult[],
    goal: StructuredGoal
  ): 'achieved' | 'failed' | 'uncertain' {
    const failedCount = results.filter(r => r.status === 'failure').length;
    const uncertainCount = results.filter(r => r.status === 'uncertain').length;
    const successCount = results.filter(r => r.status === 'success').length;

    if (failedCount === 0 && uncertainCount === 0) {
      return 'achieved';
    }

    if (failedCount > successCount) {
      return 'failed';
    }

    if (uncertainCount > 0) {
      return 'uncertain';
    }

    return successCount > 0 ? 'achieved' : 'failed';
  }

  async getPageURL(): Promise<string> {
    return this.page?.url() || '';
  }

  async captureScreenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('No active page');
    }
    const screenshot = await this.page.screenshot({ encoding: 'base64' });
    return `data:image/png;base64,${screenshot}`;
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.browser) {
      if (this.isCDPMode) {
        await this.browser.close().catch(() => {});
      } else {
        await this.browser.close();
      }
      this.browser = null;
    }
    this.isInitialized = false;
    this.isCDPMode = false;
    console.log('AutoBrowseExecutor: Cleaned up');
  }

  isConnected(): boolean {
    return this.isInitialized && this.browser !== null;
  }

  getConnectionMode(): 'cdp' | 'launched' {
    return this.isCDPMode ? 'cdp' : 'launched';
  }
}

export const autoBrowseExecutor = new AutoBrowseExecutor();