import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { chromium, Browser, Page } from 'playwright';
import { EventEmitter } from 'events';
import {
  RPASession,
  RPAWorkflow,
  RPAExecution,
  RPAStep,
  RPAConfiguration,
  BrowserContext,
  ElementInfo,
  RPAExecutionState,
  RPALogEntry,
  RetryPolicy,
  TaskStatus
} from '../types/enhanced-orchestration.types';

/**
 * 🤖 Enhanced RPA Execution Service
 * Integrates with Flow Engine and Side Panel for browser automation
 */
@Injectable()
export class EnhancedRPAService extends EventEmitter {
  private readonly logger = new Logger(EnhancedRPAService.name);
  private activeSessions = new Map<string, RPASession>();
  private browsers = new Map<string, Browser>();
  private executionQueue: RPAExecution[] = [];
  private isProcessing = false;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeRPA();
  }

  private async initializeRPA(): Promise<void> {
    try {
      this.logger.log('[RPA Service] Initializing enhanced RPA system...');
      
      // Load predefined workflows
      this.loadBuiltinWorkflows();
      
      // Start execution processor
      this.startExecutionProcessor();
      
      this.logger.log('[RPA Service] Enhanced RPA system initialized');
    } catch (error) {
      this.logger.error('[RPA Service] Failed to initialize RPA system:', error);
      throw error;
    }
  }

  /**
   * 🚀 Create new RPA session
   */
  async createSession(sessionId: string, options?: {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    viewport?: { width: number; height: number };
    flowId?: string;
  }): Promise<RPASession> {
    try {
      this.logger.log(`[RPA Service] Creating RPA session: ${sessionId}`);
      
      const browserType = options?.browserType || 'chromium';
      const headless = options?.headless !== false;
      const viewport = options?.viewport || { width: 1920, height: 1080 };

      // Launch browser
      const browser = await chromium.launch({
        headless,
        viewport,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      // Create page
      const page = await browser.newPage();
      await page.setViewportSize(viewport);
      
      // Create browser context
      const browserContext: BrowserContext = {
        id: `browser_${Date.now()}`,
        type: 'browser',
        pageUrl: page.url(),
        pageTitle: await page.title(),
        elements: [],
        metadata: {
          userAgent: await page.evaluate(() => navigator.userAgent),
          viewport,
          timestamp: new Date()
        }
      };

      // Create RPA session
      const rpaSession: RPASession = {
        id: `rpa_${sessionId}_${Date.now()}`,
        sessionId,
        flowId: options?.flowId,
        browserContext,
        workflows: [],
        status: RPAExecutionState.READY,
        startTime: new Date(),
        metadata: {
          browserType,
          viewport: `${viewport.width}x${viewport.height}`,
          userAgent: browserContext.metadata.userAgent,
          capabilities: [
            'element_interaction',
            'form_filling',
            'navigation',
            'screenshot',
            'javascript_execution',
            'file_download',
            'cookie_management'
          ]
        }
      };

      // Store session and browser
      this.activeSessions.set(sessionId, rpaSession);
      this.browsers.set(sessionId, browser);

      this.emit('session:created', { sessionId, rpaSession });
      
      this.logger.log(`[RPA Service] RPA session created successfully: ${sessionId}`);
      return rpaSession;
    } catch (error) {
      this.logger.error(`[RPA Service] Failed to create session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * 🔥 Execute RPA workflow
   */
  async executeWorkflow(sessionId: string, workflowId: string, options?: {
    variables?: Record<string, any>;
    dryRun?: boolean;
    stepIds?: string[];
  }): Promise<RPAExecution[]> {
    try {
      this.logger.log(`[RPA Service] Executing workflow: ${workflowId} for session: ${sessionId}`);
      
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`RPA session not found: ${sessionId}`);
      }

      const workflow = this.getWorkflowById(workflowId);
      if (!workflow) {
        throw new Error(`RPA workflow not found: ${workflowId}`);
      }

      // Update session status
      session.status = RPAExecutionState.RUNNING;
      session.currentExecution = {
        id: `exec_${Date.now()}`,
        workflowId,
        stepId: '',
        sessionId,
        status: TaskStatus.IN_PROGRESS,
        startTime: new Date()
      };

      const browser = this.browsers.get(sessionId);
      const page = await browser?.newPage();

      const executions: RPAExecution[] = [];

      // Execute steps
      for (const step of workflow.steps) {
        if (options?.stepIds && !options.stepIds.includes(step.id)) {
          continue;
        }

        const execution = await this.executeStep(sessionId, step, page, {
          variables: { ...session.variables, ...options?.variables },
          dryRun: options?.dryRun
        });

        executions.push(execution);

        if (execution.status === TaskStatus.FAILED && !this.shouldContinueAfterFailure(step)) {
          break;
        }
      }

      // Update session
      session.currentExecution = undefined;
      if (executions.every(e => e.status === TaskStatus.COMPLETED)) {
        session.status = RPAExecutionState.COMPLETED;
      } else {
        session.status = RPAExecutionState.FAILED;
      }

      this.emit('workflow:completed', { sessionId, workflowId, executions });
      
      this.logger.log(`[RPA Service] Workflow execution completed: ${workflowId}`);
      return executions;
    } catch (error) {
      this.logger.error(`[RPA Service] Workflow execution failed: ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * ⚙️ Execute individual RPA step
   */
  private async executeStep(sessionId: string, step: RPAStep, page: Page, options?: {
    variables?: Record<string, any>;
    dryRun?: boolean;
  }): Promise<RPAExecution> {
    try {
      this.logger.log(`[RPA Service] Executing step: ${step.id} (${step.type})`);
      
      const startTime = Date.now();
      
      const execution: RPAExecution = {
        id: `exec_${step.id}_${Date.now()}`,
        workflowId: '',
        stepId: step.id,
        sessionId,
        status: TaskStatus.IN_PROGRESS,
        startTime: new Date(),
        logs: []
      };

      // Process step based on type
      let result: any;
      switch (step.type) {
        case 'navigate':
          result = await this.executeNavigateStep(step, page, options);
          break;
        case 'click':
          result = await this.executeClickStep(step, page, options);
          break;
        case 'type':
          result = await this.executeTypeStep(step, page, options);
          break;
        case 'extract':
          result = await this.executeExtractStep(step, page, options);
          break;
        case 'wait':
          result = await this.executeWaitStep(step, page, options);
          break;
        case 'verify':
          result = await this.executeVerifyStep(step, page, options);
          break;
        case 'script':
          result = await this.executeScriptStep(step, page, options);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      execution.endTime = new Date();
      execution.result = result;
      execution.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      execution.error = result.error;
      execution.screenshot = await page.screenshot({ type: 'png', fullPage: true });
      execution.metadata = {
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
        elementFound: result.elementFound,
        retryCount: 0,
        browserContext: {
          url: page.url(),
          title: await page.title()
        }
      };

      this.emit('step:completed', { sessionId, stepId: step.id, execution, result });
      
      this.logger.log(`[RPA Service] Step completed: ${step.id} - ${execution.status}`);
      return execution;
    } catch (error) {
      this.logger.error(`[RPA Service] Step execution failed: ${step.id}`, error);
      
      return {
        id: `exec_${step.id}_${Date.now()}`,
        workflowId: '',
        stepId: step.id,
        sessionId,
        status: TaskStatus.FAILED,
        startTime: new Date(),
        endTime: new Date(),
        error: error.message,
        logs: [{ timestamp: new Date(), level: 'error', message: error.message, context: { stepId: step.id } }]
      };
    }
  }

  /**
   * 🔗 Execute navigation step
   */
  private async executeNavigateStep(step: RPAStep, page: Page, options?: any): Promise<any> {
    const url = this.resolveVariables(step.value || step.parameters?.url, options?.variables);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: step.timeout || 30000 });
      
      const finalUrl = page.url();
      const success = finalUrl === url || finalUrl.includes(url.replace(/^https?:\/\//, '').split('/')[0]);
      
      return {
        success,
        url: finalUrl,
        elementFound: true,
        message: success ? `Navigated to: ${url}` : `Navigation failed: expected ${url}, got ${finalUrl}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        elementFound: false
      };
    }
  }

  /**
   * 👆 Execute click step
   */
  private async executeClickStep(step: RPAStep, page: Page, options?: any): Promise<any> {
    const selector = step.selector || step.parameters?.selector;
    
    try {
      await page.waitForSelector(selector, { timeout: step.timeout || 10000 });
      const element = await page.$(selector);
      
      if (!element) {
        return {
          success: false,
          error: `Element not found: ${selector}`,
          elementFound: false
        };
      }

      await element.click();
      
      return {
        success: true,
        elementFound: true,
        message: `Clicked element: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        elementFound: false
      };
    }
  }

  /**
   * ⌨️ Execute type step
   */
  private async executeTypeStep(step: RPAStep, page: Page, options?: any): Promise<any> {
    const selector = step.selector || step.parameters?.selector;
    const value = this.resolveVariables(step.value || step.parameters?.text, options?.variables);
    
    try {
      await page.waitForSelector(selector, { timeout: step.timeout || 10000 });
      await page.fill(selector, value);
      
      return {
        success: true,
        elementFound: true,
        message: `Typed "${value}" into: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        elementFound: false
      };
    }
  }

  /**
   * 📤 Execute extract step
   */
  private async executeExtractStep(step: RPAStep, page: Page, options?: any): Promise<any> {
    const selector = step.selector || step.parameters?.selector;
    const attribute = step.parameters?.attribute || 'textContent';
    
    try {
      await page.waitForSelector(selector, { timeout: step.timeout || 10000 });
      const element = await page.$(selector);
      
      if (!element) {
        return {
          success: false,
          error: `Element not found: ${selector}`,
          elementFound: false
        };
      }

      const value = await element.getAttribute(attribute);
      
      return {
        success: true,
        data: value,
        elementFound: true,
        message: `Extracted ${attribute}: ${value} from: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        elementFound: false
      };
    }
  }

  /**
   * ⏱️ Execute wait step
   */
  private async executeWaitStep(step: RPAStep, page: Page, options?: any): Promise<any> {
    const duration = step.parameters?.duration || 1000;
    const condition = step.parameters?.condition;
    
    try {
      if (condition) {
        // Wait for condition
        const resolvedCondition = this.resolveVariables(condition, options?.variables);
        await page.waitForFunction(resolvedCondition, { timeout: step.timeout || 30000 });
      } else {
        // Wait for duration
        await page.waitForTimeout(duration);
      }
      
      return {
        success: true,
        message: condition ? `Waited for condition: ${condition}` : `Waited for duration: ${duration}ms`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ✅ Execute verify step
   */
  private async executeVerifyStep(step: RPAStep, page: Page, options?: any): Promise<any> {
    const selector = step.selector || step.parameters?.selector;
    const expectedValue = this.resolveVariables(step.expectedOutput, options?.variables);
    const attribute = step.parameters?.attribute || 'textContent';
    
    try {
      await page.waitForSelector(selector, { timeout: step.timeout || 10000 });
      const element = await page.$(selector);
      
      if (!element) {
        return {
          success: false,
          error: `Element not found: ${selector}`,
          elementFound: false
        };
      }

      const actualValue = await element.getAttribute(attribute);
      const success = actualValue === expectedValue || 
        (typeof expectedValue === 'string' && actualValue?.includes(expectedValue));
      
      return {
        success,
        actualValue,
        expectedValue,
        elementFound: true,
        message: success ? 
          `Verification passed: ${actualValue} === ${expectedValue}` : 
          `Verification failed: expected ${expectedValue}, got ${actualValue}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        elementFound: false
      };
    }
  }

  /**
   * 📜 Execute script step
   */
  private async executeScriptStep(step: RPAStep, page: Page, options?: any): Promise<any> {
    const script = this.resolveVariables(step.parameters?.script || step.value, options?.variables);
    
    try {
      const result = await page.evaluate(script);
      
      return {
        success: true,
        data: result,
        message: 'Script executed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔄 Resolve variables in text
   */
  private resolveVariables(text: string, variables?: Record<string, any>): string {
    if (!variables || !text) {
      return text;
    }

    return text.replace(/\$(\w+)/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }

  /**
   * ❓ Check if should continue after step failure
   */
  private shouldContinueAfterFailure(step: RPAStep): boolean {
    if (!step.retryPolicy) {
      return false;
    }
    
    return step.retryPolicy.retryableErrors?.includes('*') || false;
  }

  /**
   * 🛑 Close RPA session
   */
  async closeSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      const browser = this.browsers.get(sessionId);
      
      if (browser) {
        await browser.close();
        this.browsers.delete(sessionId);
      }
      
      if (session) {
        session.status = RPAExecutionState.COMPLETED;
        session.endTime = new Date();
        this.activeSessions.delete(sessionId);
      }

      this.emit('session:closed', { sessionId });
      
      this.logger.log(`[RPA Service] Session closed: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`[RPA Service] Failed to close session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * 🔄 Get session status
   */
  getSessionStatus(sessionId: string): RPASession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * 📊 Get all active sessions
   */
  getActiveSessions(): Map<string, RPASession> {
    return new Map(this.activeSessions);
  }

  /**
   * ⏸️ Pause RPA execution
   */
  async pauseExecution(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return false;
      }

      session.status = RPAExecutionState.PAUSED;
      
      this.emit('execution:paused', { sessionId });
      
      this.logger.log(`[RPA Service] Execution paused: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`[RPA Service] Failed to pause execution for ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * ▶️ Resume RPA execution
   */
  async resumeExecution(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return false;
      }

      session.status = RPAExecutionState.RUNNING;
      
      this.emit('execution:resumed', { sessionId });
      
      this.logger.log(`[RPA Service] Execution resumed: ${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error(`[RPA Service] Failed to resume execution for ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * 🎬 Take screenshot
   */
  async takeScreenshot(sessionId: string, options?: {
    fullPage?: boolean;
    selector?: string;
  }): Promise<string> {
    try {
      const session = this.activeSessions.get(sessionId);
      const browser = this.browsers.get(sessionId);
      
      if (!browser || !session) {
        throw new Error(`Invalid session: ${sessionId}`);
      }

      const page = await browser.newPage();
      
      if (options?.selector) {
        // Screenshot of specific element
        await page.waitForSelector(options.selector);
        const element = await page.$(options.selector);
        if (element) {
          return await element.screenshot({ type: 'png' });
        }
      }
      
      // Full page screenshot
      return await page.screenshot({ 
        type: 'png', 
        fullPage: options?.fullPage !== false 
      });
    } catch (error) {
      this.logger.error(`[RPA Service] Screenshot failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * 📚 Load built-in workflows
   */
  private loadBuiltinWorkflows(): void {
    // Customer account update workflow
    const customerAccountUpdateWorkflow: RPAWorkflow = {
      id: 'customer_account_update',
      name: 'Customer Account Update',
      description: 'Update customer account information in CRM system',
      steps: [
        {
          id: 'navigate_crm',
          type: 'navigate',
          name: 'Navigate to CRM',
          selector: '',
          value: 'https://crm.example.com/customers',
          timeout: 30000,
          parameters: {},
          expectedOutput: { pageLoaded: true },
          metadata: {
            description: 'Navigate to customer management page',
            category: 'navigation',
            riskLevel: 'low'
          }
        },
        {
          id: 'search_customer',
          type: 'type',
          name: 'Search Customer',
          selector: '#customer-search',
          value: '$customerEmail',
          timeout: 10000,
          parameters: { attribute: 'value' },
          expectedOutput: { customerFound: true },
          metadata: {
            description: 'Search for customer by email',
            category: 'data_input',
            riskLevel: 'low'
          }
        },
        {
          id: 'click_customer',
          type: 'click',
          name: 'Open Customer Record',
          selector: '.customer-row:first-child',
          timeout: 5000,
          parameters: {},
          expectedOutput: { recordOpened: true },
          metadata: {
            description: 'Click on customer record to open',
            category: 'interaction',
            riskLevel: 'low'
          }
        },
        {
          id: 'update_name',
          type: 'type',
          name: 'Update Customer Name',
          selector: '#customer-name',
          value: '$customerName',
          timeout: 5000,
          parameters: {},
          expectedOutput: { nameUpdated: true },
          metadata: {
            description: 'Update customer name field',
            category: 'data_input',
            riskLevel: 'medium'
          }
        },
        {
          id: 'save_changes',
          type: 'click',
          name: 'Save Changes',
          selector: '#save-button',
          timeout: 5000,
          parameters: {},
          expectedOutput: { changesSaved: true },
          metadata: {
            description: 'Click save button to commit changes',
            category: 'interaction',
            riskLevel: 'medium'
          }
        },
        {
          id: 'verify_update',
          type: 'verify',
          name: 'Verify Update',
          selector: '.success-message',
          value: 'Customer information updated successfully',
          timeout: 10000,
          parameters: { attribute: 'textContent' },
          expectedOutput: { updateVerified: true },
          metadata: {
            description: 'Verify success message appears',
            category: 'verification',
            riskLevel: 'low'
          }
        }
      ],
      configuration: {
        browser: {
          type: 'chromium',
          headless: false,
          viewport: { width: 1920, height: 1080 }
        },
        timeouts: {
          default: 10000,
          navigation: 30000,
          element: 5000,
          script: 5000
        },
        security: {
          ignoreHTTPS: false,
          blockAds: true,
          sandbox: true
        },
        performance: {
          enableCaching: true,
          enableResourceOptimization: true,
          maxConcurrentSteps: 3
        }
      },
      status: 'active',
      metadata: {
        category: 'crm_integration',
        author: 'KELEDON Team',
        version: '1.0.0',
        lastUpdated: new Date(),
        successRate: 0.95,
        averageDuration: 45000
      }
    };

    // Store workflow for use
    this.workflows.set(customerAccountUpdateWorkflow.id, customerAccountUpdateWorkflow);
  }

  /**
   * 📋 Get workflow by ID
   */
  private getWorkflowById(workflowId: string): RPAWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  private workflows = new Map<string, RPAWorkflow>();

  /**
   * ⚙️ Start execution processor
   */
  private startExecutionProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.executionQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      while (this.executionQueue.length > 0) {
        const execution = this.executionQueue.shift();
        // Process execution
        this.emit('execution:processed', execution);
      }
      
      this.isProcessing = false;
    }, 100);
  }

  /**
   * 📊 Get RPA service statistics
   */
  getStatistics(): {
    activeSessions: number;
    totalExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const activeSessions = this.activeSessions.size;
    const sessions = Array.from(this.activeSessions.values());
    const totalExecutions = sessions.reduce((sum, session) => sum + (session.workflows?.length || 0), 0);
    const completedExecutions = sessions.reduce((sum, session) => 
      sum + session.workflows?.filter(w => w.status === 'completed').length || 0, 0
    );
    
    const successRate = totalExecutions > 0 ? completedExecutions / totalExecutions : 0;
    
    return {
      activeSessions,
      totalExecutions,
      averageExecutionTime: 0, // Would be calculated from execution durations
      successRate
    };
  }
}