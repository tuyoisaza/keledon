/**
 * Policy Enforcement System
 * Safety rules and guardrails for conversation management
 */

import { Injectable, Logger } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

export interface PolicyRule {
  id: string;
  type: 'safety' | 'security' | 'compliance' | 'usage' | 'content';
  condition: PolicyCondition;
  action: 'allow' | 'block' | 'warn' | 'redirect' | 'log';
  priority: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface PolicyCondition {
  operator: 'and' | 'or' | 'not';
  conditions: PolicyConditionItem[];
}

export interface PolicyConditionItem {
  type: 'intent' | 'entity' | 'context' | 'user' | 'system' | 'content' | 'frequency';
  key: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'gt' | 'lt' | 'in' | 'notIn' | 'exists' | 'notExists';
  value: string | number | boolean | string[] | Record<string, any>;
}

export interface PolicyViolation {
  ruleId: string;
  ruleType: PolicyRule['type'];
  violationType: PolicyRule['action'];
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  context: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PolicyResult {
  allowed: boolean;
  violations: PolicyViolation[];
  actions: PolicyAction[];
  confidence: number;
  processingTimeMs: number;
}

export interface PolicyAction {
  type: 'block' | 'warn' | 'redirect' | 'log' | 'notify';
  target: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class PolicyEnforcer {
  private readonly logger = new Logger(PolicyEnforcer.name);
  
  // Default policy rules for safety and security
  private readonly DEFAULT_POLICIES: PolicyRule[] = [
    {
      id: 'safety-profanity',
      type: 'safety',
      condition: {
        operator: 'or',
        conditions: [
          { type: 'content', key: 'text', operator: 'contains', value: ['fuck', 'shit', 'bitch', 'asshole', 'bastard'] },
          { type: 'content', key: 'text', operator: 'matches', value: '/\\b(fu?ck|sh[i1]t|b[i1]tch|a[s5]{2}h[o0]le|b[ae]st[ae]rd)\\b/i' }
        ]
      },
      action: 'block',
      priority: 100,
      enabled: true,
      metadata: { severity: 'high' }
    },
    {
      id: 'safety-hate-speech',
      type: 'safety',
      condition: {
        operator: 'or',
        conditions: [
          { type: 'content', key: 'text', operator: 'contains', value: ['nigger', 'kike', 'fag', 'dyke', 'tranny'] },
          { type: 'content', key: 'text', operator: 'matches', value: '/\\b(nigg[e3]r|k[i1]ke|f[ae]g|d[y1]ke|tr[ae]nn[y1])\\b/i' }
        ]
      },
      action: 'block',
      priority: 95,
      enabled: true,
      metadata: { severity: 'critical' }
    },
    {
      id: 'security-personal-info',
      type: 'security',
      condition: {
        operator: 'and',
        conditions: [
          { type: 'intent', key: 'intent', operator: 'equals', value: 'information_request' },
          { type: 'entity', key: 'personal_info', operator: 'exists', value: true }
        ]
      },
      action: 'warn',
      priority: 90,
      enabled: true,
      metadata: { severity: 'medium' }
    },
    {
      id: 'compliance-age-restriction',
      type: 'compliance',
      condition: {
        operator: 'and',
        conditions: [
          { type: 'user', key: 'age', operator: 'lt', value: 18 },
          { type: 'intent', key: 'intent', operator: 'in', value: ['adult_content', 'gambling', 'alcohol'] }
        ]
      },
      action: 'block',
      priority: 85,
      enabled: true,
      metadata: { severity: 'high' }
    },
    {
      id: 'usage-rate-limit',
      type: 'usage',
      condition: {
        operator: 'and',
        conditions: [
          { type: 'frequency', key: 'requests_per_minute', operator: 'gt', value: 60 },
          { type: 'context', key: 'user_id', operator: 'exists', value: true }
        ]
      },
      action: 'block',
      priority: 80,
      enabled: true,
      metadata: { severity: 'medium', cooldown: 60 }
    },
    {
      id: 'content-malicious-links',
      type: 'content',
      condition: {
        operator: 'or',
        conditions: [
          { type: 'content', key: 'text', operator: 'contains', value: ['bit.ly', 'tinyurl.com', 'goo.gl'] },
          { type: 'content', key: 'text', operator: 'matches', value: '/https?:\\/\\/(www\\.)?[a-zA-Z0-9\\-]+\\.[a-zA-Z]{2,}(\\/[^\\s]*)?/i' }
        ]
      },
      action: 'warn',
      priority: 75,
      enabled: true,
      metadata: { severity: 'medium' }
    },
    {
      id: 'conversation-state-validation',
      type: 'safety',
      condition: {
        operator: 'and',
        conditions: [
          { type: 'context', key: 'conversation_state', operator: 'equals', value: 'error' },
          { type: 'intent', key: 'intent', operator: 'exists', value: true }
        ]
      },
      action: 'redirect',
      priority: 70,
      enabled: true,
      metadata: { target: 'fallback-handler', severity: 'medium' }
    },
    {
      id: 'user-permission-check',
      type: 'security',
      condition: {
        operator: 'and',
        conditions: [
          { type: 'user', key: 'role', operator: 'equals', value: 'guest' },
          { type: 'intent', key: 'intent', operator: 'in', value: ['admin', 'system', 'debug'] }
        ]
      },
      action: 'block',
      priority: 65,
      enabled: true,
      metadata: { severity: 'high' }
    }
  ];

  private policies: PolicyRule[];

  constructor() {
    this.policies = [...this.DEFAULT_POLICIES];
    this.logger.log('PolicyEnforcer initialized with', this.policies.length, 'default policies');
  }

  /**
   * Enforce policies on conversation context
   */
  enforce(context: any): Observable<PolicyResult> {
    const startTime = Date.now();
    
    try {
      const violations: PolicyViolation[] = [];
      const actions: PolicyAction[] = [];
      
      // Evaluate all enabled policies
      const enabledPolicies = this.policies.filter(policy => policy.enabled);
      
      for (const policy of enabledPolicies) {
        const result = this.evaluatePolicy(policy, context);
        if (!result.allowed) {
          violations.push({
            ruleId: policy.id,
            ruleType: policy.type,
            violationType: policy.action,
            severity: this.getSeverity(policy.metadata?.severity || 'medium'),
            message: `Policy violation: ${policy.id}`,
            timestamp: Date.now(),
            context: { ...context },
            metadata: policy.metadata
          });
          
          // Generate appropriate action
          const action: PolicyAction = {
            type: policy.action as any,
            target: policy.metadata?.target || '',
            payload: {
              ruleId: policy.id,
              violation: result.reason,
              context: context
            },
            metadata: policy.metadata
          };
          actions.push(action);
        }
      }

      // Determine overall result
      const allowed = violations.length === 0;
      const confidence = allowed ? 1.0 : Math.max(0.1, 1.0 - (violations.length / 10));
      
      const result: PolicyResult = {
        allowed,
        violations,
        actions,
        confidence,
        processingTimeMs: Date.now() - startTime
      };

      this.logger.debug(`Policy enforcement: ${allowed ? 'ALLOWED' : 'BLOCKED'} (${violations.length} violations)`);

      return of(result);
    } catch (error) {
      this.logger.error('Policy enforcement failed', error);
      return of({
        allowed: false,
        violations: [{
          ruleId: 'error-policy',
          ruleType: 'safety',
          violationType: 'block',
          severity: 'critical',
          message: `Policy enforcement error: ${error.message}`,
          timestamp: Date.now(),
          context: {},
          metadata: { error: error.message }
        }],
        actions: [],
        confidence: 0.1,
        processingTimeMs: Date.now() - startTime
      });
    }
  }

  /**
   * Evaluate a single policy against context
   */
  private evaluatePolicy(policy: PolicyRule, context: any): { allowed: boolean; reason?: string } {
    try {
      const matches = this.evaluateCondition(policy.condition, context);
      
      if (matches) {
        return { allowed: policy.action === 'allow', reason: `Policy ${policy.id} matched` };
      }
      
      return { allowed: true };
    } catch (error) {
      this.logger.warn(`Policy evaluation failed for ${policy.id}:`, error);
      return { allowed: true, reason: `Evaluation error: ${error.message}` };
    }
  }

  /**
   * Evaluate condition tree
   */
  private evaluateCondition(condition: PolicyCondition, context: any): boolean {
    switch (condition.operator) {
      case 'and':
        return condition.conditions.every(c => this.evaluateConditionItem(c, context));
      case 'or':
        return condition.conditions.some(c => this.evaluateConditionItem(c, context));
      case 'not':
        return !condition.conditions.some(c => this.evaluateConditionItem(c, context));
      default:
        return false;
    }
  }

  /**
   * Evaluate single condition item
   */
  private evaluateConditionItem(item: PolicyConditionItem, context: any): boolean {
    try {
      const value = this.extractValue(item.key, item.type, context);
      
      if (value === undefined || value === null) {
        return item.operator === 'notExists' || item.operator === 'notIn';
      }

      switch (item.operator) {
        case 'equals':
          return this.compareValues(value, item.value, 'equals');
        case 'contains':
          return this.compareValues(value, item.value, 'contains');
        case 'startsWith':
          return this.compareValues(value, item.value, 'startsWith');
        case 'endsWith':
          return this.compareValues(value, item.value, 'endsWith');
        case 'matches':
          return this.compareValues(value, item.value, 'matches');
        case 'gt':
          return typeof value === 'number' && typeof item.value === 'number' && value > item.value;
        case 'lt':
          return typeof value === 'number' && typeof item.value === 'number' && value < item.value;
        case 'in':
          return Array.isArray(item.value) && item.value.includes(value);
        case 'notIn':
          return Array.isArray(item.value) && !item.value.includes(value);
        case 'exists':
          return value !== undefined && value !== null;
        case 'notExists':
          return value === undefined || value === null;
        default:
          return false;
      }
    } catch (error) {
      this.logger.warn(`Condition item evaluation failed: ${item.key}`, error);
      return false;
    }
  }

  /**
   * Extract value from context based on condition type
   */
  private extractValue(key: string, type: PolicyConditionItem['type'], context: any): any {
    switch (type) {
      case 'intent':
        return context.currentIntent;
      case 'entity':
        return context.entities?.[key];
      case 'context':
        return context.context?.[key];
      case 'user':
        return context.user?.[key];
      case 'system':
        return context.system?.[key];
      case 'content':
        return context.text || context.originalText || context.content;
      case 'frequency':
        return context[key];
      default:
        return undefined;
    }
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, expected: any, operator: string): boolean {
    if (actual === undefined || actual === null) return false;

    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.includes(expected);
        }
        if (Array.isArray(actual) && typeof expected === 'string') {
          return actual.some(item => String(item).includes(expected));
        }
        return false;
      case 'startsWith':
        return typeof actual === 'string' && typeof expected === 'string' && actual.startsWith(expected);
      case 'endsWith':
        return typeof actual === 'string' && typeof expected === 'string' && actual.endsWith(expected);
      case 'matches':
        if (typeof actual === 'string' && typeof expected === 'string') {
          try {
            const regex = new RegExp(expected);
            return regex.test(actual);
          } catch (e) {
            return false;
          }
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Get severity level
   */
  private getSeverity(severity: string): PolicyViolation['severity'] {
    switch (severity.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Add custom policy rule
   */
  addPolicy(rule: Omit<PolicyRule, 'id'> & { id?: string }): PolicyRule {
    const id = rule.id || `policy-${Date.now()}-${randomUUID()}`;
    
    const newRule: PolicyRule = {
      id,
      ...rule,
      priority: rule.priority ?? 50
    };

    this.policies.push(newRule);
    this.logger.log(`Added policy rule: ${id}`);
    
    return newRule;
  }

  /**
   * Remove policy rule by ID
   */
  removePolicy(id: string): boolean {
    const index = this.policies.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.policies.splice(index, 1);
      this.logger.log(`Removed policy rule: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Get policy by ID
   */
  getPolicy(id: string): PolicyRule | undefined {
    return this.policies.find(rule => rule.id === id);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): PolicyRule[] {
    return [...this.policies];
  }

  /**
   * Enable/disable policy
   */
  setPolicyEnabled(id: string, enabled: boolean): boolean {
    const policy = this.getPolicy(id);
    if (policy) {
      policy.enabled = enabled;
      this.logger.log(`Policy ${id} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Validate policies
   */
  validate(): boolean {
    try {
      // Check for duplicate IDs
      const ids = this.policies.map(p => p.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error('Duplicate policy IDs found');
      }

      // Check for valid priorities
      if (this.policies.some(policy => policy.priority < 0)) {
        throw new Error('Policy priorities must be non-negative');
      }

      return true;
    } catch (error) {
      this.logger.error('Policy validation failed', error);
      return false;
    }
  }

  /**
   * Get policy violations summary
   */
  getViolationsSummary(violations: PolicyViolation[]): Record<string, number> {
    const summary: Record<string, number> = {
      total: violations.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    violations.forEach(violation => {
      summary[violation.severity]++;
    });

    return summary;
  }
}

// Export singleton instance
export const policyEnforcer = new PolicyEnforcer();
export const defaultPolicyEnforcer = policyEnforcer;