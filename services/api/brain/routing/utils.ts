/**
 * Routing Utilities
 * Helper functions for route matching and path manipulation
 */

import { RouteDefinition, RouteMatchResult, RequestContext } from './types';

/**
 * Create a route matcher function
 */
export function createRouteMatcher(route: RouteDefinition): (path: string) => RouteMatchResult {
  return (path: string) => matchRoute(route, path);
}

/**
 * Match a route against a path
 */
export function matchRoute(route: RouteDefinition, path: string): RouteMatchResult {
  const params: Record<string, string> = {};
  const confidence = calculateRouteMatch(route.path, path, params);
  
  return {
    matched: confidence > 0,
    route: confidence > 0 ? route : undefined,
    params: Object.keys(params).length > 0 ? params : undefined,
    confidence,
  };
}

/**
 * Calculate route match confidence and extract parameters
 */
function calculateRouteMatch(routePath: string, actualPath: string, params: Record<string, string>): number {
  const routeSegments = routePath.split('/').filter(Boolean);
  const actualSegments = actualPath.split('/').filter(Boolean);
  
  if (routeSegments.length !== actualSegments.length) {
    return 0;
  }
  
  let matches = 0;
  
  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i];
    const actualSegment = actualSegments[i];
    
    if (routeSegment.startsWith(':')) {
      // Parameter segment
      const paramName = routeSegment.slice(1);
      params[paramName] = actualSegment;
      matches++;
    } else if (routeSegment.startsWith('*')) {
      // Wildcard segment
      const paramName = routeSegment.slice(1) || 'wildcard';
      params[paramName] = actualSegment;
      matches++;
    } else if (routeSegment === actualSegment) {
      // Exact match
      matches++;
    } else {
      // No match
      return 0;
    }
  }
  
  return matches / routeSegments.length;
}

/**
 * Normalize a path by removing trailing slashes and resolving dots
 */
export function normalizePath(path: string): string {
  // Remove query string and hash
  const [cleanPath] = path.split(/[?#]/);
  
  // Remove leading/trailing slashes and split
  const segments = cleanPath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  
  // Resolve '..' and '.'
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === '..') {
      resolved.pop();
    } else if (segment !== '.') {
      resolved.push(segment);
    }
  }
  
  return '/' + resolved.join('/');
}

/**
 * Extract query parameters from a URL
 */
export function extractQueryParams(url: string): Record<string, string> {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return {};
  
  const queryString = url.slice(queryStart + 1);
  const params: Record<string, string> = {};
  
  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }
  
  return params;
}

/**
 * Create a context object from request data
 */
export function createRequestContext(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any,
  query: Record<string, string> = {},
  params: Record<string, string> = {}
): RequestContext {
  return {
    method: method.toUpperCase(),
    path,
    headers,
    query: query || extractQueryParams(path),
    params,
    body,
    metadata: {
      timestamp: Date.now(),
      path: normalizePath(path)
    }
  };
}

/**
 * Validate route configuration
 */
export function validateRoute(route: RouteDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!route.id || typeof route.id !== 'string') {
    errors.push('Route ID is required and must be a string');
  }
  
  if (!route.name || typeof route.name !== 'string') {
    errors.push('Route name is required and must be a string');
  }
  
  if (!route.path || typeof route.path !== 'string') {
    errors.push('Route path is required and must be a string');
  }
  
  if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method)) {
    errors.push('Route method must be one of: GET, POST, PUT, DELETE, PATCH');
  }
  
  if (!route.handler || typeof route.handler !== 'string') {
    errors.push('Route handler is required and must be a string');
  }
  
  // Validate path format
  if (route.path) {
    if (route.path.startsWith('*')) {
      errors.push('Route path cannot start with wildcard');
    }
    
    // Check for invalid parameter names
    const paramMatches = route.path.match(/:([^\/]+)/g);
    if (paramMatches) {
      for (const match of paramMatches) {
        const paramName = match.slice(1);
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(paramName)) {
          errors.push(`Invalid parameter name: ${paramName}`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sort routes by specificity (most specific first)
 */
export function sortRoutesBySpecificity(routes: RouteDefinition[]): RouteDefinition[] {
  return [...routes].sort((a, b) => {
    const aSpecificity = calculateRouteSpecificity(a.path);
    const bSpecificity = calculateRouteSpecificity(b.path);
    
    if (aSpecificity !== bSpecificity) {
      return bSpecificity - aSpecificity; // Higher specificity first
    }
    
    // If same specificity, sort alphabetically
    return a.path.localeCompare(b.path);
  });
}

/**
 * Calculate route specificity score
 */
function calculateRouteSpecificity(path: string): number {
  const segments = path.split('/').filter(Boolean);
  let specificity = 0;
  
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      specificity += 1; // Parameter segment
    } else if (segment.startsWith('*')) {
      specificity += 0; // Wildcard segment (least specific)
    } else {
      specificity += 10; // Static segment (most specific)
    }
  }
  
  return specificity + (segments.length * 0.1); // Prefer longer paths for same specificity
}

/**
 * Convert route pattern to regex
 */
export function routeToRegex(path: string): RegExp {
  // Escape special regex characters except for our markers
  let regex = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  
  // Replace parameter segments with capture groups
  regex = regex.replace(/:([^\/]+)/g, '([^/]+)');
  
  // Replace wildcard segments
  regex = regex.replace(/\*([^\/]*)/g, '(.*?)');
  
  // Ensure exact match
  regex = '^' + regex + '$';
  
  return new RegExp(regex);
}

/**
 * Extract parameters from a path using a route regex
 */
export function extractPathParams(path: string, regex: RegExp, paramNames: string[]): Record<string, string> {
  const match = path.match(regex);
  if (!match) return {};
  
  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length && i < match.length - 1; i++) {
    params[paramNames[i]] = match[i + 1] || '';
  }
  
  return params;
}

/**
 * Get parameter names from a route path
 */
export function getParamNames(path: string): string[] {
  const paramNames: string[] = [];
  const segments = path.split('/');
  
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      paramNames.push(segment.slice(1));
    }
  }
  
  return paramNames;
}

/**
 * Check if two paths are compatible (can match the same requests)
 */
export function arePathsCompatible(path1: string, path2: string): boolean {
  const regex1 = routeToRegex(path1);
  const regex2 = routeToRegex(path2);
  
  // Test some sample paths to check compatibility
  const testPaths = ['/test', '/test/123', '/test/123/sub', '/a/b/c'];
  
  for (const testPath of testPaths) {
    const match1 = regex1.test(testPath);
    const match2 = regex2.test(testPath);
    
    // If both match the same test path, they're compatible
    if (match1 && match2) {
      return true;
    }
  }
  
  return false;
}