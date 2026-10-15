import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveRuntimeIdentity } from '../gateways/runtime-identity';
import { LocalAuthService } from '../auth-local/auth-local.service';
import { User } from '@prisma/client';
import { RuntimeIdentity } from '../gateways/runtime-identity';

type DeviceRequest = {
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  body?: unknown;
  user?: { userId?: string };
  actor?: User;
  deviceIdentity?: RuntimeIdentity;
  deviceBinding?: { userId: string; companyId: string; keledonId?: string };
};

function requestRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

@Injectable()
export class DeviceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<DeviceRequest>();
    const handler = context.getHandler().name;
    if (handler === 'pairDevice') return true; // one-time stored pairing-code proof
    if (handler === 'getDeviceRpaConfig') {
      const authorization = req.headers.authorization;
      const token =
        typeof authorization === 'string'
          ? /^Bearer (\S+)$/.exec(authorization)?.[1]
          : undefined;
      const device = await resolveRuntimeIdentity(
        this.prisma,
        token,
        req.params?.id,
      );
      if (device) {
        req.deviceIdentity = device;
        return true;
      }
      const user =
        token && (await new LocalAuthService(this.prisma).validateToken(token));
      if (user) req.user = { userId: user.id };
    }
    const actor =
      req.user?.userId &&
      (await this.prisma.user.findUnique({ where: { id: req.user.userId } }));
    const deny = () => {
      throw new ForbiddenException('Device access denied');
    };
    if (
      !actor ||
      !['user', 'agent', 'admin', 'coordinator', 'superadmin'].includes(
        actor.role,
      )
    )
      return deny();
    req.actor = actor;
    const superadmin = actor.role === 'superadmin';
    const manager = superadmin || ['admin', 'coordinator'].includes(actor.role);
    if (!superadmin && manager && !actor.companyId) return deny();
    if (['testBrowser', 'debugDevice'].includes(handler) && !superadmin)
      return deny();
    if (handler === 'createPairingCode') {
      const body = requestRecord(req.body);
      const keledonId = body.keledon_id;
      if (!manager || typeof keledonId !== 'string' || !keledonId)
        return deny();
      const keledon = await this.prisma.keledon.findUnique({
        where: { id: keledonId },
        include: { team: { include: { brand: true } } },
      });
      const companyId = keledon?.team?.brand?.companyId;
      if (
        !keledon ||
        !companyId ||
        (!superadmin && companyId !== actor.companyId)
      )
        return deny();
      req.deviceBinding = {
        userId: keledon.userId || actor.id,
        companyId,
        keledonId: keledon.id,
      };
    }
    if (req.params?.id && !['debugDevice'].includes(handler)) {
      const device = await this.prisma.device.findUnique({
        where: { id: req.params.id },
      });
      if (
        !device ||
        (!superadmin &&
          (manager
            ? device.organizationId !== actor.companyId
            : device.userId !== actor.id))
      )
        return deny();
      if (
        !manager &&
        handler !== 'getDeviceStatus' &&
        handler !== 'getDeviceRpaConfig'
      )
        return deny();
    }
    if (handler === 'registerDevice') {
      if (!actor.companyId) return deny();
      req.deviceBinding = { userId: actor.id, companyId: actor.companyId };
    }
    return true;
  }
}
