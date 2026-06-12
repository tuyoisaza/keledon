import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

interface AuditEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.route?.path || request.url || '';

    // Only intercept write operations and specific auth endpoints
    const isMutation = MUTATION_METHODS.includes(method);
    const isAuthEndpoint = url.startsWith('/api/auth/');

    if (!isMutation && !isAuthEndpoint) {
      return next.handle();
    }

    // Skip GET/HEAD/OPTIONS for CRUD, but NOT for auth endpoints (google callback is GET)
    if (!isAuthEndpoint && ['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    // Extract user info from request
    const userId = this.extractUserId(request);
    const ipAddress = this.extractIp(request);
    const userAgent = request.headers?.['user-agent'] || undefined;

    // Build audit entry based on endpoint
    const auditEntry = this.buildAuditEntry(
      method,
      url,
      request,
      userId,
      ipAddress,
      userAgent,
    );

    if (!auditEntry) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody: any) => {
        void (async () => {
          let entityId = auditEntry.entityId;
          let resolvedUserId = auditEntry.userId;

          // For create operations, try to extract the created entity ID from the response
          if (!entityId && responseBody?.id) {
            entityId = responseBody.id;
          }

          // For auth endpoints, try to extract userId from response body
          if (!resolvedUserId && responseBody?.user?.id) {
            resolvedUserId = responseBody.user.id;
          }
          if (!resolvedUserId && responseBody?.id && !entityId) {
            // Register response has id at top level
            resolvedUserId = responseBody.id;
          }

          // For auth/google/callback, extract user from the redirect query params
          // Actually, for google callback, the response is a redirect, so we can't
          // extract from response body. We'll rely on the query params if present.
          if (
            !entityId &&
            auditEntry.action === 'GOOGLE_LOGIN' &&
            responseBody?.url
          ) {
            // The response is a redirect — we can't extract user id easily here
            // The user ID was extracted from the request or is unknown
          }

          // For DELETE operations, entityId comes from route params
          if (!entityId && method === 'DELETE') {
            entityId = request.params?.id;
          }

          try {
            await this.prisma.auditLog.create({
              data: {
                userId: resolvedUserId,
                action: auditEntry.action,
                entity: auditEntry.entity,
                entityId: entityId || undefined,
                changes: auditEntry.changes,
                ipAddress: auditEntry.ipAddress,
                userAgent: auditEntry.userAgent,
              },
            });
            this.logger.debug(
              `[Audit] ${auditEntry.action} on ${auditEntry.entity}${entityId ? '#' + entityId : ''} by ${resolvedUserId || 'anonymous'}`,
            );
          } catch (error: any) {
            this.logger.error(
              `[Audit] Failed to log ${auditEntry.action}: ${error.message}`,
            );
          }
        })();
      }),
    );
  }

  private extractUserId(request: any): string | undefined {
    // Check if user is already attached (by auth guard — uses userId key)
    if (request.user?.userId) return request.user.userId;
    // Also check for id key (some custom guards may use this)
    if (request.user?.id) return request.user.id;

    // Check body for userId in some edge cases
    if (request.body?.userId && typeof request.body.userId === 'string') {
      return request.body.userId;
    }

    return undefined;
  }

  private extractIp(request: any): string | undefined {
    return (
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.connection?.remoteAddress ||
      request.ip ||
      undefined
    );
  }

  private buildAuditEntry(
    method: string,
    url: string,
    request: any,
    userId: string | undefined,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): AuditEntry | null {
    const body = request.body || {};
    const params = request.params || {};

    // ===== CRUD Endpoints =====
    if (url.startsWith('/api/crud/')) {
      return this.buildCrudEntry(
        method,
        url,
        body,
        params,
        userId,
        ipAddress,
        userAgent,
      );
    }

    // ===== Auth Endpoints =====
    if (url.startsWith('/api/auth/')) {
      return this.buildAuthEntry(
        method,
        url,
        body,
        request,
        userId,
        ipAddress,
        userAgent,
      );
    }

    return null;
  }

  private buildCrudEntry(
    method: string,
    url: string,
    body: any,
    params: any,
    userId: string | undefined,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): AuditEntry | null {
    // Extract entity type from URL path
    const parts = url.split('/').filter(Boolean);
    const entityIndex = parts.findIndex((p: string) => p === 'crud') + 1;

    if (entityIndex <= 0 || entityIndex >= parts.length) return null;

    let entity = parts[entityIndex];
    let entityId: string | undefined;

    // Determine entity and ID from route
    // Check if next segment is an ID parameter (non-numeric string that isn't a known sub-resource)
    const nextIndex = entityIndex + 1;
    const knownSubResources = [
      'countries',
      'interfaces',
      'documents',
      'pairing-code',
      'launch',
    ];
    const isIdSegment =
      nextIndex < parts.length &&
      !knownSubResources.includes(parts[nextIndex]) &&
      !parts[nextIndex].startsWith('orphaned');

    if (isIdSegment) {
      // Specific entity: /api/crud/companies/:id or /api/crud/companies/:id/countries
      const subEntity = parts[nextIndex + 1];
      if (subEntity && knownSubResources.includes(subEntity)) {
        entityId = params.id || parts[nextIndex];
        if (method === 'POST' && subEntity === 'countries') {
          entity = 'company_country';
        } else if (method === 'DELETE' && subEntity === 'countries') {
          entity = 'company_country';
          entityId = params.code ? `${entityId}/${params.code}` : entityId;
        } else if (subEntity === 'documents') {
          entity = 'knowledge_document';
        } else {
          entity = `${entity}_${subEntity}`.replace(/-/g, '_');
        }
      } else {
        entityId = params.id || parts[nextIndex];
      }
    } else {
      // Collection: /api/crud/companies or /api/crud/companies/dosomething
      entityId = params.id || (method === 'DELETE' ? undefined : undefined);
    }

    // Normalize entity name (singular)
    entity = this.singularize(entity);

    switch (method) {
      case 'POST': {
        // Special sub-routes
        if (url.endsWith('/pairing-code')) {
          return {
            userId,
            action: 'REGENERATE_PAIRING_CODE',
            entity: 'device',
            entityId: params.id,
            ipAddress,
            userAgent,
          };
        }
        if (url.endsWith('/launch')) {
          return {
            userId,
            action: 'LAUNCH_KELEDON',
            entity: 'keledon',
            entityId: params.id,
            changes: JSON.stringify(body, this.sanitizeBody()),
            ipAddress,
            userAgent,
          };
        }

        return {
          userId,
          action: 'CREATE',
          entity,
          entityId,
          changes: JSON.stringify(body, this.sanitizeBody()),
          ipAddress,
          userAgent,
        };
      }
      case 'PUT': {
        return {
          userId,
          action: 'UPDATE',
          entity,
          entityId,
          changes: JSON.stringify(body, this.sanitizeBody()),
          ipAddress,
          userAgent,
        };
      }
      case 'DELETE': {
        const targetId = params.id;
        if (!targetId && url.includes('orphaned')) {
          return {
            userId,
            action: 'DELETE_BULK',
            entity,
            changes: JSON.stringify({ url }),
            ipAddress,
            userAgent,
          };
        }
        return {
          userId,
          action: 'DELETE',
          entity,
          entityId: targetId,
          ipAddress,
          userAgent,
        };
      }
      default:
        return null;
    }
  }

  private buildAuthEntry(
    method: string,
    url: string,
    body: any,
    request: any,
    userId: string | undefined,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ): AuditEntry | null {
    if (url === '/api/auth/login' && method === 'POST') {
      return {
        userId,
        action: 'LOGIN',
        entity: 'user',
        changes: JSON.stringify({ email: body.email }),
        ipAddress,
        userAgent,
      };
    }

    if (url === '/api/auth/register' && method === 'POST') {
      return {
        userId,
        action: 'REGISTER',
        entity: 'user',
        changes: JSON.stringify({ email: body.email, name: body.name }),
        ipAddress,
        userAgent,
      };
    }

    if (url === '/api/auth/google/callback' && method === 'GET') {
      return {
        userId,
        action: 'GOOGLE_LOGIN',
        entity: 'user',
        ipAddress,
        userAgent,
      };
    }

    // All other auth endpoints (GET /api/auth/me, GET /api/auth/google, etc.) — skip
    return null;
  }

  private singularize(word: string): string {
    const irregular: Record<string, string> = {
      companies: 'company',
      countries: 'country',
      keledons: 'keledon',
      interfaces: 'interface',
      profiles: 'profile',
      sessions: 'session',
      vendors: 'vendor',
      workflows: 'workflow',
      documents: 'document',
      teams: 'team',
      brands: 'brand',
      users: 'user',
      admins: 'admin',
    };
    return irregular[word] || word.replace(/s$/, '');
  }

  private sanitizeBody() {
    return (key: string, value: any): any => {
      const sensitiveFields = [
        'password',
        'passwordHash',
        'token',
        'secret',
        'apiKey',
        'authorization',
      ];
      if (sensitiveFields.includes(key)) {
        return '[REDACTED]';
      }
      return value;
    };
  }

  private stringifyAuditPayload(value: any): string {
    return JSON.stringify(value, this.sanitizeBody());
  }

  private isSecretLikeString(value: string): boolean {
    const secretLikePatterns = [
      /bearer\s+[a-z0-9._-]+/i,
      /sk-[a-z0-9]{12,}/i,
      /api[_-]?key/i,
      /authorization/i,
      /password/i,
      /secret/i,
      /token/i,
    ];
    return secretLikePatterns.some((pattern) => pattern.test(value));
  }
}
