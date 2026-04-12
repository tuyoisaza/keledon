import { Page } from 'playwright-core';
export interface CDPBrowserConfig {
    cdpUrl: string;
    timeout?: number;
}
export interface ExecutionContext {
    sessionId: string;
    flowId: string;
    tabId?: string;
    targetUrl?: string;
    metadata?: Record<string, unknown>;
}
export interface StructuredGoal {
    objective: string;
    target_app?: 'salesforce' | 'genesys' | 'web' | 'custom';
    target_url?: string;
    constraints?: {
        max_steps?: number;
        timeout_ms?: number;
        interactive?: boolean;
    };
}
export interface StepResult {
    step_id: string;
    action: string;
    status: 'success' | 'failure' | 'timeout' | 'uncertain';
    timestamp: string;
    duration_ms?: number;
    result?: {
        text?: string;
        attribute?: string;
        element_count?: number;
        url?: string;
    };
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    screenshot?: {
        data_url: string;
        width: number;
        height: number;
    };
    evidence?: Record<string, unknown>;
}
export interface ExecutionResult {
    execution_id: string;
    goal: string;
    goal_status: 'achieved' | 'failed' | 'uncertain';
    results: StepResult[];
    summary: {
        total_steps: number;
        successful_steps: number;
        failed_steps: number;
        uncertain_steps: number;
        execution_time_ms: number;
    };
    final_state: {
        url: string;
        title?: string;
        screenshots: string[];
    };
    timestamp: string;
}
export declare class AutoBrowseExecutor {
    private browser;
    private page;
    private isInitialized;
    private isCDPMode;
    /**
     * Initialize using CDP (connect to existing Electron Chromium)
     * This is the mode for Electron integration
     */
    connectOverCDP(config: CDPBrowserConfig): Promise<void>;
    /**
     * Legacy mode - launch own browser (for standalone service)
     * @deprecated Use connectOverCDP for Electron integration
     */
    launch(options?: {
        headless?: boolean;
        args?: string[];
    }): Promise<void>;
    /**
     * Get or create a page for execution
     */
    getPage(targetUrl?: string): Promise<Page>;
    /**
     * Execute structured goal
     */
    executeGoal(goal: StructuredGoal, executionContext: ExecutionContext): Promise<ExecutionResult>;
    /**
     * Plan execution based on structured goal
     */
    private planExecution;
    private planSalesforce;
    private planGenesys;
    private planGeneric;
    private executeStep;
    private shouldStopExecution;
    private determineGoalStatus;
    getPageURL(): Promise<string>;
    captureScreenshot(): Promise<string>;
    cleanup(): Promise<void>;
    isConnected(): boolean;
    getConnectionMode(): 'cdp' | 'launched';
}
export declare const autoBrowseExecutor: AutoBrowseExecutor;
