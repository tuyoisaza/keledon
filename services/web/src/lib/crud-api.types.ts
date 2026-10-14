/** Public data shapes used by the CRUD and runtime API client. */

export interface Company {
    id: string;
    name: string;
    industry?: string;
    createdAt?: string;
    updatedAt?: string;
    countries?: CompanyCountry[];
}

export interface CompanyCountry {
    id?: string;
    companyId: string;
    countryCode: string;
}

export interface Brand {
    id: string;
    companyId: string;
    name: string;
    color?: string;
    createdAt?: string;
    updatedAt?: string;
    company?: { id: string; name: string };
}

export interface Team {
    id: string;
    name: string;
    brandId?: string;
    country?: string;
    sttProvider?: string;
    ttsProvider?: string;
    llmProvider?: string;
    createdAt?: string;
    updatedAt?: string;
    brand?: { id: string; name: string; color?: string; companyId?: string; company?: { id: string; name: string } };
    company?: { id: string; name: string };
    _count?: { users: number; keledons: number };
}

export interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    companyId?: string;
    teamId?: string;
    brandId?: string;
    isOnline?: boolean;
    lastLogin?: string;
    createdAt?: string;
    updatedAt?: string;
    company?: { id: string; name: string };
    team?: { id: string; name: string; brandId?: string; brand?: { id: string; name: string } };
}

export interface Keledon {
    id: string;
    teamId: string;
    brandId?: string;
    countryCode?: string;
    userId?: string;
    name: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    callsHandled?: number;
    fcrRate?: number;
    avgHandleTime?: number;
    autonomyLevel?: number;
    policies?: string;
    uiInterfaces?: string;
    createdAt?: string;
    updatedAt?: string;
    team?: { id: string; name: string; country?: string; brandId?: string; brand?: { id: string; name: string; companyId: string } };
    user?: { id: string; name: string; email: string };
}

export interface ManagedInterface {
    id: string;
    name: string;
    baseUrl: string;
    category?: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProviderCatalogEntry {
    id: string;
    type: string;
    name: string;
    status?: string;
    isEnabled: boolean;
}

export interface TenantProviderConfig {
    id: string;
    companyId: string;
    providerId: string;
    providerType: string;
    isEnabled: boolean;
    isDefault: boolean;
}

export interface TenantVoiceProfile {
    id: string;
    companyId: string;
    providerId: string;
    name: string;
    language?: string;
    isEnabled: boolean;
    isDefault: boolean;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    description?: string;
    companyId: string;
}

export interface Session {
    id: string;
    userId?: string;
    teamId?: string;
    status?: string;
    metadata?: string;
    createdAt?: string;
    updatedAt?: string;
    user?: { id: string; name: string };
    team?: { id: string; name: string };
}

export interface BrainChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface BrainChatRequest {
    message: string;
    history?: BrainChatMessage[];
    companyId?: string;
    companyName?: string;
    brandId?: string;
    brandName?: string;
    teamId?: string;
    teamName?: string;
    language?: string;
}

export interface BrainChatResponse {
    success: boolean;
    reply: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    context?: {
        companyId?: string;
        companyName?: string;
        brandId?: string;
        brandName?: string;
        teamId?: string;
        teamName?: string;
    };
}

export type KeledonMutationInput = {
    name?: string;
    teamId?: string;
    brandId?: string;
    countryCode?: string;
    userId?: string;
    email?: string;
    role?: string;
    autonomyLevel?: number;
    uiInterfaces?: string[];
};

export interface Flow {
    id: string;
    name: string;
    description?: string;
    triggerKeywords?: string;
    category?: string;
    tool?: string;
    teamId?: string;
    isActive?: boolean;
    version?: number;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    steps?: FlowStep[];
}

export interface FlowStep {
    id: string;
    flowId: string;
    order: number;
    type: string;
    selector?: string;
    selectorType?: string;
    value?: string;
    extract?: string;
    waitFor?: string;
    condition?: string;
    timeout?: number;
    optional?: boolean;
    nextStepId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SubAgentStatus {
    id: string;
    role: string;
    status: 'idle' | 'active' | 'waiting' | 'error';
    currentTask?: SubAgentTask;
    lastActivity?: string;
}

export interface SubAgentTask {
    id: string;
    type: 'flow' | 'read' | 'write' | 'wait';
    flowId?: string;
    stepIds?: string[];
    parameters?: Record<string, any>;
    priority?: number;
}

export interface FlowExecutionResult {
    success: boolean;
    flowId: string;
    extractedData: Record<string, any>;
    executionLog: Array<{
        stepId: string;
        stepType: string;
        status: 'success' | 'failed' | 'skipped';
        duration: number;
        result?: any;
        error?: string;
    }>;
    totalDuration: number;
}

export interface InitializeSessionResponse {
    success: boolean;
    agents: SubAgentStatus[];
}

export interface Vendor {
    id: string;
    teamId: string;
    name: string;
    type: string;
    baseUrl?: string;
    allowedOrigins?: string[];
    username?: string;
    hasPassword?: boolean;
    hasApiKey?: boolean;
    isActive: boolean;
    startGoal?: string;
    createdAt?: string;
    updatedAt?: string;
}
