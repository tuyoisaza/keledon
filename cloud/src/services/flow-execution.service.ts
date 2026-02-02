import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface FlowExecution {
  id: string;
  name: string;
  description?: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  flowId?: string;
  sessionId?: string;
  agentId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  currentStepIndex: number;
  totalSteps: number;
  progress: number; // 0-100
  steps: FlowStep[];
  performance: FlowPerformance;
  result?: FlowResult;
  error?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowStep {
  id: string;
  name: string;
  type: 'navigate' | 'input' | 'click' | 'wait' | 'extract' | 'validate' | 'conditional' | 'loop' | 'api' | 'script';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  description?: string;
  parameters?: Record<string, any>;
  expectedResult?: any;
  actualResult?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  screenshot?: string;
  data?: any;
  retries: number;
  maxRetries: number;
}

export interface FlowPerformance {
  totalDuration: number;
  averageStepTime: number;
  successRate: number;
  errorRate: number;
  retriedSteps: number;
  fastestStep: string;
  slowestStep: string;
  resourceUsage?: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface FlowResult {
  success: boolean;
  action: string;
  data?: any;
  fields_filled?: string[];
  files_downloaded?: string[];
  forms_submitted?: string[];
  processes_automated?: string[];
  time_saved?: number; // minutes
  errors_avoided?: number;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  steps: Omit<FlowStep, 'status' | 'startTime' | 'endTime' | 'duration' | 'error' | 'retries'>[];
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FlowExecutionService {
  private executions = new Map<string, FlowExecution>();
  private templates = new Map<string, FlowTemplate>();
  private executionUpdate = new Subject<FlowExecution>();
  private performanceUpdate = new Subject<FlowPerformance>();
  
  public executions$ = this.executionUpdate.asObservable();
  public performance$ = this.performanceUpdate.asObservable();

  constructor() {
    console.log('FlowExecutionService: Initialized');
    this.initializeDefaultTemplates();
  }

  // Create a new flow execution
  createExecution(
    name: string,
    templateId?: string,
    options: {
      sessionId?: string;
      agentId?: string;
      priority?: FlowExecution['priority'];
      metadata?: Record<string, any>;
    } = {}
  ): FlowExecution {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let steps: FlowStep[] = [];
    let estimatedDuration = 60000; // Default 1 minute

    if (templateId) {
      const template = this.templates.get(templateId);
      if (template) {
        steps = template.steps.map(step => ({
          ...step,
          status: 'pending' as const,
          retries: 0
        }));
        estimatedDuration = template.estimatedDuration;
      }
    } else {
      // Create default steps for custom flow
      steps = this.createDefaultSteps();
    }

    const execution: FlowExecution = {
      id: executionId,
      name,
      status: 'idle',
      priority: options.priority || 'medium',
      flowId: templateId,
      sessionId: options.sessionId,
      agentId: options.agentId,
      currentStepIndex: 0,
      totalSteps: steps.length,
      progress: 0,
      steps,
      performance: {
        totalDuration: 0,
        averageStepTime: 0,
        successRate: 0,
        errorRate: 0,
        retriedSteps: 0,
        fastestStep: '',
        slowestStep: ''
      },
      metadata: options.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.executions.set(executionId, execution);
    this.broadcastExecution(execution);
    
    console.log(`FlowExecution: Created execution ${executionId} for flow "${name}"`);
    return execution;
  }

  // Start flow execution
  async startExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== 'idle' && execution.status !== 'paused') {
      throw new Error(`Execution ${executionId} cannot be started in status ${execution.status}`);
    }

    execution.status = 'running';
    execution.startTime = new Date();
    execution.updatedAt = new Date();
    
    this.broadcastExecution(execution);
    
    // Start executing steps
    this.executeSteps(executionId);
    
    console.log(`FlowExecution: Started execution ${executionId}`);
    return true;
  }

  // Pause flow execution
  pauseExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'paused';
    execution.updatedAt = new Date();
    this.broadcastExecution(execution);
    
    console.log(`FlowExecution: Paused execution ${executionId}`);
    return true;
  }

  // Resume flow execution
  async resumeExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'paused') {
      return false;
    }

    execution.status = 'running';
    execution.updatedAt = new Date();
    this.broadcastExecution(execution);
    
    // Continue executing steps
    this.executeSteps(executionId);
    
    console.log(`FlowExecution: Resumed execution ${executionId}`);
    return true;
  }

  // Stop flow execution
  stopExecution(executionId: string, reason?: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.error = reason || 'Execution cancelled by user';
    execution.updatedAt = new Date();
    
    if (execution.startTime) {
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.updatePerformance(execution);
    }
    
    this.broadcastExecution(execution);
    
    console.log(`FlowExecution: Stopped execution ${executionId}: ${reason}`);
    return true;
  }

  // Reset flow execution
  resetExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    // Reset steps
    execution.steps.forEach(step => {
      step.status = 'pending';
      step.startTime = undefined;
      step.endTime = undefined;
      step.duration = undefined;
      step.error = undefined;
      step.actualResult = undefined;
      step.screenshot = undefined;
      step.data = undefined;
      step.retries = 0;
    });

    // Reset execution state
    execution.status = 'idle';
    execution.currentStepIndex = 0;
    execution.progress = 0;
    execution.startTime = undefined;
    execution.endTime = undefined;
    execution.duration = undefined;
    execution.result = undefined;
    execution.error = undefined;
    execution.updatedAt = new Date();

    this.broadcastExecution(execution);
    
    console.log(`FlowExecution: Reset execution ${executionId}`);
    return true;
  }

  // Delete flow execution
  deleteExecution(executionId: string): boolean {
    const success = this.executions.delete(executionId);
    if (success) {
      console.log(`FlowExecution: Deleted execution ${executionId}`);
    }
    return success;
  }

  // Get execution by ID
  getExecution(executionId: string): FlowExecution | undefined {
    return this.executions.get(executionId);
  }

  // Get all executions
  getExecutions(filters: {
    status?: FlowExecution['status'];
    agentId?: string;
    sessionId?: string;
    flowId?: string;
    limit?: number;
    offset?: number;
  } = {}): FlowExecution[] {
    let executions = Array.from(this.executions.values());

    // Apply filters
    if (filters.status) {
      executions = executions.filter(exec => exec.status === filters.status);
    }
    if (filters.agentId) {
      executions = executions.filter(exec => exec.agentId === filters.agentId);
    }
    if (filters.sessionId) {
      executions = executions.filter(exec => exec.sessionId === filters.sessionId);
    }
    if (filters.flowId) {
      executions = executions.filter(exec => exec.flowId === filters.flowId);
    }

    // Sort by creation date (newest first)
    executions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (filters.offset) {
      executions = executions.slice(filters.offset);
    }
    if (filters.limit) {
      executions = executions.slice(0, filters.limit);
    }

    return executions;
  }

  // Get flow templates
  getTemplates(category?: string): FlowTemplate[] {
    let templates = Array.from(this.templates.values());
    
    if (category) {
      templates = templates.filter(template => template.category === category);
    }
    
    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get template by ID
  getTemplate(templateId: string): FlowTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Create flow template
  createTemplate(template: Omit<FlowTemplate, 'id' | 'createdAt' | 'updatedAt'>): FlowTemplate {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newTemplate: FlowTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(templateId, newTemplate);
    
    console.log(`FlowExecution: Created template ${templateId} for flow "${template.name}"`);
    return newTemplate;
  }

  // Update execution step result
  updateStepResult(
    executionId: string,
    stepId: string,
    result: {
      status: FlowStep['status'];
      actualResult?: any;
      error?: string;
      screenshot?: string;
      data?: any;
    }
  ): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    const step = execution.steps.find(s => s.id === stepId);
    if (!step) return false;

    step.status = result.status;
    step.actualResult = result.actualResult;
    step.error = result.error;
    step.screenshot = result.screenshot;
    step.data = result.data;

    if (result.status === 'completed' || result.status === 'failed') {
      step.endTime = new Date();
      if (step.startTime) {
        step.duration = step.endTime.getTime() - step.startTime.getTime();
      }
    }

    execution.updatedAt = new Date();
    this.broadcastExecution(execution);
    
    return true;
  }

  // Private methods
  private async executeSteps(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return;

    for (let i = execution.currentStepIndex; i < execution.steps.length; i++) {
      // Check if execution is still running
      const currentExec = this.executions.get(executionId);
      if (!currentExec || currentExec.status !== 'running') {
        break;
      }

      const step = execution.steps[i];
      execution.currentStepIndex = i;
      execution.progress = (i / execution.totalSteps) * 100;
      
      // Execute step
      await this.executeStep(executionId, step);
      
      // Update execution
      execution.updatedAt = new Date();
      this.broadcastExecution(execution);

      // Check if step failed and has retries remaining
      if (step.status === 'failed' && step.retries < step.maxRetries) {
        step.retries++;
        step.status = 'pending';
        i--; // Retry this step
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay before retry
      } else if (step.status === 'failed') {
        // Step failed permanently
        execution.status = 'failed';
        execution.error = `Step ${step.name} failed: ${step.error}`;
        execution.endTime = new Date();
        if (execution.startTime) {
          execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        }
        this.updatePerformance(execution);
        break;
      }
    }

    // Check if all steps completed
    const currentExec = this.executions.get(executionId);
    if (currentExec && currentExec.status === 'running' && currentExec.currentStepIndex >= currentExec.steps.length - 1) {
      this.completeExecution(executionId);
    }
  }

  private async executeStep(executionId: string, step: FlowStep): Promise<void> {
    step.status = 'running';
    step.startTime = new Date();

    // Simulate step execution based on type
    const executionTime = this.getStepExecutionTime(step.type);
    
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // Simulate success/failure
    const successRate = this.getStepSuccessRate(step.type);
    const success = Math.random() < successRate;

    if (success) {
      step.status = 'completed';
      step.actualResult = this.generateStepResult(step);
    } else {
      step.status = 'failed';
      step.error = this.generateStepError(step.type);
    }

    step.endTime = new Date();
    step.duration = step.endTime.getTime() - step.startTime.getTime();
  }

  private getStepExecutionTime(stepType: FlowStep['type']): number {
    const times = {
      navigate: 1000 + Math.random() * 2000,
      input: 500 + Math.random() * 1500,
      click: 200 + Math.random() * 800,
      wait: 1000 + Math.random() * 3000,
      extract: 800 + Math.random() * 1200,
      validate: 300 + Math.random() * 700,
      conditional: 100 + Math.random() * 400,
      loop: 500 + Math.random() * 1000,
      api: 2000 + Math.random() * 3000,
      script: 1500 + Math.random() * 2500
    };
    
    return times[stepType] || 1000;
  }

  private getStepSuccessRate(stepType: FlowStep['type']): number {
    const rates = {
      navigate: 0.95,
      input: 0.92,
      click: 0.98,
      wait: 1.0,
      extract: 0.88,
      validate: 0.90,
      conditional: 1.0,
      loop: 0.95,
      api: 0.85,
      script: 0.87
    };
    
    return rates[stepType] || 0.90;
  }

  private generateStepResult(step: FlowStep): any {
    switch (step.type) {
      case 'navigate':
        return { url: step.parameters?.url, title: 'Page loaded successfully' };
      case 'input':
        return { field: step.parameters?.selector, value: step.parameters?.value, entered: true };
      case 'click':
        return { element: step.parameters?.selector, clicked: true };
      case 'extract':
        return { data: `Sample extracted data from ${step.parameters?.selector}`, count: 5 };
      case 'validate':
        return { validated: true, expected: step.expectedResult, actual: 'matches' };
      case 'api':
        return { status: 200, response: { success: true, data: 'API response' } };
      default:
        return { completed: true };
    }
  }

  private generateStepError(stepType: FlowStep['type']): string {
    const errors = {
      navigate: ['Page not found', 'Timeout loading page', 'Network error'],
      input: ['Element not found', 'Field not editable', 'Invalid input'],
      click: ['Element not clickable', 'Element not found', 'Overlay blocking'],
      extract: ['No data found', 'Invalid selector', 'Extraction failed'],
      validate: ['Validation failed', 'Expected value not found', 'Format mismatch'],
      api: ['API timeout', 'Invalid response', 'Authentication failed'],
      script: ['Script error', 'Runtime exception', 'Dependency missing']
    };
    
    const stepErrors = errors[stepType] || ['Unknown error'];
    return stepErrors[Math.floor(Math.random() * stepErrors.length)];
  }

  private completeExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.progress = 100;
    
    if (execution.startTime) {
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.updatePerformance(execution);
    }

    // Generate result
    execution.result = {
      success: true,
      action: `Flow "${execution.name}" completed successfully`,
      fields_filled: this.countStepsByType(execution, 'input'),
      forms_submitted: this.countStepsByType(execution, 'click'),
      processes_automated: [`Completed ${execution.steps.filter(s => s.status === 'completed').length} steps`],
      time_saved: Math.round((execution.duration || 0) / 1000 / 60 * 5), // Assume 5x faster than manual
      errors_avoided: this.countStepsByType(execution, 'validate').length
    };

    this.broadcastExecution(execution);
    console.log(`FlowExecution: Completed execution ${executionId}`);
  }

  private updatePerformance(execution: FlowExecution): void {
    const completedSteps = execution.steps.filter(s => s.status === 'completed');
    const failedSteps = execution.steps.filter(s => s.status === 'failed');
    const stepsWithDuration = execution.steps.filter(s => s.duration);

    execution.performance = {
      totalDuration: execution.duration || 0,
      averageStepTime: stepsWithDuration.length > 0 
        ? stepsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / stepsWithDuration.length
        : 0,
      successRate: execution.steps.length > 0 
        ? (completedSteps.length / execution.steps.length) * 100 
        : 0,
      errorRate: execution.steps.length > 0 
        ? (failedSteps.length / execution.steps.length) * 100 
        : 0,
      retriedSteps: execution.steps.reduce((sum, s) => sum + s.retries, 0),
      fastestStep: stepsWithDuration.length > 0 
        ? stepsWithDuration.reduce((fastest, current) => 
            (!fastest.duration || (current.duration && current.duration < fastest.duration)) ? current : fastest
          ).name
        : '',
      slowestStep: stepsWithDuration.length > 0 
        ? stepsWithDuration.reduce((slowest, current) => 
            (!slowest.duration || (current.duration && current.duration > slowest.duration)) ? current : slowest
          ).name
        : ''
    };

    this.performanceUpdate.next(execution.performance);
  }

  private countStepsByType(execution: FlowExecution, type: string): string[] {
    return execution.steps
      .filter(s => s.type === type && s.status === 'completed')
      .map(s => s.name || s.id);
  }

  private createDefaultSteps(): FlowStep[] {
    return [
      {
        id: 'step_1',
        name: 'Navigate to Page',
        type: 'navigate',
        status: 'pending',
        parameters: { url: 'https://example.com' },
        maxRetries: 3,
        retries: 0
      },
      {
        id: 'step_2',
        name: 'Wait for Element',
        type: 'wait',
        status: 'pending',
        parameters: { selector: '#login-form', timeout: 5000 },
        maxRetries: 2,
        retries: 0
      },
      {
        id: 'step_3',
        name: 'Input Username',
        type: 'input',
        status: 'pending',
        parameters: { selector: '#username', value: 'test@example.com' },
        maxRetries: 3,
        retries: 0
      },
      {
        id: 'step_4',
        name: 'Input Password',
        type: 'input',
        status: 'pending',
        parameters: { selector: '#password', value: '********' },
        maxRetries: 3,
        retries: 0
      },
      {
        id: 'step_5',
        name: 'Click Login',
        type: 'click',
        status: 'pending',
        parameters: { selector: '#login-button' },
        maxRetries: 3,
        retries: 0
      }
    ];
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<FlowTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Login Flow',
        description: 'Standard login automation for web applications',
        category: 'Authentication',
        version: '1.0.0',
        steps: [
          {
            id: 'login_nav',
            name: 'Navigate to Login Page',
            type: 'navigate',
            description: 'Open the login page',
            parameters: { url: 'https://example.com/login' },
            maxRetries: 3
          },
          {
            id: 'login_user',
            name: 'Enter Username',
            type: 'input',
            description: 'Input username/email',
            parameters: { selector: '#username', required: true },
            maxRetries: 3
          },
          {
            id: 'login_pass',
            name: 'Enter Password',
            type: 'input',
            description: 'Input password',
            parameters: { selector: '#password', required: true },
            maxRetries: 3
          },
          {
            id: 'login_submit',
            name: 'Submit Login',
            type: 'click',
            description: 'Click login button',
            parameters: { selector: '#login-button' },
            maxRetries: 3
          },
          {
            id: 'login_verify',
            name: 'Verify Login',
            type: 'validate',
            description: 'Verify successful login',
            parameters: { selector: '.dashboard', expectedText: 'Welcome' },
            maxRetries: 2
          }
        ],
        estimatedDuration: 15000,
        complexity: 'simple',
        tags: ['login', 'authentication', 'web'],
        author: 'System'
      },
      {
        name: 'Data Export Flow',
        description: 'Export data from database to CSV',
        category: 'Data Management',
        version: '1.2.0',
        steps: [
          {
            id: 'export_connect',
            name: 'Connect to Database',
            type: 'api',
            description: 'Establish database connection',
            parameters: { endpoint: '/api/db/connect', method: 'POST' },
            maxRetries: 3
          },
          {
            id: 'export_query',
            name: 'Execute Query',
            type: 'api',
            description: 'Run data extraction query',
            parameters: { endpoint: '/api/data/query', method: 'POST', query: 'SELECT * FROM users' },
            maxRetries: 2
          },
          {
            id: 'export_format',
            name: 'Format Data',
            type: 'script',
            description: 'Convert data to CSV format',
            parameters: { script: 'format-csv.js' },
            maxRetries: 1
          },
          {
            id: 'export_save',
            name: 'Save File',
            type: 'api',
            description: 'Save CSV file to storage',
            parameters: { endpoint: '/api/files/save', method: 'POST' },
            maxRetries: 3
          }
        ],
        estimatedDuration: 30000,
        complexity: 'moderate',
        tags: ['export', 'csv', 'database'],
        author: 'System'
      }
    ];

    defaultTemplates.forEach(template => {
      this.createTemplate(template);
    });
  }

  private broadcastExecution(execution: FlowExecution): void {
    this.executionUpdate.next(execution);
  }

  // Cleanup old executions
  cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days

    let cleanedCount = 0;
    for (const [id, execution] of this.executions.entries()) {
      if (execution.updatedAt < cutoffDate && 
          (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled')) {
        this.executions.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`FlowExecution: Cleaned up ${cleanedCount} old executions`);
    }
  }
}