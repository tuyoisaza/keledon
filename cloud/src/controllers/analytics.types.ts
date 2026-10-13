export interface AnalyticsTimeRange {
  from?: string;
  to?: string;
  period?: '1h' | '24h' | '7d' | '30d' | '90d';
  timezone?: string;
}

export interface AnalyticsFilters {
  agentIds?: string[];
  flowIds?: string[];
  providerIds?: string[];
  tags?: string[];
  severities?: string[];
}

export interface FlowFilters {
  agentIds?: string[];
  flowIds?: string[];
  providerIds?: string[];
  tags?: string[];
  severities?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'gauge' | 'trend';
  title: string;
  description?: string;
  config: any;
  data: any;
  lastUpdated: Date;
  refreshInterval?: number; // seconds
}

// Helper type for widget array response
export interface DashboardWidgetResponse {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'gauge' | 'trend';
  title: string;
  description?: string;
  config: any;
  data: any;
  lastUpdated: Date;
  refreshInterval?: number;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: {
    columns: number;
    widgets: Array<{
      widgetId: string;
      row: number;
      col: number;
      width: number;
      height: number;
    }>;
  };
}
