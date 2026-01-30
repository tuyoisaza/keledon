// Managed Interface - External web app connection
export type InterfaceCategory = 'talk' | 'case';

export interface ManagedInterface {
    id: string;
    name: string;           // "Salesforce Production"
    baseUrl: string;        // "https://api.salesforce.com"
    icon?: string;          // Icon URL or emoji
    category?: InterfaceCategory;
    providerKey?: string;   // "genesys", "avaya", "salesforce"
    capabilities?: Record<string, any>;
    status: 'connected' | 'disconnected' | 'error';
    credentials?: InterfaceCredentials;
    createdAt: string;
    updatedAt: string;
}

export interface InterfaceCredentials {
    type: 'oauth' | 'apiKey' | 'basic' | 'none';
    apiKey?: string;
    oauth?: {
        clientId: string;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: string;
    };
    basic?: {
        username: string;
        password: string;
    };
}

// Workflow Step Types
export type WorkflowStepType =
    | 'click'       // Click element
    | 'type'        // Type into input
    | 'read'        // Read text from element
    | 'navigate'    // Go to URL
    | 'speak'       // TTS output
    | 'listen'      // STT input
    | 'wait'        // Delay
    | 'condition'   // Branching logic
    | 'extract'     // Extract data via regex/selector
    | 'api'         // Make API call
    ;

export interface WorkflowStep {
    id: string;
    type: WorkflowStepType;
    name?: string;              // Human-readable step name

    // UI Automation
    selector?: string;          // CSS selector for click/type/read
    value?: string;             // Text to type or static value
    url?: string;               // For navigate

    // Voice
    speakTemplate?: string;     // "Your order {{status}}" - supports variables
    listenTimeout?: number;     // Max seconds to wait for speech

    // Data
    variable?: string;          // Store result in variable name
    extractPattern?: string;    // Regex pattern for extract

    // Control Flow
    waitMs?: number;            // Milliseconds to wait
    condition?: {
        variable: string;
        operator: 'equals' | 'contains' | 'gt' | 'lt' | 'exists' | 'empty';
        value: string;
    };
    onTrue?: string;            // Step ID to jump to
    onFalse?: string;           // Step ID to jump to

    // Recording Metadata
    recordedAt?: string;
    screenshot?: string;        // Base64 thumbnail
}

export interface Workflow {
    id: string;
    name: string;               // "Check Order Status"
    description?: string;
    trigger: WorkflowTrigger;
    interfaceId: string;        // Which ManagedInterface to use
    steps: WorkflowStep[];
    variables: Record<string, string>; // Default variable values
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FlowStep {
    id: string;
    action: string;
    selector?: string;
    value?: string;
    url?: string;
    timeout?: number;
    waitMs?: number;
    humanDescription?: string;
}

export type FlowVersionStatus = 'draft' | 'approved' | 'deprecated';

export interface FlowDefinition {
    id: string;
    companyId?: string;
    interfaceId?: string;
    name: string;
    category?: InterfaceCategory;
    intentTags: string[];
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FlowVersion {
    id: string;
    flowDefinitionId: string;
    version: number;
    steps: FlowStep[];
    status: FlowVersionStatus;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TenantFlowPermission {
    id: string;
    companyId: string;
    flowDefinitionId: string;
    isEnabled: boolean;
    defaultForIntent?: string;
    createdAt: string;
    updatedAt: string;
}

export interface IntentFlowMapping {
    id: string;
    companyId: string;
    intent: string;
    allowedFlowDefinitionIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface FlowRun {
    id: string;
    flowVersionId: string;
    sessionId?: string;
    companyId?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: string;
    completedAt?: string;
}

export interface FlowRunEvidence {
    id: string;
    flowRunId: string;
    stepIndex?: number;
    action?: string;
    selector?: string;
    value?: string;
    screenshotHash?: string;
    result?: string;
    createdAt: string;
}

export interface WorkflowTrigger {
    type: 'intent' | 'keyword' | 'manual' | 'event';
    value: string;              // Intent name, keyword, or event type
    confidence?: number;        // Min confidence for intent (0-1)
}

// Execution Context
export interface WorkflowExecution {
    id: string;
    workflowId: string;
    sessionId: string;          // Call session ID
    status: 'running' | 'paused' | 'completed' | 'failed';
    currentStepIndex: number;
    variables: Record<string, string>;
    startedAt: string;
    completedAt?: string;
    error?: string;
    stepResults: StepResult[];
}

export interface StepResult {
    stepId: string;
    status: 'success' | 'failed' | 'skipped';
    output?: string;            // Result of read/listen/extract
    error?: string;
    executedAt: string;
    durationMs: number;
}
