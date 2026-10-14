import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveRuntimeIdentity } from '../gateways/runtime-identity';

@Injectable()
export class DeviceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const handler = context.getHandler().name;
    if (handler === 'pairDevice') return true; // one-time stored pairing-code proof
    if (handler === 'getDeviceRpaConfig') {
      const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
      const device = await resolveRuntimeIdentity(
        this.prisma,
        token,
        req.params?.id,
      );
      if (device) {
        req.deviceIdentity = device;
        return true;
      }
      // This endpoint returns runtime configuration that can contain provider
      // credentials. Human sessions can manage the configuration, but only the
      // paired device bound to this exact ID may read the raw payload.
      throw new ForbiddenException('Device access denied');
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
      if (!manager || !req.body?.keledon_id) return deny();
      const keledon = await this.prisma.keledon.findUnique({
        where: { id: req.body.keledon_id },
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
    if (handler === 'registerDevice')
      req.deviceBinding = { userId: actor.id, companyId: actor.companyId };
    return true;
  }
}
