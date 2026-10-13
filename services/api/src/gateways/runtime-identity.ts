import { createHash } from 'crypto';
import { LocalAuthService } from '../auth-local/auth-local.service';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RuntimeIdentity {
  tokenFingerprint?: string;
  deviceId: string; userId: string; teamId: string; companyId: string;
  brandId?: string; companyName: string; brandName: string; teamName: string;
}

/** Resolve every runtime claim from stored device/user/Keledon relations. */
export async function resolveRuntimeIdentity(prisma: PrismaService, token: unknown, deviceId?: unknown): Promise<RuntimeIdentity | null> {
  if (typeof token !== 'string' || !token || (deviceId !== undefined && typeof deviceId !== 'string')) return null;
  const device = await prisma.device.findFirst({ where: { authToken: token, status: { in: ['paired', 'disconnected'] } }, include: { user: true } });
  if (!device || (deviceId !== undefined && device.id !== deviceId) || !device.user || !device.keledonId) return null;
  const keledon = await prisma.keledon.findUnique({ where: { id: device.keledonId }, include: { team: { include: { brand: { include: { company: true } } } } } });
  const team = keledon?.team;
  const brand = team?.brand;
  if (!keledon?.isActive || !brand?.companyId || !device.user.companyId || device.user.companyId !== brand.companyId ||
      (device.user.teamId && device.user.teamId !== team.id) || (keledon.userId && keledon.userId !== device.userId)) return null;
  return { tokenFingerprint: createHash('sha256').update(token).digest('hex'), deviceId: device.id, userId: device.userId, teamId: team.id, companyId: brand.companyId,
    brandId: brand.id, companyName: brand.company.name, brandName: brand.name, teamName: team.name };
}

export async function isRuntimeIdentityCurrent(prisma: PrismaService, identity: RuntimeIdentity): Promise<boolean> {
  if (!identity?.deviceId || !identity.tokenFingerprint) return false;
  const device = await prisma.device.findUnique({ where: { id: identity.deviceId }, select: { authToken: true } });
  if (!device?.authToken) return false;
  const fresh = await resolveRuntimeIdentity(prisma, device.authToken, identity.deviceId);
  return !!fresh && fresh.tokenFingerprint === identity.tokenFingerprint && fresh.userId === identity.userId && fresh.teamId === identity.teamId && fresh.companyId === identity.companyId;
}

export async function ownsRuntimeSession(prisma: PrismaService, identity: RuntimeIdentity, sessionId: unknown): Promise<boolean> {
  if (!identity || typeof sessionId !== 'string' || !sessionId) return false;
  if (identity.deviceId && !await isRuntimeIdentityCurrent(prisma, identity)) return false;
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { userId: true, teamId: true, status: true } });
  return session?.userId === identity.userId && session?.teamId === identity.teamId && !['closed', 'ended', 'failed'].includes(session.status);
}

@Injectable()
export class RuntimeDeviceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const match = /^Bearer (\S+)$/.exec(request.headers.authorization || '');
    const identity = match ? await resolveRuntimeIdentity(this.prisma, match[1]) : null;
    if (!identity) throw new UnauthorizedException('Valid paired device required');
    if (request.params?.deviceId && request.params.deviceId !== identity.deviceId) throw new UnauthorizedException('Device scope mismatch');
    request.runtimeIdentity = identity;
    request.user = { userId: identity.userId, companyId: identity.companyId, teamId: identity.teamId, email: '', role: 'user' };
    return true;
  }
}

/** Existing user sessions and paired devices share the same DB-derived tenant contract. */
@Injectable()
export class RuntimeActorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const match = /^Bearer (\S+)$/.exec(request.headers.authorization || '');
    if (!match) throw new UnauthorizedException('Authentication required');
    const device = await resolveRuntimeIdentity(this.prisma, match[1]);
    if (device) {
      request.runtimeIdentity = device;
      request.user = { userId: device.userId, companyId: device.companyId, teamId: device.teamId, role: 'user', email: '' };
      return true;
    }
    const actor = await new LocalAuthService(this.prisma).validateToken(match[1]);
    if (!actor?.id || !actor.company_id || !actor.team_id) throw new UnauthorizedException('Assigned user required');
    const team = await this.prisma.team.findUnique({ where: { id: actor.team_id }, include: { brand: { include: { company: true } } } });
    if (team?.brand?.companyId !== actor.company_id) throw new UnauthorizedException('Tenant mismatch');
    request.user = { userId: actor.id, companyId: actor.company_id, teamId: actor.team_id, role: actor.role, email: actor.email };
    request.runtimeIdentity = { userId: actor.id, teamId: team.id, companyId: team.brand.companyId,
      companyName: team.brand.company.name, brandId: team.brand.id, brandName: team.brand.name, teamName: team.name };
    return true;
  }
}
