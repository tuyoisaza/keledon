import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const ROLES_KEY = 'roles';
export const Roles =
  (...roles: string[]) =>
  (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value ?? target);
    return descriptor ?? target;
  };

async function recordDeniedRoleAccess(
  prisma: PrismaService,
  request: any,
  userId: string | undefined,
  companyId: string | null | undefined,
  requiredRoles: string[],
  reason: string,
): Promise<void> {
  if (!prisma.auditLog?.create) return;
  const route = request.route?.path || request.path || 'unknown';
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        companyId: companyId || undefined,
        action: 'ACCESS_DENIED',
        entity: 'Authorization',
        entityId: `${request.method || 'UNKNOWN'} ${route}`.slice(0, 300),
        changes: JSON.stringify({ reason, requiredRoles }),
      },
    });
  } catch {
    // Keep authorization fail-closed when the best-effort audit write fails.
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, companyId: true },
    });

    if (!dbUser) {
      await recordDeniedRoleAccess(
        this.prisma,
        request,
        user.userId,
        undefined,
        requiredRoles,
        'ACTOR_NOT_FOUND',
      );
      throw new ForbiddenException('User not found');
    }

    const hasRole = requiredRoles.includes(dbUser.role);

    if (!hasRole) {
      await recordDeniedRoleAccess(
        this.prisma,
        request,
        user.userId,
        dbUser.companyId,
        requiredRoles,
        'ROLE_REQUIRED',
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, companyId: true },
    });

    if (dbUser?.role !== 'superadmin') {
      await recordDeniedRoleAccess(
        this.prisma,
        request,
        user.userId,
        dbUser?.companyId,
        ['superadmin'],
        dbUser ? 'ROLE_REQUIRED' : 'ACTOR_NOT_FOUND',
      );
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
