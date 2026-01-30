/**
 * Brain Routing Engine
 * Config-based routing for conversation flow management
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface RoutingConfig {
  rules: RoutingRule[];
  fallback: string;
  timeoutMs: number;
}

export interface RoutingRule {
  id: string;
  conditions: RoutingCondition[];
  target: string;
  priority: number;
  enabled: boolean;
}

export interface RoutingCondition {
  type: 'intent' | 'entity' | 'context' | 'user' | 'system';
  key: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'exists' | 'notExists';
  value: string | number | boolean | string[];
}

export interface RouteContext {
  conversationId: string;
  userId: string;
  sessionId: string;
  currentIntent?: string;
  entities?: Record<string, any>;
  context?: Record<string, any>;
  user?: Record<string, any>;
  system?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface RouteResult {
  routeId: string;
  target: string;
  matchedConditions: RoutingCondition[];
  confidence: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class BrainRouter {
  private readonly logger = new Logger(BrainRouter.name);
  private config: RoutingConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
  }

  /**
   * Load routing configuration from environment or config files
   */
  private loadConfig(): RoutingConfig {
    try {
      const rawConfig = this.configService.get<RoutingConfig>('brain.routing');
      if (rawConfig) {
        return rawConfig;
      }

      // Default configuration
      return {
        rules: [
          {
            id: 'default-intent-router',
            conditions: [
              { type: 'intent', key: 'intent', operator: 'exists', value: true }
            ],
            target: 'intent-handler',
            priority: 10,
            enabled: true
          },
          {
            id: 'fallback-router',
            conditions: [],
            target: 'fallback-handler',
            priority: 1,
            enabled: true
          }
        ],
        fallback: 'fallback-handler',
        timeoutMs: 5000
      };
    } catch (error) {
      this.logger.error('Failed to load routing config', error);
      return {
        rules: [],
        fallback: 'fallback-handler',
        timeoutMs: 5000
      };
    }
  }

  /**
   * Route a conversation based on context
   */
  route(context: RouteContext): Observable<RouteResult> {
    return of(context).pipe(
      switchMap(ctx => this.findBestRoute(ctx)),
      catchError(error => {
        this.logger.error('Routing failed', error);
        return of({
          routeId: 'error-route',
          target: this.config.fallback,
          matchedConditions: [],
          confidence: 0,
          metadata: { error: error.message }
        });
      })
    );
  }

  /**
   * Find the best matching route
   */
  private findBestRoute(context: RouteContext): Observable<RouteResult> {
    const enabledRules = this.config.rules.filter(rule => rule.enabled);
    
    if (enabledRules.length === 0) {
      return of({
        routeId: 'no-rules',
        target: this.config.fallback,
        matchedConditions: [],
        confidence: 0
      });
    }

    // Evaluate all rules and find the best match
    const matches: { rule: RoutingRule; confidence: number; matchedConditions: RoutingCondition[] }[] = [];

    for (const rule of enabledRules) {
      const { confidence, matchedConditions } = this.evaluateRule(rule, context);
      if (confidence > 0) {
        matches.push({ rule, confidence, matchedConditions });
      }
    }

    if (matches.length === 0) {
      return of({
        routeId: 'fallback',
        target: this.config.fallback,
        matchedConditions: [],
        confidence: 0.1
      });
    }

    // Sort by confidence and priority
    matches.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return a.rule.priority - b.rule.priority;
    });

    const bestMatch = matches[0];
    return of({
      routeId: bestMatch.rule.id,
      target: bestMatch.rule.target,
      matchedConditions: bestMatch.matchedConditions,
      confidence: bestMatch.confidence,
      metadata: {
        totalRules: enabledRules.length,
        matchedRules: matches.length,
        rulePriority: bestMatch.rule.priority
      }
    });
  }

  /**
   * Evaluate a single rule against context
   */
  private evaluateRule(rule: RoutingRule, context: RouteContext): { confidence: number; matchedConditions: RoutingCondition[] } {
    let confidence = 1.0;
    const matchedConditions: RoutingCondition[] = [];

    for (const condition of rule.conditions) {
      const conditionConfidence = this.evaluateCondition(condition, context);
      if (conditionConfidence > 0) {
        matchedConditions.push(condition);
      } else {
        // If any condition fails, rule doesn't match
        return { confidence: 0, matchedConditions: [] };
      }
      
      // Reduce confidence for each condition (more conditions = lower confidence)
      confidence *= conditionConfidence;
    }

    return { confidence, matchedConditions };
  }

  /**
   * Evaluate a single condition against context
   */
  private evaluateCondition(condition: RoutingCondition, context: RouteContext): number {
    try {
      const value = this.extractValue(condition.key, condition.type, context);
      
      if (value === undefined || value === null) {
        return condition.operator === 'notExists' ? 1.0 : 0.0;
      }

      switch (condition.operator) {
        case 'equals':
          return this.compareValues(value, condition.value, 'equals') ? 1.0 : 0.0;
        case 'contains':
          return this.compareValues(value, condition.value, 'contains') ? 1.0 : 0.0;
        case 'startsWith':
          return this.compareValues(value, condition.value, 'startsWith') ? 1.0 : 0.0;
        case 'endsWith':
          return this.compareValues(value, condition.value, 'endsWith') ? 1.0 : 0.0;
        case 'matches':
          return this.compareValues(value, condition.value, 'matches') ? 1.0 : 0.0;
        case 'exists':
          return 1.0;
        case 'notExists':
          return 0.0;
        default:
          return 0.0;
      }
    } catch (error) {
      this.logger.warn(`Condition evaluation failed: ${condition.id}`, error);
      return 0.0;
    }
  }

  /**
   * Extract value from context based on condition type
   */
  private extractValue(key: string, type: RoutingCondition['type'], context: RouteContext): any {
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
   * Get routing configuration
   */
  getConfig(): RoutingConfig {
    return this.config;
  }

  /**
   * Update routing configuration dynamically
   */
  updateConfig(newConfig: Partial<RoutingConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      rules: newConfig.rules ? [...newConfig.rules] : this.config.rules
    };
    this.logger.log(`Routing config updated: ${JSON.stringify(newConfig)}`);
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): RoutingRule | undefined {
    return this.config.rules.find(rule => rule.id === id);
  }

  /**
   * Add new rule
   */
  addRule(rule: RoutingRule): void {
    this.config.rules.push(rule);
    this.logger.log(`Rule added: ${rule.id}`);
  }

  /**
   * Remove rule by ID
   */
  removeRule(id: string): void {
    const index = this.config.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.config.rules.splice(index, 1);
      this.logger.log(`Rule removed: ${id}`);
    }
  }
}

// Export singleton instances
export const brainRouter = new BrainRouter(null as any);
export const defaultRouter = brainRouter;