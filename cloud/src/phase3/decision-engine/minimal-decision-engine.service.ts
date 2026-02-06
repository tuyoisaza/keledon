import { Injectable } from '@nestjs/common';
import { 
  MinimalDecisionInput, 
  MinimalDecision, 
  MinimalDecisionRule 
} from './interfaces/minimal-decision.interfaces';

@Injectable()
export class MinimalDecisionEngineService {
  private rules: MinimalDecisionRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  async makeDecision(input: MinimalDecisionInput): Promise<MinimalDecision> {
    const content = input.text || input.event || '';
    
    for (const rule of this.rules) {
      if (this.matchesRule(content, rule.pattern)) {
        return {
          decision_type: rule.decision.decision_type || 'suggestion',
          confidence: rule.decision.confidence || 0.5,
          reasoning: rule.decision.reasoning || 'Matched predefined rule',
          next_action: rule.decision.next_action || null
        };
      }
    }

    // Default fallback decision
    return {
      decision_type: 'suggestion',
      confidence: 0.1,
      reasoning: 'No specific rule matched',
      next_action: null
    };
  }

  addRule(rule: MinimalDecisionRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  getRules(): MinimalDecisionRule[] {
    return [...this.rules];
  }

  clearRules(): void {
    this.rules = [];
  }

  private matchesRule(content: string, pattern: RegExp | string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(content);
    }
    return content.toLowerCase().includes(pattern.toLowerCase());
  }

  private initializeDefaultRules(): void {
    // Example rule for policy-related queries
    this.addRule({
      pattern: /policy|guideline|rule/i,
      decision: {
        decision_type: 'suggestion',
        confidence: 0.82,
        reasoning: 'Matched policy-related query pattern',
        next_action: 'search_knowledge_base'
      },
      priority: 1
    });

    // Example rule for urgent requests
    this.addRule({
      pattern: /urgent|emergency|critical/i,
      decision: {
        decision_type: 'escalate',
        confidence: 0.95,
        reasoning: 'Detected urgency markers',
        next_action: 'notify_supervisor'
      },
      priority: 2
    });

    // Example rule for simple informational queries
    this.addRule({
      pattern: /what|how|when|where/i,
      decision: {
        decision_type: 'suggestion',
        confidence: 0.65,
        reasoning: 'Informational query detected',
        next_action: null
      },
      priority: 0
    });
  }
}