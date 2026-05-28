import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => (target: any, key?: string, descriptor?: any) => {
  Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value ?? target);
  return descriptor ?? target;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

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
      select: { role: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    const hasRole = requiredRoles.includes(dbUser.role);
    
    if (!hasRole) {
      console.log(`[RBAC] Access denied for user ${user.userId} with role ${dbUser.role}. Required: ${requiredRoles}`);
      throw new ForbiddenException('Insufficient permissions');
    }

    console.log(`[RBAC] Access granted for user ${user.userId} with role ${dbUser.role}`);
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
      select: { role: true },
    });

    if (dbUser?.role !== 'superadmin') {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
