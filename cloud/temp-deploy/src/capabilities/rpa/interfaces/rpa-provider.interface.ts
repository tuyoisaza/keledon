// Standard Action Format (SAF) - Universal workflow representation
// "Record once, play anywhere"

export interface ActionTarget {
    selector?: string;          // CSS selector (primary)
    xpath?: string;             // XPath expression (fallback)
    text?: string;              // Visible text content
    ariaLabel?: string;         // Accessibility label
    testId?: string;            // data-testid attribute
    coordinates?: {             // Last resort: screen position
        x: number;
        y: number;
    };
}

export type ActionType =
    | 'click'       // Click element
    | 'type'        // Type into input
    | 'read'        // Extract text
    | 'navigate'    // Go to URL
    | 'wait'        // Wait for duration
    | 'waitFor'     // Wait for element
    | 'scroll'      // Scroll page/element
    | 'screenshot'  // Capture screen
    | 'hover'       // Hover over element
    | 'select'      // Select dropdown option
    | 'clear'       // Clear input field
    ;

export interface StandardAction {
    id: string;
    type: ActionType;

    // Target element (for element-based actions)
    target?: ActionTarget;

    // Action-specific parameters
    value?: string;             // For 'type', 'select'
    url?: string;               // For 'navigate'
    duration?: number;          // For 'wait' (ms)
    saveAs?: string;            // Variable name for 'read'
    scrollDirection?: 'up' | 'down' | 'left' | 'right';
    scrollAmount?: number;      // Pixels to scroll

    // Recording metadata
    timestamp?: number;
    screenshot?: string;        // Base64 thumbnail
    humanDescription?: string;  // Natural language description for AI

    // Execution options
    optional?: boolean;         // Continue if fails
    timeout?: number;           // Max wait time (ms)
    retries?: number;           // Retry count on failure
}

export interface RpaProviderConfig {
    provider: 'native-dom' | 'chrome-mv3' | 'content-scripts' | 'playwright' | 'playwright-mcp' | 'local-http' | 'puppeteer' | 'stagehand';
    headless?: boolean;
    browserPath?: string;
    openaiApiKey?: string;      // Required for stagehand
    timeout?: number;
    userAgent?: string;
    apiUrl?: string;
}

export interface RpaExecutionResult {
    success: boolean;
    actionId: string;
    output?: string;            // For 'read' actions
    error?: string;
    durationMs: number;
    screenshot?: string;        // Captured screenshot if any
}

// RPA Provider Interface - All providers must implement this
export interface RpaProvider {
    readonly name: string;
    readonly requiresBackend: boolean;
    readonly requiresApiKey: boolean;

    // Lifecycle
    connect(config: RpaProviderConfig): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    // Execute single action
    execute(action: StandardAction, variables: Record<string, string>): Promise<RpaExecutionResult>;

    // Execute multiple actions (workflow)
    executeWorkflow(
        actions: StandardAction[],
        variables: Record<string, string>,
        onStep?: (stepIndex: number, result: RpaExecutionResult) => void
    ): Promise<RpaExecutionResult[]>;

    // Optional: Navigate to URL
    navigate?(url: string): Promise<void>;

    // Optional: Get current URL
    getCurrentUrl?(): Promise<string>;

    // Optional: Take screenshot
    screenshot?(): Promise<string>;
}

// Helper to interpolate variables in action values
export function interpolateVariables(
    template: string,
    variables: Record<string, string>
): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
        return variables[key] ?? match;
    });
}

// Helper to get best available selector from target
export function getBestSelector(target: ActionTarget): string | null {
    if (target.selector) return target.selector;
    if (target.testId) return `[data-testid="${target.testId}"]`;
    if (target.ariaLabel) return `[aria-label="${target.ariaLabel}"]`;
    return null;
}

