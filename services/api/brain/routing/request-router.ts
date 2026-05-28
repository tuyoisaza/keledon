/**
 * Request Router
 * High-level request routing and dispatch system for cloud brain
 */

import { RouteDefinition, RouteMatchResult, RequestContext, RouteHandler, RouteMiddleware } from './types';
import { RoutingConfig, routingConfig } from './config';
import { createRouteMatcher, sortRoutesBySpecificity, validateRoute } from './utils';
import { validateRouteConfig } from './validation';
import { BehaviorSubject, Observable } from 'rxjs';

export interface RequestRouterConfig extends RoutingConfig {
  enableCaching: boolean;
  cacheMaxAge: number;
  enableMetrics: boolean;
  middlewareTimeout: number;
  errorHandler?: (error: Error, context: RequestContext) => any;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  routeMetrics: Record<string, {
    count: number;
    success: number;
    failure: number;
    avgTime: number;
  }>;
}

export interface CacheEntry {
  match: RouteMatchResult;
  timestamp: number;
  key: string;
}

export class RequestRouter {
  private routes: Map<string, RouteDefinition> = new Map();
  private globalMiddleware: RouteMiddleware[] = [];
  private config: RequestRouterConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: BehaviorSubject<RequestMetrics>;
  private handlers: Map<string, RouteHandler> = new Map();

  constructor(config?: Partial<RequestRouterConfig>) {
    this.config = {
      ...routingConfig.getConfig(),
      enableCaching: true,
      cacheMaxAge: 300000, // 5 minutes
      enableMetrics: true,
      middlewareTimeout: 30000,
      errorHandler: this.defaultErrorHandler.bind(this),
      ...config
    };

    this.metrics = new BehaviorSubject<RequestMetrics>({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      routeMetrics: {}
    });

    this.startCacheCleanup();
  }

  /**
   * Add a route to the router
   */
  addRoute(route: RouteDefinition): void {
    // Validate route
    const validation = validateRoute(route);
    if (!validation.valid) {
      throw new Error(`Invalid route ${route.id}: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate
    if (this.routes.has(route.id)) {
      throw new Error(`Route with ID '${route.id}' already exists`);
    }

    this.routes.set(route.id, route);
    this.clearCache(); // Clear cache when routes change

    console.log(`Route added: ${route.method} ${route.path} -> ${route.handler}`);
  }

  /**
   * Remove a route by ID
   */
  removeRoute(routeId: string): boolean {
    const removed = this.routes.delete(routeId);
    if (removed) {
      this.clearCache();
      console.log(`Route removed: ${routeId}`);
    }
    return removed;
  }

  /**
   * Register a route handler
   */
  registerHandler(name: string, handler: RouteHandler): void {
    this.handlers.set(name, handler);
  }

  /**
   * Register global middleware
   */
  use(middleware: RouteMiddleware): void {
    this.globalMiddleware.push(middleware);
  }

  /**
   * Find matching route for a request
   */
  findRoute(method: string, path: string): RouteMatchResult {
    // Check cache first
    const cacheKey = `${method}:${path}`;
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheMaxAge) {
        return cached.match;
      }
    }

    // Filter routes by method
    const methodRoutes = Array.from(this.routes.values())
      .filter(route => route.method === method.toUpperCase());

    // Sort by specificity
    const sortedRoutes = sortRoutesBySpecificity(methodRoutes);

    // Find first matching route
    for (const route of sortedRoutes) {
      const matcher = createRouteMatcher(route);
      const match = matcher(path);
      
      if (match.matched) {
        // Cache the result
        if (this.config.enableCaching) {
          this.cache.set(cacheKey, {
            match,
            timestamp: Date.now(),
            key: cacheKey
          });
        }
        
        return match;
      }
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Route and execute a request
   */
  async route(request: Partial<RequestContext>): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Build complete context
      const context: RequestContext = {
        method: 'GET',
        path: '/',
        headers: {},
        query: {},
        params: {},
        ...request
      };

      // Update metrics
      if (this.config.enableMetrics) {
        const currentMetrics = this.metrics.value;
        this.metrics.next({
          ...currentMetrics,
          totalRequests: currentMetrics.totalRequests + 1
        });
      }

      // Find matching route
      const match = this.findRoute(context.method, context.path);
      
      if (!match.matched || !match.route) {
        throw new Error(`No route found for ${context.method} ${context.path}`);
      }

      // Merge route parameters into context
      if (match.params) {
        context.params = { ...context.params, ...match.params };
      }

      // Get handler
      const handler = this.handlers.get(match.route.handler);
      if (!handler) {
        throw new Error(`Handler not found: ${match.route.handler}`);
      }

      // Build middleware chain
      const routeMiddleware = match.route.middleware || [];
      const allMiddleware = [...this.globalMiddleware, ...routeMiddleware];

      // Execute middleware chain
      const result = await this.executeMiddlewareChain(
        allMiddleware,
        context,
        () => Promise.resolve(handler(context))
      );

      // Update success metrics
      if (this.config.enableMetrics) {
        this.updateRouteMetrics(match.route.id, true, Date.now() - startTime);
      }

      return result;

    } catch (error) {
      // Update failure metrics
      if (this.config.enableMetrics) {
        const currentMetrics = this.metrics.value;
        const routeMatch = this.findRoute(request.method || 'GET', request.path || '/');
        if (routeMatch.matched && routeMatch.route) {
          this.updateRouteMetrics(routeMatch.route.id, false, Date.now() - startTime);
        }
        
        this.metrics.next({
          ...currentMetrics,
          failedRequests: currentMetrics.failedRequests + 1
        });
      }

      // Handle error
      if (this.config.errorHandler) {
        return this.config.errorHandler(error as Error, context as RequestContext);
      }

      throw error;
    }
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddlewareChain(
    middleware: RouteMiddleware[],
    context: RequestContext,
    finalHandler: () => Promise<any>
  ): Promise<any> {
    if (middleware.length === 0) {
      return finalHandler();
    }

    let index = 0;

    const next = async (): Promise<any> => {
      if (index >= middleware.length) {
        return finalHandler();
      }

      const currentMiddleware = middleware[index++];
      
      try {
        // Add timeout for middleware
        const result = await Promise.race([
          currentMiddleware(context, next),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Middleware timeout')), this.config.middlewareTimeout)
          )
        ]);
        
        return result;
      } catch (error) {
        throw new Error(`Middleware error at index ${index - 1}: ${error.message}`);
      }
    };

    return next();
  }

  /**
   * Update route metrics
   */
  private updateRouteMetrics(routeId: string, success: boolean, duration: number): void {
    const currentMetrics = this.metrics.value;
    const routeMetrics = currentMetrics.routeMetrics[routeId] || {
      count: 0,
      success: 0,
      failure: 0,
      avgTime: 0
    };

    routeMetrics.count++;
    if (success) {
      routeMetrics.success++;
    } else {
      routeMetrics.failure++;
    }

    // Calculate new average time
    routeMetrics.avgTime = ((routeMetrics.avgTime * (routeMetrics.count - 1)) + duration) / routeMetrics.count;

    currentMetrics.routeMetrics[routeId] = routeMetrics;

    // Update overall metrics
    const totalSuccess = currentMetrics.successfulRequests + (success ? 1 : 0);
    const totalRequests = currentMetrics.totalRequests;
    const avgTime = ((currentMetrics.averageResponseTime * (totalRequests - 1)) + duration) / totalRequests;

    this.metrics.next({
      ...currentMetrics,
      successfulRequests: totalSuccess,
      averageResponseTime: avgTime
    });
  }

  /**
   * Default error handler
   */
  private defaultErrorHandler(error: Error, context: RequestContext): any {
    console.error(`Router error for ${context.method} ${context.path}:`, error);
    
    return {
      error: {
        message: error.message,
        code: 'ROUTE_ERROR',
        path: context.path,
        method: context.method
      },
      status: 500
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    if (!this.config.enableCaching) return;

    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.config.cacheMaxAge) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Get metrics
   */
  getMetrics(): Observable<RequestMetrics> {
    return this.metrics.asObservable();
  }

  /**
   * Get current metrics value
   */
  getCurrentMetrics(): RequestMetrics {
    return this.metrics.value;
  }

  /**
   * Get all routes
   */
  getRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get route by ID
   */
  getRoute(id: string): RouteDefinition | undefined {
    return this.routes.get(id);
  }

  /**
   * Validate entire routing configuration
   */
  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const routes = Array.from(this.routes.values());
    const validation = validateRouteConfig(routes, this.config);
    
    return {
      valid: validation.valid,
      errors: validation.errors.map(e => e.message),
      warnings: validation.warnings.map(e => e.message)
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): { routes: RouteDefinition[]; config: RequestRouterConfig } {
    return {
      routes: Array.from(this.routes.values()),
      config: { ...this.config }
    };
  }

  /**
   * Import configuration
   */
  importConfig(exportedConfig: { routes: RouteDefinition[]; config: RequestRouterConfig }): void {
    // Clear existing routes
    this.routes.clear();
    this.handlers.clear();
    
    // Import routes
    for (const route of exportedConfig.routes) {
      this.addRoute(route);
    }
    
    // Update config
    this.config = { ...exportedConfig.config };
    
    // Clear cache
    this.clearCache();
    
    console.log('Configuration imported successfully');
  }
}

// Export singleton instance
export const requestRouter = new RequestRouter();