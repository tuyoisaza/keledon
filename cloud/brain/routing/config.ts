/**
 * Brain Routing Configuration
 * Manages routing configuration for conversation flow
 */

export interface RoutingRule {
  id: string;
  pattern: string;
  target: string;
  priority: number;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface RoutingConfig {
  rules: RoutingRule[];
  defaultRoute: string;
  fallbackRoute: string;
  timeoutMs: number;
  maxRetries: number;
}

export class RoutingConfigManager {
  private config: RoutingConfig;
  private readonly DEFAULT_CONFIG: RoutingConfig = {
    rules: [],
    defaultRoute: 'default',
    fallbackRoute: 'fallback',
    timeoutMs: 30000,
    maxRetries: 3
  };

  constructor(config?: Partial<RoutingConfig>) {
    this.config = {
      ...this.DEFAULT_CONFIG,
      ...config
    };
  }

  /**
   * Get routing configuration
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  /**
   * Update routing configuration
   */
  updateConfig(newConfig: Partial<RoutingConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Add routing rule
   */
  addRule(rule: Omit<RoutingRule, 'id'> & { id?: string }): RoutingRule {
    const id = rule.id || `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newRule: RoutingRule = {
      id,
      ...rule,
      priority: rule.priority ?? 100
    };

    this.config.rules.push(newRule);
    return newRule;
  }

  /**
   * Remove routing rule by ID
   */
  removeRule(id: string): boolean {
    const index = this.config.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.config.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): RoutingRule | undefined {
    return this.config.rules.find(rule => rule.id === id);
  }

  /**
   * Get rules by pattern
   */
  getRulesByPattern(pattern: string): RoutingRule[] {
    return this.config.rules.filter(rule => 
      rule.pattern === pattern || 
      rule.pattern.includes(pattern) ||
      pattern.includes(rule.pattern)
    );
  }

  /**
   * Get highest priority rule that matches
   */
  getMatchingRule(input: string, context?: Record<string, any>): RoutingRule | null {
    // Filter rules that match the input
    const matchingRules = this.config.rules.filter(rule => {
      // Simple pattern matching (could be enhanced with regex later)
      if (rule.pattern.startsWith('/') && rule.pattern.endsWith('/')) {
        // Regex pattern
        try {
          const regex = new RegExp(rule.pattern.slice(1, -1));
          return regex.test(input);
        } catch (e) {
          console.warn(`Invalid regex pattern: ${rule.pattern}`, e);
          return false;
        }
      }
      
      // Simple substring matching
      return input.toLowerCase().includes(rule.pattern.toLowerCase());
    });

    // Apply conditions if present
    const filteredRules = matchingRules.filter(rule => {
      if (!rule.conditions) return true;
      
      return Object.entries(rule.conditions).every(([key, value]) => {
        const contextValue = context?.[key];
        if (contextValue === undefined) return false;
        
        // Simple equality check for now
        return contextValue === value;
      });
    });

    // Return highest priority rule
    if (filteredRules.length === 0) return null;
    
    return filteredRules.reduce((best, current) => 
      current.priority < best.priority ? current : best
    );
  }

  /**
   * Validate configuration
   */
  validate(): boolean {
    try {
      // Check for duplicate IDs
      const ids = this.config.rules.map(rule => rule.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error('Duplicate rule IDs found');
      }

      // Check for valid priorities
      if (this.config.rules.some(rule => rule.priority < 0)) {
        throw new Error('Rule priorities must be non-negative');
      }

      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Load configuration from file or environment
   */
  async loadFromEnvironment(): Promise<void> {
    // In a real implementation, this would read from .env or config files
    // For now, we'll use the default config
    console.log('Loading routing configuration from environment...');
  }

  /**
   * Save configuration
   */
  save(): void {
    // In a real implementation, this would persist to file or database
    console.log('Routing configuration saved');
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...this.DEFAULT_CONFIG };
    console.log('Routing configuration reset to defaults');
  }

  /**
   * Get all routes
   */
  getAllRoutes(): string[] {
    return Array.from(new Set([
      this.config.defaultRoute,
      this.config.fallbackRoute,
      ...this.config.rules.map(rule => rule.target)
    ]));
  }
}

// Export singleton instances
export const routingConfig = new RoutingConfigManager();
export const defaultConfig = routingConfig;