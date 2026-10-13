import {
  FlowExecution,
  FlowPerformance,
  FlowStep,
} from './flow-execution.types';

export function getStepExecutionTime(stepType: FlowStep['type']): number {
  const times = {
    navigate: 1000,
    input: 500,
    click: 200,
    wait: 1000,
    extract: 800,
    validate: 300,
    conditional: 100,
    loop: 500,
    api: 2000,
    script: 1500,
  };

  return times[stepType] || 1000;
}

export function getStepSuccessRate(stepType: FlowStep['type']): number {
  const rates = {
    navigate: 0.95,
    input: 0.92,
    click: 0.98,
    wait: 1.0,
    extract: 0.88,
    validate: 0.9,
    conditional: 1.0,
    loop: 0.95,
    api: 0.85,
    script: 0.87,
  };

  return rates[stepType] || 0.9;
}

export function generateStepResult(step: FlowStep): Record<string, unknown> {
  switch (step.type) {
    case 'navigate':
      return { url: step.parameters?.url, title: 'Page loaded successfully' };
    case 'input':
      return {
        field: step.parameters?.selector,
        value: step.parameters?.value,
        entered: true,
      };
    case 'click':
      return { element: step.parameters?.selector, clicked: true };
    case 'extract':
      return {
        data: `Sample extracted data from ${typeof step.parameters?.selector === 'string' ? step.parameters.selector : 'element'}`,
        count: 5,
      };
    case 'validate':
      return {
        validated: true,
        expected: step.expectedResult,
        actual: 'matches',
      };
    case 'api':
      return { status: 200, response: { success: true, data: 'API response' } };
    default:
      return { completed: true };
  }
}

export function generateStepError(stepType: FlowStep['type']): string {
  const errors: Record<FlowStep['type'], string[]> = {
    navigate: ['Page not found', 'Timeout loading page', 'Network error'],
    input: ['Element not found', 'Field not editable', 'Invalid input'],
    click: ['Element not clickable', 'Element not found', 'Overlay blocking'],
    extract: ['No data found', 'Invalid selector', 'Extraction failed'],
    validate: [
      'Validation failed',
      'Expected value not found',
      'Format mismatch',
    ],
    api: ['API timeout', 'Invalid response', 'Authentication failed'],
    script: ['Script error', 'Runtime exception', 'Dependency missing'],
    wait: ['Wait condition timed out', 'Wait target unavailable'],
    conditional: ['Condition could not be evaluated'],
    loop: ['Loop exceeded its configured bounds'],
  };

  return errors[stepType][0] ?? 'Unknown error';
}

export function updatePerformance(execution: FlowExecution): FlowPerformance {
  const completedSteps = execution.steps.filter(
    (s) => s.status === 'completed',
  );
  const failedSteps = execution.steps.filter((s) => s.status === 'failed');
  const stepsWithDuration = execution.steps.filter((s) => s.duration);

  execution.performance = {
    totalDuration: execution.duration || 0,
    averageStepTime:
      stepsWithDuration.length > 0
        ? stepsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) /
          stepsWithDuration.length
        : 0,
    successRate:
      execution.steps.length > 0
        ? (completedSteps.length / execution.steps.length) * 100
        : 0,
    errorRate:
      execution.steps.length > 0
        ? (failedSteps.length / execution.steps.length) * 100
        : 0,
    retriedSteps: execution.steps.reduce((sum, s) => sum + s.retries, 0),
    fastestStep:
      stepsWithDuration.length > 0
        ? stepsWithDuration.reduce((fastest, current) =>
            !fastest.duration ||
            (current.duration && current.duration < fastest.duration)
              ? current
              : fastest,
          ).name
        : '',
    slowestStep:
      stepsWithDuration.length > 0
        ? stepsWithDuration.reduce((slowest, current) =>
            !slowest.duration ||
            (current.duration && current.duration > slowest.duration)
              ? current
              : slowest,
          ).name
        : '',
  };

  return execution.performance;
}

export function countStepsByType(
  execution: FlowExecution,
  type: string,
): string[] {
  return execution.steps
    .filter((s) => s.type === type && s.status === 'completed')
    .map((s) => s.name || s.id);
}

export function createDefaultSteps(): FlowStep[] {
  return [
    {
      id: 'step_1',
      name: 'Navigate to Page',
      type: 'navigate',
      status: 'pending',
      parameters: { url: 'https://example.com' },
      maxRetries: 3,
      retries: 0,
    },
    {
      id: 'step_2',
      name: 'Wait for Element',
      type: 'wait',
      status: 'pending',
      parameters: { selector: '#login-form', timeout: 5000 },
      maxRetries: 2,
      retries: 0,
    },
    {
      id: 'step_3',
      name: 'Input Username',
      type: 'input',
      status: 'pending',
      parameters: { selector: '#username', value: 'test@example.com' },
      maxRetries: 3,
      retries: 0,
    },
    {
      id: 'step_4',
      name: 'Input Password',
      type: 'input',
      status: 'pending',
      parameters: { selector: '#password', value: '********' },
      maxRetries: 3,
      retries: 0,
    },
    {
      id: 'step_5',
      name: 'Click Login',
      type: 'click',
      status: 'pending',
      parameters: { selector: '#login-button' },
      maxRetries: 3,
      retries: 0,
    },
  ];
}
