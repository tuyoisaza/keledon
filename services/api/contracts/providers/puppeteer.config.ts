/**
 * Puppeteer RPA Provider Configuration
 * 
 * This interface defines the configuration options for the Puppeteer browser automation provider.
 * It supports both headless and headed browser execution with extensive customization options.
 */

export interface PuppeteerConfig {
  /** Provider identifier - must be "puppeteer" */
  provider: 'puppeteer';
  
  /** Run browser in headless mode (no visible UI) */
  headless?: boolean;
  
  /** Path to Chrome/Chromium executable */
  browserPath?: string;
  
  /** Default timeout for operations in milliseconds */
  timeout?: number;
  
  /** Custom user agent string */
  userAgent?: string;
  
  /** Browser viewport dimensions */
  viewport?: {
    /** Browser viewport width in pixels */
    width: number;
    /** Browser viewport height in pixels */
    height: number;
  };
  
  /** Additional browser launch arguments */
  args?: string[];
  
  /** Default wait timeout in milliseconds */
  defaultTimeout?: number;
  
  /** Slow down operations by specified milliseconds */
  slowMo?: number;
}

/**
 * Default Puppeteer configuration
 */
export const DEFAULT_PUPPETEER_CONFIG: Partial<PuppeteerConfig> = {
  headless: true,
  timeout: 30000,
  viewport: {
    width: 1366,
    height: 768
  },
  defaultTimeout: 30000,
  slowMo: 0,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox', 
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--remote-debugging-port=9222'
  ]
};

/**
 * Puppeteer-specific capabilities
 */
export interface PuppeteerCapabilities {
  /** Browser automation capabilities */
  browser: {
    navigate: boolean;
    click: boolean;
    type: boolean;
    read: boolean;
    wait: boolean;
    waitFor: boolean;
    scroll: boolean;
    screenshot: boolean;
    hover: boolean;
    select: boolean;
    clear: boolean;
  };
  
  /** Element selection strategies */
  selectors: {
    css: boolean;
    xpath: boolean;
    text: boolean;
    ariaLabel: boolean;
    testId: boolean;
    coordinates: boolean;
  };
  
  /** Advanced features */
  advanced: {
    javascriptExecution: boolean;
    fileUpload: boolean;
    downloadHandling: boolean;
    popupHandling: boolean;
    iframes: boolean;
    multipleTabs: boolean;
  };
}

/**
 * Default Puppeteer capabilities
 */
export const DEFAULT_PUPPETEER_CAPABILITIES: PuppeteerCapabilities = {
  browser: {
    navigate: true,
    click: true,
    type: true,
    read: true,
    wait: true,
    waitFor: true,
    scroll: true,
    screenshot: true,
    hover: true,
    select: true,
    clear: true
  },
  selectors: {
    css: true,
    xpath: true,
    text: true,
    ariaLabel: true,
    testId: true,
    coordinates: true
  },
  advanced: {
    javascriptExecution: true,
    fileUpload: true,
    downloadHandling: true,
    popupHandling: true,
    iframes: true,
    multipleTabs: true
  }
};