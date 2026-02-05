import { Injectable } from '@nestjs/common';
import { Decision, DecisionRule, DecisionContext, RoutingTable } from './interfaces/decision.interfaces';

@Injectable()
export class DecisionEngineService {
  private routingTable: RoutingTable = {};
  private decisionHistory: Map<string, Decision[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  async makeDecision(context: DecisionContext): Promise<Decision> {
    const rules = this.routingTable[context.intent] || [];
    const sortedRules = rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.condition(context)) {
        const decision = rule.action(context);
        this.recordDecision(context.sessionId, decision);
        return decision;
      }
    }

    const fallbackDecision: Decision = {
      id: this.generateId(),
      type: 'escalate',
      priority: 999,
      context,
      metadata: {
        timestamp: new Date(),
        agent: 'system',
        confidence: 0.1
      }
    };

    this.recordDecision(context.sessionId, fallbackDecision);
    return fallbackDecision;
  }

  registerRule(intent: string, rule: DecisionRule): void {
    if (!this.routingTable[intent]) {
      this.routingTable[intent] = [];
    }
    this.routingTable[intent].push(rule);
  }

  getDecisionHistory(sessionId: string): Decision[] {
    return this.decisionHistory.get(sessionId) || [];
  }

  private initializeDefaultRules(): void {
    this.registerRule('ui_automation', {
      id: 'ui-routing',
      name: 'Route to UI Agent',
      condition: (ctx: DecisionContext) => {
        return ctx.availableAgents.some(agent => 
          agent.capabilities.includes('ui_automation') && agent.availability
        );
      },
      action: (ctx: DecisionContext) => ({
        id: this.generateId(),
        type: 'delegate',
        priority: 1,
        context: ctx,
        metadata: {
          timestamp: new Date(),
          agent: 'ui-agent',
          confidence: 0.9
        }
      }),
      priority: 1,
      enabled: true
    });

    this.registerRule('voice_processing', {
      id: 'voice-routing',
      name: 'Route to Voice Agent',
      condition: (ctx: DecisionContext) => {
        return ctx.availableAgents.some(agent => 
          agent.capabilities.includes('voice_processing') && agent.availability
        );
      },
      action: (ctx: DecisionContext) => ({
        id: this.generateId(),
        type: 'delegate',
        priority: 1,
        context: ctx,
        metadata: {
          timestamp: new Date(),
          agent: 'voice-agent',
          confidence: 0.9
        }
      }),
      priority: 1,
      enabled: true
    });
  }

  private recordDecision(sessionId: string, decision: Decision): void {
    const history = this.decisionHistory.get(sessionId) || [];
    history.push(decision);
    this.decisionHistory.set(sessionId, history);
  }

  private generateId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}