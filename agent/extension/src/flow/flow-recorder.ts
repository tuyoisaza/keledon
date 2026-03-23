export interface FlowStep {
  id: string;
  order: number;
  type: 'navigate' | 'click' | 'input' | 'read' | 'wait' | 'submit' | 'decision' | 'speak';
  selector: string;
  selectorType: 'css' | 'xpath' | 'text' | 'aria';
  value?: string;
  extract?: string;
  waitFor?: string;
  condition?: string;
  timeout: number;
  optional: boolean;
  nextStepId?: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  triggerKeywords: string[];
  category: string;
  tool: string;
  teamId?: string;
  isActive: boolean;
  version: number;
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface RecordingState {
  isRecording: boolean;
  flowId: string | null;
  steps: FlowStep[];
  startTime: Date | null;
}

export class FlowRecorder {
  private state: RecordingState = {
    isRecording: false,
    flowId: null,
    steps: [],
    startTime: null,
  };

  private listeners: Set<(state: RecordingState) => void> = new Set();
  private recordedActions: FlowStep[] = [];

  startRecording(flowId?: string): void {
    this.state = {
      isRecording: true,
      flowId: flowId || `flow-${Date.now()}`,
      steps: [],
      startTime: new Date(),
    };
    this.recordedActions = [];
    this.enableCapture();
    this.notifyListeners();
  }

  stopRecording(): Flow {
    this.disableCapture();
    this.state.isRecording = false;
    this.notifyListeners();

    const flow: Flow = {
      id: this.state.flowId!,
      name: `Flow ${new Date().toLocaleTimeString()}`,
      description: '',
      triggerKeywords: [],
      category: 'general',
      tool: 'browser',
      isActive: true,
      version: 1,
      steps: this.recordedActions.map((step, index) => ({
        ...step,
        order: index,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return flow;
  }

  cancelRecording(): void {
    this.disableCapture();
    this.state = {
      isRecording: false,
      flowId: null,
      steps: [],
      startTime: null,
    };
    this.recordedActions = [];
    this.notifyListeners();
  }

  private enableCapture(): void {
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('input', this.handleInput, true);
    document.addEventListener('keydown', this.handleKeydown, true);
  }

  private disableCapture(): void {
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('input', this.handleInput, true);
    document.removeEventListener('keydown', this.handleKeydown, true);
  }

  private handleClick = (event: MouseEvent): void => {
    if (!this.state.isRecording) return;

    const target = event.target as HTMLElement;
    const selector = this.generateSelector(target);

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    if (target.tagName === 'A' || target.getAttribute('href')) {
      this.recordedActions.push({
        id: this.generateId(),
        order: this.recordedActions.length,
        type: 'click',
        selector,
        selectorType: 'css',
        timeout: 10000,
        optional: false,
      });
    } else {
      this.recordedActions.push({
        id: this.generateId(),
        order: this.recordedActions.length,
        type: 'click',
        selector,
        selectorType: 'css',
        timeout: 10000,
        optional: false,
      });
    }

    this.notifyListeners();
  };

  private handleInput = (event: Event): void => {
    if (!this.state.isRecording) return;

    const target = event.target as HTMLInputElement;
    const selector = this.generateSelector(target);

    this.recordedActions.push({
      id: this.generateId(),
      order: this.recordedActions.length,
      type: 'input',
      selector,
      selectorType: 'css',
      value: target.value,
      timeout: 10000,
      optional: false,
    });

    this.notifyListeners();
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    if (!this.state.isRecording) return;

    if (event.key === 'Enter') {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const selector = this.generateSelector(target);
        this.recordedActions.push({
          id: this.generateId(),
          order: this.recordedActions.length,
          type: 'submit',
          selector,
          selectorType: 'css',
          timeout: 10000,
          optional: false,
        });
        this.notifyListeners();
      }
    }
  };

  private generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.getAttribute('aria-label')) {
      return `[aria-label="${element.getAttribute('aria-label')}"]`;
    }

    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.includes(':')).slice(0, 2);
      if (classes.length > 0) {
        const path = this.getElementPath(element);
        return path;
      }
    }

    return this.getElementPath(element);
  }

  private getElementPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }

      const classes = Array.from(current.classList)
        .filter(c => c && !c.includes(':'))
        .join('.');

      if (classes) {
        selector += `.${classes}`;
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  private generateId(): string {
    return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  addStep(step: FlowStep): void {
    this.recordedActions.push({
      ...step,
      id: this.generateId(),
      order: this.recordedActions.length,
    });
    this.notifyListeners();
  }

  removeStep(stepId: string): void {
    this.recordedActions = this.recordedActions.filter(s => s.id !== stepId);
    this.notifyListeners();
  }

  updateStep(stepId: string, updates: Partial<FlowStep>): void {
    const index = this.recordedActions.findIndex(s => s.id === stepId);
    if (index >= 0) {
      this.recordedActions[index] = { ...this.recordedActions[index], ...updates };
      this.notifyListeners();
    }
  }

  reorderSteps(stepIds: string[]): void {
    const reordered: FlowStep[] = [];
    for (const id of stepIds) {
      const step = this.recordedActions.find(s => s.id === id);
      if (step) {
        reordered.push(step);
      }
    }
    this.recordedActions = reordered.map((s, i) => ({ ...s, order: i }));
    this.notifyListeners();
  }

  addExtractStep(selector: string, variableName: string): void {
    this.recordedActions.push({
      id: this.generateId(),
      order: this.recordedActions.length,
      type: 'read',
      selector,
      selectorType: 'css',
      extract: variableName,
      timeout: 10000,
      optional: false,
    });
    this.notifyListeners();
  }

  addWaitStep(selector: string, timeout = 10000): void {
    this.recordedActions.push({
      id: this.generateId(),
      order: this.recordedActions.length,
      type: 'wait',
      selector,
      selectorType: 'css',
      waitFor: selector,
      timeout,
      optional: false,
    });
    this.notifyListeners();
  }

  addNavigateStep(url: string): void {
    this.recordedActions.push({
      id: this.generateId(),
      order: this.recordedActions.length,
      type: 'navigate',
      selector: '',
      selectorType: 'css',
      value: url,
      timeout: 30000,
      optional: false,
    });
    this.notifyListeners();
  }

  getState(): RecordingState {
    return {
      ...this.state,
      steps: this.recordedActions,
    };
  }

  getRecordedSteps(): FlowStep[] {
    return [...this.recordedActions];
  }

  subscribe(listener: (state: RecordingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }
}

export const flowRecorder = new FlowRecorder();
