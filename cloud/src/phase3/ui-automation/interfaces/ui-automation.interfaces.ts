export interface UIAction {
  id: string;
  action_type: 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'select' | 'hover';
  selector?: string;
  selector_type?: 'css' | 'xpath' | 'text' | 'id';
  value?: string;
  wait_time?: number;
  screenshot_path?: string;
  timeout?: number;
}

export interface UIStep {
  id: string;
  name: string;
  actions: UIAction[];
  retry_count?: number;
  on_failure?: 'continue' | 'stop' | 'retry';
}

export interface UIActionResult {
  step_id: string;
  action_id: string;
  status: 'success' | 'failure' | 'timeout';
  result?: any;
  error?: string;
  timestamp: Date;
  screenshot?: string;
}

export interface UIExecutionContext {
  sessionId: string;
  browserId?: string;
  pageId?: string;
  viewport?: { width: number; height: number };
  timeout: number;
  retryLimit: number;
}

export interface UIBrowserSession {
  id: string;
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface UIAssertion {
  type: 'element_exists' | 'text_contains' | 'element_visible' | 'url_matches';
  selector?: string;
  value?: string;
  regex?: string;
  timeout?: number;
}