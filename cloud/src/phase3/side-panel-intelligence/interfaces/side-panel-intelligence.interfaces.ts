export interface SidePanelComponent {
  id: string;
  type: 'widget' | 'chart' | 'control' | 'display' | 'interactive';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  minimized: boolean;
  config: Record<string, any>;
  data?: any;
  permissions: string[];
}

export interface PanelLayout {
  id: string;
  name: string;
  description: string;
  components: SidePanelComponent[];
  theme: PanelTheme;
  responsive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PanelTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontFamily: string;
  fontSize: {
    small: string;
    medium: string;
    large: string;
  };
  borderRadius: string;
  shadows: boolean;
  animations: boolean;
}

export interface UserInteraction {
  id: string;
  componentId: string;
  userId: string;
  sessionId: string;
  type: 'click' | 'hover' | 'drag' | 'resize' | 'configure' | 'minimize' | 'maximize';
  data: Record<string, any>;
  timestamp: Date;
  duration?: number;
}

export interface PanelAnalytics {
  componentId: string;
  totalInteractions: number;
  averageInteractionTime: number;
  mostCommonAction: string;
  userEngagementScore: number;
  errorRate: number;
  lastActivity: Date;
  userPreferences: Record<string, any>;
}

export interface SmartSuggestion {
  id: string;
  type: 'layout' | 'component' | 'configuration' | 'workflow';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  data: Record<string, any>;
  reason: string;
  applicableConditions: string[];
}

export interface PanelWidget {
  id: string;
  name: string;
  description: string;
  category: 'monitoring' | 'control' | 'analytics' | 'communication' | 'utility';
  defaultSize: { width: number; height: number };
  minSize: { width: number; height: number };
  maxSize: { width: number; height: number };
  resizable: boolean;
  draggable: boolean;
  configSchema: Record<string, any>;
  dataSource?: string;
  refreshInterval?: number;
}

export interface AdaptiveLayout {
  id: string;
  userId: string;
  context: {
    deviceType: 'desktop' | 'tablet' | 'mobile';
    screenSize: { width: number; height: number };
    orientation: 'portrait' | 'landscape';
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    userActivity: 'active' | 'idle' | 'focus' | 'collaborative';
  };
  layout: PanelLayout;
  performance: {
    renderTime: number;
    interactionResponse: number;
    dataRefreshRate: number;
  };
}