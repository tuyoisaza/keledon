/**
 * Type definitions for AutoBrowse Bridge.
 */

// Re-export types used elsewhere for convenience
export type { GoalPlannerAction as GoalAction } from './goal-planner';
export type { RpaStep } from './rpa-executor';

import type { StepResult } from './autobrowse-actions';
export type { StepResult };

export interface BridgeGoalInput {
  execution_id?: string;
  goal: string;
  inputs?: Record<string, unknown>;
  constraints?: {
    max_steps?: number;
    timeout_ms?: number;
  };
  success_criteria?: string;
}

export interface BridgeExecutionResult {
  execution_id: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  goal_status: 'success' | 'failed' | 'uncertain' | 'aborted';
  steps: StepResult[];
  duration: number;
  artifacts: {
    screenshots: string[];
    logs: string[];
  };
  error?: string;
}

/**
 * Browser state snapshot.
 */
export interface BrowserState {
  url: string;
  title: string;
  tabs: { id: string; url: string; title: string }[];
}
