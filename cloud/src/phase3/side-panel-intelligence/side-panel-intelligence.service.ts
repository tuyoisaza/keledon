import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  SidePanelComponent,
  PanelLayout,
  PanelTheme,
  UserInteraction,
  PanelAnalytics,
  SmartSuggestion,
  PanelWidget,
  AdaptiveLayout
} from './interfaces/side-panel-intelligence.interfaces';

@Injectable()
export class SidePanelIntelligenceService {
  private layouts: Map<string, PanelLayout> = new Map();
  private widgets: Map<string, PanelWidget> = new Map();
  private interactions: Map<string, UserInteraction[]> = new Map();
  private analytics: Map<string, PanelAnalytics> = new Map();
  private suggestions: SmartSuggestion[] = [];
  private adaptiveLayouts: Map<string, AdaptiveLayout> = new Map();

  constructor() {
    this.initializeDefaultWidgets();
    this.initializeDefaultTheme();
  }

  async createLayout(layout: PanelLayout): Promise<string> {
    layout.updatedAt = new Date();
    this.layouts.set(layout.id, layout);
    return layout.id;
  }

  async updateLayout(layoutId: string, updates: Partial<PanelLayout>): Promise<boolean> {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    Object.assign(layout, updates);
    layout.updatedAt = new Date();
    return true;
  }

  async getLayout(layoutId: string): Promise<PanelLayout | null> {
    return this.layouts.get(layoutId) || null;
  }

  async addComponent(layoutId: string, component: SidePanelComponent): Promise<boolean> {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    layout.components.push(component);
    layout.updatedAt = new Date();
    return true;
  }

  async removeComponent(layoutId: string, componentId: string): Promise<boolean> {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const index = layout.components.findIndex(c => c.id === componentId);
    if (index >= 0) {
      layout.components.splice(index, 1);
      layout.updatedAt = new Date();
      return true;
    }
    return false;
  }

  async recordInteraction(interaction: UserInteraction): Promise<void> {
    const sessionInteractions = this.interactions.get(interaction.sessionId) || [];
    sessionInteractions.push(interaction);
    this.interactions.set(interaction.sessionId, sessionInteractions);

    await this.updateAnalytics(interaction.componentId, interaction);
    await this.generateSmartSuggestions(interaction);
  }

  async getAnalytics(componentId: string): Promise<PanelAnalytics | null> {
    return this.analytics.get(componentId) || null;
  }

  async getSuggestions(context: Record<string, any>): Promise<SmartSuggestion[]> {
    return this.suggestions.filter(suggestion => 
      this.isSuggestionApplicable(suggestion, context)
    );
  }

  async createAdaptiveLayout(
    userId: string, 
    context: AdaptiveLayout['context']
  ): Promise<string> {
    const layout = await this.generateAdaptiveLayout(context);
    const adaptiveLayout: AdaptiveLayout = {
      id: this.generateId(),
      userId,
      context,
      layout,
      performance: {
        renderTime: 0,
        interactionResponse: 0,
        dataRefreshRate: 0
      }
    };

    this.adaptiveLayouts.set(adaptiveLayout.id, adaptiveLayout);
    return adaptiveLayout.id;
  }

  async updatePerformanceMetrics(
    layoutId: string,
    metrics: Partial<AdaptiveLayout['performance']>
  ): Promise<void> {
    for (const adaptiveLayout of this.adaptiveLayouts.values()) {
      if (adaptiveLayout.layout.id === layoutId) {
        Object.assign(adaptiveLayout.performance, metrics);
        await this.optimizeLayout(adaptiveLayout);
        break;
      }
    }
  }

  async getWidget(widgetId: string): Promise<PanelWidget | null> {
    return this.widgets.get(widgetId) || null;
  }

  async getWidgetsByCategory(category: PanelWidget['category']): Promise<PanelWidget[]> {
    return Array.from(this.widgets.values()).filter(widget => widget.category === category);
  }

  async personalizeLayout(userId: string, preferences: Record<string, any>): Promise<PanelLayout | null> {
    const userLayouts = Array.from(this.layouts.values())
      .filter(layout => layout.name.includes(userId));

    if (userLayouts.length === 0) return null;

    const layout = userLayouts[0];
    await this.applyPersonalization(layout, preferences);
    return layout;
  }

  async generateInsights(sessionId: string): Promise<{
    engagementScore: number;
    popularComponents: string[];
    suggestedImprovements: string[];
    usagePatterns: Record<string, any>;
  }> {
    const interactions = this.interactions.get(sessionId) || [];
    
    if (interactions.length === 0) {
      return {
        engagementScore: 0,
        popularComponents: [],
        suggestedImprovements: ['Start interacting with components'],
        usagePatterns: {}
      };
    }

    const engagementScore = this.calculateEngagementScore(interactions);
    const popularComponents = this.getPopularComponents(interactions);
    const suggestedImprovements = this.generateImprovements(interactions);
    const usagePatterns = this.analyzeUsagePatterns(interactions);

    return {
      engagementScore,
      popularComponents,
      suggestedImprovements,
      usagePatterns
    };
  }

  private initializeDefaultWidgets(): void {
    const defaultWidgets: PanelWidget[] = [
      {
        id: 'system-monitor',
        name: 'System Monitor',
        description: 'Monitor system performance and health',
        category: 'monitoring',
        defaultSize: { width: 300, height: 200 },
        minSize: { width: 200, height: 150 },
        maxSize: { width: 500, height: 400 },
        resizable: true,
        draggable: true,
        configSchema: {
          refreshInterval: { type: 'number', default: 5000 },
          metrics: { type: 'array', default: ['cpu', 'memory', 'disk'] }
        },
        refreshInterval: 5000
      },
      {
        id: 'voice-control',
        name: 'Voice Control',
        description: 'Control system with voice commands',
        category: 'control',
        defaultSize: { width: 250, height: 150 },
        minSize: { width: 200, height: 100 },
        maxSize: { width: 400, height: 300 },
        resizable: true,
        draggable: true,
        configSchema: {
          language: { type: 'string', default: 'en-US' },
          autoStart: { type: 'boolean', default: false }
        }
      },
      {
        id: 'agent-status',
        name: 'Agent Status',
        description: 'View and manage agent status',
        category: 'monitoring',
        defaultSize: { width: 350, height: 250 },
        minSize: { width: 250, height: 200 },
        maxSize: { width: 600, height: 400 },
        resizable: true,
        draggable: true,
        configSchema: {
          showDetails: { type: 'boolean', default: true },
          refreshInterval: { type: 'number', default: 2000 }
        },
        refreshInterval: 2000
      }
    ];

    defaultWidgets.forEach(widget => {
      this.widgets.set(widget.id, widget);
    });
  }

  private initializeDefaultTheme(): void {
    const defaultLayout: PanelLayout = {
      id: 'default',
      name: 'Default Layout',
      description: 'Standard side panel layout',
      components: [],
      theme: {
        primaryColor: '#007acc',
        secondaryColor: '#f5f5f5',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        borderColor: '#e0e0e0',
        fontFamily: 'Inter, sans-serif',
        fontSize: {
          small: '12px',
          medium: '14px',
          large: '18px'
        },
        borderRadius: '8px',
        shadows: true,
        animations: true
      },
      responsive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.layouts.set('default', defaultLayout);
  }

  private async updateAnalytics(componentId: string, interaction: UserInteraction): Promise<void> {
    let analytics = this.analytics.get(componentId);
    
    if (!analytics) {
      analytics = {
        componentId,
        totalInteractions: 0,
        averageInteractionTime: 0,
        mostCommonAction: interaction.type,
        userEngagementScore: 0,
        errorRate: 0,
        lastActivity: interaction.timestamp,
        userPreferences: {}
      };
    }

    analytics.totalInteractions++;
    analytics.lastActivity = interaction.timestamp;
    analytics.averageInteractionTime = (analytics.averageInteractionTime + (interaction.duration || 0)) / 2;
    analytics.userEngagementScore = Math.min(1, analytics.totalInteractions / 50);

    this.analytics.set(componentId, analytics);
  }

  private async generateSmartSuggestions(interaction: UserInteraction): Promise<void> {
    const analytics = this.analytics.get(interaction.componentId);
    if (!analytics) return;

    if (analytics.totalInteractions > 10 && analytics.userEngagementScore < 0.3) {
      this.suggestions.push({
        id: this.generateId(),
        type: 'configuration',
        title: 'Optimize Component Configuration',
        description: 'This component has low engagement. Consider adjusting its settings.',
        impact: 'medium',
        confidence: 0.7,
        data: { componentId: interaction.componentId },
        reason: 'Low user engagement detected',
        applicableConditions: ['low_engagement']
      });
    }
  }

  private async generateAdaptiveLayout(context: AdaptiveLayout['context']): Promise<PanelLayout> {
    const baseLayout = this.layouts.get('default');
    if (!baseLayout) throw new Error('Default layout not found');

    const adaptiveLayout = JSON.parse(JSON.stringify(baseLayout));
    adaptiveLayout.id = this.generateId();
    adaptiveLayout.name = `Adaptive for ${context.deviceType}`;

    if (context.deviceType === 'mobile') {
      adaptiveLayout.components.forEach(component => {
        component.position.width = Math.min(component.position.width, 300);
        component.position.height = Math.min(component.position.height, 200);
      });
    }

    return adaptiveLayout;
  }

  private async optimizeLayout(adaptiveLayout: AdaptiveLayout): Promise<void> {
    if (adaptiveLayout.performance.renderTime > 100) {
      adaptiveLayout.layout.components.forEach(component => {
        if (component.config.refreshInterval) {
          component.config.refreshInterval = Math.max(
            component.config.refreshInterval * 1.5,
            1000
          );
        }
      });
    }
  }

  private async applyPersonalization(layout: PanelLayout, preferences: Record<string, any>): Promise<void> {
    if (preferences.theme) {
      Object.assign(layout.theme, preferences.theme);
    }

    if (preferences.componentOrder) {
      const reorderedComponents = [];
      preferences.componentOrder.forEach(componentId => {
        const component = layout.components.find(c => c.id === componentId);
        if (component) reorderedComponents.push(component);
      });
      layout.components = reorderedComponents;
    }

    layout.updatedAt = new Date();
  }

  private calculateEngagementScore(interactions: UserInteraction[]): number {
    if (interactions.length === 0) return 0;
    
    const totalDuration = interactions.reduce((sum, interaction) => 
      sum + (interaction.duration || 0), 0
    );
    
    return Math.min(1, (interactions.length * 0.1 + totalDuration / 10000));
  }

  private getPopularComponents(interactions: UserInteraction[]): string[] {
    const componentCounts = new Map<string, number>();
    
    interactions.forEach(interaction => {
      const count = componentCounts.get(interaction.componentId) || 0;
      componentCounts.set(interaction.componentId, count + 1);
    });

    return Array.from(componentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([componentId]) => componentId);
  }

  private generateImprovements(interactions: UserInteraction[]): string[] {
    const improvements = [];
    
    if (interactions.length < 5) {
      improvements.push('Increase user engagement with more interactive components');
    }

    const hasConfigErrors = interactions.some(i => i.type === 'configure' && i.data.error);
    if (hasConfigErrors) {
      improvements.push('Fix component errors to improve user experience');
    }

    return improvements;
  }

  private analyzeUsagePatterns(interactions: UserInteraction[]): Record<string, any> {
    const patterns = {
      mostActiveHour: this.getMostActiveHour(interactions),
      averageSessionLength: this.getAverageSessionLength(interactions),
      preferredActionTypes: this.getPreferredActionTypes(interactions)
    };

    return patterns;
  }

  private getMostActiveHour(interactions: UserInteraction[]): number {
    const hourCounts = new Map<number, number>();
    
    interactions.forEach(interaction => {
      const hour = interaction.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    let maxCount = 0;
    let mostActiveHour = 0;
    
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveHour = hour;
      }
    });

    return mostActiveHour;
  }

  private getAverageSessionLength(interactions: UserInteraction[]): number {
    const sessions = new Map<string, UserInteraction[]>();
    
    interactions.forEach(interaction => {
      const session = sessions.get(interaction.sessionId) || [];
      session.push(interaction);
      sessions.set(interaction.sessionId, session);
    });

    const sessionLengths = Array.from(sessions.values()).map(session => {
      if (session.length === 0) return 0;
      const start = Math.min(...session.map(i => i.timestamp.getTime()));
      const end = Math.max(...session.map(i => i.timestamp.getTime()));
      return end - start;
    });

    return sessionLengths.length > 0 
      ? sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length
      : 0;
  }

  private getPreferredActionTypes(interactions: UserInteraction[]): Record<string, number> {
    const actionCounts = new Map<string, number>();
    
    interactions.forEach(interaction => {
      actionCounts.set(
        interaction.type, 
        (actionCounts.get(interaction.type) || 0) + 1
      );
    });

    return Object.fromEntries(actionCounts);
  }

  private isSuggestionApplicable(suggestion: SmartSuggestion, context: Record<string, any>): boolean {
    return suggestion.applicableConditions.every(condition => 
      Object.keys(context).includes(condition)
    );
  }

  private generateId(): string {
    return `panel_${Date.now()}_${randomUUID()}`;
  }
}