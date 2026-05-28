/**
 * Route Configuration Validation
 * Validates routing configuration and provides detailed error reporting
 */

import { RouteDefinition, RouterConfig, RoutingEngine } from './types';
import { validateRoute } from './utils';

/**
 * Validation error details
 */
export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  routeId?: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate entire routing configuration
 */
export function validateRouteConfig(
  routes: RouteDefinition[],
  config?: RouterConfig
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Validate each route
  const routeIds = new Set<string>();
  const routePaths = new Map<string, string[]>(); // path -> [routeIds]
  
  for (const route of routes) {
    // Validate individual route
    const routeValidation = validateRoute(route);
    
    if (!routeValidation.valid) {
      for (const error of routeValidation.errors) {
        errors.push({
          code: 'INVALID_ROUTE',
          message: error,
          routeId: route.id,
          path: route.path,
          severity: 'error'
        });
      }
    }
    
    // Check for duplicate route IDs
    if (routeIds.has(route.id)) {
      errors.push({
        code: 'DUPLICATE_ROUTE_ID',
        message: `Duplicate route ID: ${route.id}`,
        routeId: route.id,
        severity: 'error'
      });
    }
    routeIds.add(route.id);
    
    // Track path conflicts
    const pathKey = `${route.method}:${route.path}`;
    if (!routePaths.has(pathKey)) {
      routePaths.set(pathKey, []);
    }
    routePaths.get(pathKey)!.push(route.id);
  }
  
  // Check for path conflicts
  for (const [pathKey, routeIdsForPath] of routePaths.entries()) {
    if (routeIdsForPath.length > 1) {
      warnings.push({
        code: 'PATH_CONFLICT',
        message: `Multiple routes for same path: ${pathKey} (${routeIdsForPath.join(', ')})`,
        path: pathKey.split(':')[1],
        severity: 'warning'
      });
    }
  }
  
  // Validate router configuration
  if (config) {
    const configValidation = validateRouterConfig(config);
    errors.push(...configValidation.errors);
    warnings.push(...configValidation.warnings);
  }
  
  // Check for best practices
  validateBestPractices(routes, warnings);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate router configuration
 */
function validateRouterConfig(config: RouterConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  if (config.cacheTimeout < 0) {
    errors.push({
      code: 'INVALID_CACHE_TIMEOUT',
      message: 'Cache timeout must be non-negative',
      severity: 'error'
    });
  }
  
  if (config.maxRoutes < 1) {
    errors.push({
      code: 'INVALID_MAX_ROUTES',
      message: 'Max routes must be at least 1',
      severity: 'error'
    });
  }
  
  if (config.routeTimeout < 0) {
    errors.push({
      code: 'INVALID_ROUTE_TIMEOUT',
      message: 'Route timeout must be non-negative',
      severity: 'error'
    });
  }
  
  if (config.cacheTimeout > 3600000) { // 1 hour
    warnings.push({
      code: 'LONG_CACHE_TIMEOUT',
      message: 'Cache timeout is very long, may cause stale routing',
      severity: 'warning'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate routing best practices
 */
function validateBestPractices(routes: RouteDefinition[], warnings: ValidationError[]): void {
  // Check for routes without explicit methods
  const getRoutes = routes.filter(r => r.method === 'GET');
  const postRoutes = routes.filter(r => r.method === 'POST');
  
  // Check for REST compliance
  for (const getRoute of getRoutes) {
    if (getRoute.path.includes('create') || getRoute.path.includes('update') || getRoute.path.includes('delete')) {
      warnings.push({
        code: 'REST_VIOLATION',
        message: `GET route ${getRoute.path} suggests state-changing operation, consider using POST/PUT/DELETE`,
        routeId: getRoute.id,
        path: getRoute.path,
        severity: 'warning'
      });
    }
  }
  
  // Check for missing error routes
  const hasErrorRoutes = routes.some(r => 
    r.path.includes('error') || 
    r.path.includes('404') || 
    r.path.includes('500')
  );
  
  if (!hasErrorRoutes && routes.length > 5) {
    warnings.push({
      code: 'MISSING_ERROR_ROUTES',
      message: 'Consider adding error handling routes (404, 500)',
      severity: 'warning'
    });
  }
  
  // Check for very generic routes
  for (const route of routes) {
    if (route.path === '/' || route.path === '/*') {
      warnings.push({
        code: 'GENERIC_ROUTE',
        message: `Very generic route ${route.path} may catch unintended requests`,
        routeId: route.id,
        path: route.path,
        severity: 'warning'
      });
    }
  }
  
  // Check for routes without middleware that might need it
  const sensitiveRoutes = routes.filter(r => 
    r.path.includes('admin') || 
    r.path.includes('auth') || 
    r.path.includes('delete') ||
    r.path.includes('update')
  );
  
  for (const route of sensitiveRoutes) {
    if (!route.middleware || route.middleware.length === 0) {
      warnings.push({
        code: 'MISSING_MIDDLEWARE',
        message: `Sensitive route ${route.path} should have authentication middleware`,
        routeId: route.id,
        path: route.path,
        severity: 'warning'
      });
    }
  }
}

/**
 * Validate a single route against an engine
 */
export function validateRouteWithEngine(route: RouteDefinition, engine: RoutingEngine): ValidationError[] {
  const errors: ValidationError[] = [];
  
  try {
    // Test route matching
    const testPaths = [
      route.path,
      route.path + '/test',
      route.path.replace(/\/:[^\/]+/g, '/test'),
      '/invalid/path'
    ];
    
    for (const testPath of testPaths) {
      try {
        const match = engine.findRoute(route.method, testPath);
        // If the test path should match but doesn't, or vice versa
        if (testPath === route.path && !match.matched) {
          errors.push({
            code: 'ROUTE_NOT_MATCHING',
            message: `Route ${route.id} does not match its own path: ${route.path}`,
            routeId: route.id,
            path: testPath,
            severity: 'error'
          });
        }
      } catch (e) {
        errors.push({
          code: 'ENGINE_ERROR',
          message: `Engine error testing path ${testPath}: ${e.message}`,
          routeId: route.id,
          path: testPath,
          severity: 'error'
        });
      }
    }
  } catch (e) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: `Failed to validate route ${route.id}: ${e.message}`,
      routeId: route.id,
      severity: 'error'
    });
  }
  
  return errors;
}

/**
 * Check for circular dependencies in middleware
 */
export function checkCircularDependencies(routes: RouteDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Build dependency graph
  const dependencies = new Map<string, Set<string>>();
  
  for (const route of routes) {
    if (route.middleware) {
      for (const middleware of route.middleware) {
        if (!dependencies.has(middleware)) {
          dependencies.set(middleware, new Set());
        }
        
        // Check if middleware depends on other middleware
        // This is a simplified check - in reality, you'd need to analyze middleware code
        if (middleware.includes('auth')) {
          dependencies.get(middleware)!.add('session');
        }
        if (middleware.includes('session')) {
          dependencies.get(middleware)!.add('cors');
        }
      }
    }
  }
  
  // Detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function detectCycle(node: string, path: string[]): boolean {
    if (recursionStack.has(node)) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependency detected: ${path.join(' -> ')} -> ${node}`,
        severity: 'error'
      });
      return true;
    }
    
    if (visited.has(node)) {
      return false;
    }
    
    visited.add(node);
    recursionStack.add(node);
    
    const deps = dependencies.get(node);
    if (deps) {
      for (const dep of deps) {
        if (detectCycle(dep, [...path, node])) {
          return true;
        }
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  for (const node of dependencies.keys()) {
    if (!visited.has(node)) {
      detectCycle(node, []);
    }
  }
  
  return errors;
}

/**
 * Validate route handler references
 */
export function validateHandlerReferences(routes: RouteDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const handlerNames = new Set<string>();
  
  // Collect all handler names
  for (const route of routes) {
    handlerNames.add(route.handler);
  }
  
  // Check for obvious typos or inconsistencies
  for (const handlerName of handlerNames) {
    if (handlerName.includes('handle')) {
      if (!handlerName.endsWith('Handler') && !handlerName.endsWith('handler')) {
        errors.push({
          code: 'INCONSISTENT_HANDLER_NAMING',
          message: `Handler ${handlerName} may have inconsistent naming`,
          severity: 'warning'
        });
      }
    }
    
    if (handlerName.length < 3) {
      errors.push({
        code: 'SHORT_HANDLER_NAME',
        message: `Handler name ${handlerName} is very short, may be a typo`,
        severity: 'warning'
      });
    }
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(handlerName)) {
      errors.push({
        code: 'INVALID_HANDLER_NAME',
        message: `Handler name ${handlerName} contains invalid characters`,
        severity: 'error'
      });
    }
  }
  
  return errors;
}