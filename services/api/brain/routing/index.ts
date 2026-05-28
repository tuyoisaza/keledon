/**
 * Cloud Brain Routing - Export Module
 */

export { BrainRouter } from './router';
export { RoutingConfigManager } from './config';
export { RequestRouter } from './request-router';

export type {
  RouteDefinition,
  RouteMatchResult,
  RequestContext,
  RouteHandler,
  RouteMiddleware,
  RoutingEngine,
  RouteMetrics,
  RoutingCache,
  RouterConfig
} from './types';

export type {
  RoutingRule,
  RoutingCondition,
  RouteContext,
  RouteResult
} from './router';

export type {
  RequestRouterConfig,
  RequestMetrics,
  CacheEntry
} from './request-router';

// Export singleton instances
export { brainRouter, defaultRouter } from './router';
export { routingConfig, defaultConfig } from './config';
export { requestRouter } from './request-router';

// Helper functions
export { createRouteMatcher, validateRoute, sortRoutesBySpecificity } from './utils';
export { validateRouteConfig, checkCircularDependencies, validateHandlerReferences } from './validation';