export interface FlowStep {
  id: string;
  flowId: string;
  order: number;
  type: 'navigate' | 'click' | 'input' | 'read' | 'wait' | 'submit' | 'decision' | 'speak';
  selector?: string;
  selectorType?: string;
  value?: string;
  extract?: string;
  waitFor?: string;
  condition?: string;
  timeout?: number;
  optional?: boolean;
  nextStepId?: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  triggerKeywords: string;
  category: string;
  tool: string;
  teamId?: string;
  isActive: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  steps: FlowStep[];
}

export const STEP_TYPES = [
  { value: 'navigate', label: 'Navigate', icon: '🌐', desc: 'Go to a URL' },
  { value: 'click', label: 'Click', icon: '👆', desc: 'Click an element' },
  { value: 'input', label: 'Input', icon: '⌨️', desc: 'Type text into a field' },
  { value: 'read', label: 'Read', icon: '👁️', desc: 'Extract text from an element' },
  { value: 'wait', label: 'Wait', icon: '⏱️', desc: 'Wait for a duration or element' },
  { value: 'submit', label: 'Submit', icon: '📤', desc: 'Submit a form' },
  { value: 'decision', label: 'Decision', icon: '🔀', desc: 'Conditional branching' },
  { value: 'speak', label: 'Speak', icon: '🗣️', desc: 'Say something to the caller' },
];

export const CATEGORIES = ['general', 'crm', 'support', 'sales', 'billing', 'onboarding', 'reporting'];
