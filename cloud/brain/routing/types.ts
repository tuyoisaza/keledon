/**
 * Brain Routing Types
 * Type definitions for request routing and route matching
 */

export interface RouteDefinition {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  middleware?: string[];
  metadata?: Record<string, any>;
}

export interface RouteMatchResult {
  matched: boolean;
  route?: RouteDefinition;
  params?: Record<string, string>;
  query?: Record<string, string>;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface RequestContext {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  body?: any;
  user?: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  session?: {
    id: string;
    data: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export interface RouteHandler {
  (context: RequestContext): Promise<any> | any;
}

export interface RouteMiddleware {
  (context: RequestContext, next: () => Promise<any>): Promise<any> | any;
}

export interface RoutingEngine {
  addRoute(route: RouteDefinition): void;
  removeRoute(id: string): boolean;
  findRoute(method: string, path: string): RouteMatchResult;
  executeRoute(match: RouteMatchResult, context: RequestContext): Promise<any>;
}

export interface RouteMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  routeStats: Record<string, {
    requests: number;
    successes: number;
    failures: number;
    avgResponseTime: number;
  }>;
}

export interface RoutingCache {
  get(key: string): RouteMatchResult | undefined;
  set(key: string, value: RouteMatchResult, ttl?: number): void;
  clear(): void;
  delete(key: string): boolean;
}

export interface RouterConfig {
  enableCache: boolean;
  cacheTimeout: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  defaultRoute?: string;
  fallbackRoute?: string;
  maxRoutes: number;
  routeTimeout: number;
}