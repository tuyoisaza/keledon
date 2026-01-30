/**
 * Selector Optimization and Reliability
 * Provides fallback strategies and reliability improvements for element selection
 */

import { selectorManager, SelectorMap } from './selector-maps';

export interface SelectorReliabilityScore {
  selector: string;
  score: number;
  successCount: number;
  failureCount: number;
  lastUsed: Date;
  averageFindTime: number;
}

export interface ReliabilityConfig {
  minSuccessRate: number;
  maxAverageFindTime: number;
  fallbackTimeoutMs: number;
  maxRetries: number;
}

export class SelectorOptimizer {
  private reliabilityScores: Map<string, SelectorReliabilityScore> = new Map();
  private config: ReliabilityConfig = {
    minSuccessRate: 0.8,
    maxAverageFindTime: 1000,
    fallbackTimeoutMs: 5000,
    maxRetries: 3
  };

  /**
   * Find element with reliability tracking and optimization
   */
  async findReliableElement(
    domain: string, 
    elementName: string, 
    context: Document | Element = document
  ): Promise<Element | null> {
    const selectorMap = selectorManager.getSelectorMap(domain, elementName);
    if (!selectorMap) {
      return null;
    }

    // Try selectors in order of reliability
    const sortedSelectors = await this.getSortedSelectors(selectorMap);
    
    for (const selector of sortedSelectors) {
      const startTime = Date.now();
      const element = await this.findWithRetry(selector, context);
      const findTime = Date.now() - startTime;

      if (element) {
        this.recordSuccess(selector, findTime);
        return element;
      } else {
        this.recordFailure(selector);
      }
    }

    return null;
  }

  /**
   * Sort selectors by reliability score
   */
  private async getSortedSelectors(selectorMap: SelectorMap): Promise<string[]> {
    const selectors = [selectorMap.primary, ...selectorMap.fallbacks];
    
    return selectors.sort((a, b) => {
      const scoreA = this.reliabilityScores.get(a)?.score || 0;
      const scoreB = this.reliabilityScores.get(b)?.score || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Find element with retry logic
   */
  private async findWithRetry(selector: string, context: Document | Element): Promise<Element | null> {
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const element = context.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          return element;
        }
        
        if (attempt < this.config.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Selector error: ${selector}`, error);
      }
    }
    
    return null;
  }

  /**
   * Record successful selector usage
   */
  private recordSuccess(selector: string, findTime: number): void {
    const current = this.reliabilityScores.get(selector);
    
    if (current) {
      current.successCount++;
      current.lastUsed = new Date();
      current.averageFindTime = (current.averageFindTime + findTime) / 2;
      current.score = this.calculateScore(current);
    } else {
      this.reliabilityScores.set(selector, {
        selector,
        score: 1.0,
        successCount: 1,
        failureCount: 0,
        lastUsed: new Date(),
        averageFindTime: findTime
      });
    }
  }

  /**
   * Record failed selector usage
   */
  private recordFailure(selector: string): void {
    const current = this.reliabilityScores.get(selector);
    
    if (current) {
      current.failureCount++;
      current.lastUsed = new Date();
      current.score = this.calculateScore(current);
    } else {
      this.reliabilityScores.set(selector, {
        selector,
        score: 0.0,
        successCount: 0,
        failureCount: 1,
        lastUsed: new Date(),
        averageFindTime: 0
      });
    }
  }

  /**
   * Calculate reliability score
   */
  private calculateScore(score: SelectorReliabilityScore): number {
    const totalAttempts = score.successCount + score.failureCount;
    if (totalAttempts === 0) return 0;
    
    const successRate = score.successCount / totalAttempts;
    const speedFactor = Math.max(0, 1 - (score.averageFindTime / this.config.maxAverageFindTime));
    const recencyFactor = this.getRecencyFactor(score.lastUsed);
    
    return (successRate * 0.5) + (speedFactor * 0.3) + (recencyFactor * 0.2);
  }

  /**
   * Calculate recency factor (more recent usage gets higher score)
   */
  private getRecencyFactor(lastUsed: Date): number {
    const hoursSinceUse = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
    return Math.max(0, 1 - (hoursSinceUse / 24)); // Decay over 24 hours
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Get reliability report for all selectors
   */
  getReliabilityReport(): SelectorReliabilityScore[] {
    return Array.from(this.reliabilityScores.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get low-performing selectors
   */
  getLowPerformingSelectors(): SelectorReliabilityScore[] {
    return this.getReliabilityReport()
      .filter(score => 
        score.score < this.config.minSuccessRate ||
        score.averageFindTime > this.config.maxAverageFindTime
      );
  }

  /**
   * Optimize selector map based on performance data
   */
  optimizeSelectorMap(selectorMap: SelectorMap): SelectorMap {
    const sortedSelectors = [selectorMap.primary, ...selectorMap.fallbacks]
      .sort((a, b) => {
        const scoreA = this.reliabilityScores.get(a)?.score || 0;
        const scoreB = this.reliabilityScores.get(b)?.score || 0;
        return scoreB - scoreA;
      });

    return {
      primary: sortedSelectors[0],
      fallbacks: sortedSelectors.slice(1),
      attributes: selectorMap.attributes,
      text: selectorMap.text,
      index: selectorMap.index
    };
  }

  /**
   * Reset reliability scores
   */
  resetScores(): void {
    this.reliabilityScores.clear();
  }

  /**
   * Export reliability data
   */
  exportReliabilityData(): string {
    return JSON.stringify(Array.from(this.reliabilityScores.entries()));
  }

  /**
   * Import reliability data
   */
  importReliabilityData(data: string): void {
    try {
      const entries = JSON.parse(data);
      this.reliabilityScores = new Map(entries);
    } catch (error) {
      console.error('Failed to import reliability data:', error);
    }
  }

  /**
   * Generate alternative selectors for element
   */
  generateAlternativeSelectors(element: Element): string[] {
    const alternatives: string[] = [];

    // ID-based
    if (element.id) {
      alternatives.push(`#${element.id}`);
    }

    // Class-based (combinations)
    if (element.className) {
      const classes = element.className.split(' ').filter(cls => cls.trim());
      
      // Single class
      for (const cls of classes) {
        alternatives.push(`.${cls}`);
      }

      // Multiple class combinations
      if (classes.length > 1) {
        alternatives.push(`.${classes.join('.')}`);
        alternatives.push(`.${classes.slice(0, 2).join('.')}`);
      }
    }

    // Attribute-based
    const attributes = ['data-test', 'data-testid', 'aria-label', 'title', 'name', 'type', 'placeholder'];
    for (const attr of attributes) {
      const value = element.getAttribute(attr);
      if (value) {
        alternatives.push(`[${attr}="${value}"]`);
      }
    }

    // Tag + attribute combinations
    if (element.tagName) {
      for (const attr of attributes) {
        const value = element.getAttribute(attr);
        if (value) {
          alternatives.push(`${element.tagName.toLowerCase()}[${attr}="${value}"]`);
        }
      }
    }

    // Text content based
    const textContent = element.textContent?.trim();
    if (textContent && textContent.length < 50) {
      alternatives.push(`${element.tagName.toLowerCase()}:contains("${textContent}")`);
    }

    // XPath
    alternatives.push(this.generateXPath(element));

    // Filter out duplicates and limit
    return [...new Set(alternatives)].slice(0, 10);
  }

  /**
   * Generate XPath for element
   */
  private generateXPath(element: Element): string {
    const components: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let component = current.tagName.toLowerCase();
      
      if (current.id) {
        component += `[@id="${current.id}"]`;
        components.unshift(component);
        break;
      }

      let sibling = current;
      let siblingIndex = 1;
      while (sibling.previousElementSibling) {
        sibling = sibling.previousElementSibling;
        if (sibling.tagName === current.tagName) {
          siblingIndex++;
        }
      }

      if (siblingIndex > 1) {
        component += `[${siblingIndex}]`;
      }

      components.unshift(component);
      current = current.parentElement;
    }

    return '/' + components.join('/');
  }

  /**
   * Validate selector syntax
   */
  validateSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReliabilityConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const selectorOptimizer = new SelectorOptimizer();