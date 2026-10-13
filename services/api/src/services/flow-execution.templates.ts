import { FlowTemplate } from './flow-execution.types';

export function getDefaultFlowTemplates(): Omit<
  FlowTemplate,
  'id' | 'createdAt' | 'updatedAt'
>[] {
  const defaultTemplates: Omit<
    FlowTemplate,
    'id' | 'createdAt' | 'updatedAt'
  >[] = [
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
          maxRetries: 3,
        },
        {
          id: 'login_user',
          name: 'Enter Username',
          type: 'input',
          description: 'Input username/email',
          parameters: { selector: '#username', required: true },
          maxRetries: 3,
        },
        {
          id: 'login_pass',
          name: 'Enter Password',
          type: 'input',
          description: 'Input password',
          parameters: { selector: '#password', required: true },
          maxRetries: 3,
        },
        {
          id: 'login_submit',
          name: 'Submit Login',
          type: 'click',
          description: 'Click login button',
          parameters: { selector: '#login-button' },
          maxRetries: 3,
        },
        {
          id: 'login_verify',
          name: 'Verify Login',
          type: 'validate',
          description: 'Verify successful login',
          parameters: { selector: '.dashboard', expectedText: 'Welcome' },
          maxRetries: 2,
        },
      ],
      estimatedDuration: 15000,
      complexity: 'simple',
      tags: ['login', 'authentication', 'web'],
      author: 'System',
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
          maxRetries: 3,
        },
        {
          id: 'export_query',
          name: 'Execute Query',
          type: 'api',
          description: 'Run data extraction query',
          parameters: {
            endpoint: '/api/data/query',
            method: 'POST',
            query: 'SELECT * FROM users',
          },
          maxRetries: 2,
        },
        {
          id: 'export_format',
          name: 'Format Data',
          type: 'script',
          description: 'Convert data to CSV format',
          parameters: { script: 'format-csv.js' },
          maxRetries: 1,
        },
        {
          id: 'export_save',
          name: 'Save File',
          type: 'api',
          description: 'Save CSV file to storage',
          parameters: { endpoint: '/api/files/save', method: 'POST' },
          maxRetries: 3,
        },
      ],
      estimatedDuration: 30000,
      complexity: 'moderate',
      tags: ['export', 'csv', 'database'],
      author: 'System',
    },
  ];

  return defaultTemplates;
}
