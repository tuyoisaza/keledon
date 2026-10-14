import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAuthService } from './auth-local.service';
import {
  isPermittedUatTestProfile,
  parseUatTestProfileIds,
  UAT_TEST_PROFILE_AUDIT_ENTITY,
  UAT_TEST_PROFILE_TTL_MS,
  uatTestProfilesEnabled,
} from './uat-test-profile.policy';

@Injectable()
export class UatTestProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: LocalAuthService,
  ) {}

  async listProfiles(actorUserId: string) {
    this.assertEnabled();
    await this.assertSuperadmin(actorUserId);
    const ids = parseUatTestProfileIds(
      process.env.KELEDON_UAT_TEST_PROFILE_IDS,
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    return users
      .filter(isPermittedUatTestProfile)
      .map(({ id, name, role }) => ({ id, name, role }));
  }

  async startProfile(
    actorUserId: string,
    profileId: string,
    audit: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    this.assertEnabled();
    const actor = await this.assertSuperadmin(actorUserId);
    const allowedIds = parseUatTestProfileIds(
      process.env.KELEDON_UAT_TEST_PROFILE_IDS,
    );
    if (!allowedIds.includes(profileId)) throw new NotFoundException();

    const profile = await this.prisma.user.findUnique({
      where: { id: profileId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!profile || !isPermittedUatTestProfile(profile)) {
      throw new NotFoundException();
    }

    const sessionId = randomUUID();
    const expiresAt = Date.now() + UAT_TEST_PROFILE_TTL_MS;
    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: 'UAT_TEST_PROFILE_START',
        entity: UAT_TEST_PROFILE_AUDIT_ENTITY,
        entityId: sessionId,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        changes: JSON.stringify({
          actorUserId: actor.id,
          profileUserId: profile.id,
          profileRole: profile.role,
          expiresAt,
        }),
      },
    });

    return {
      token: this.authService.generateUatTestProfileToken({
        userId: profile.id,
        email: profile.email,
        role: profile.role,
        sessionId,
        actorUserId: actor.id,
        expiresAt,
      }),
      sessionId,
      expiresAt,
      user: {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        uatTestProfile: true,
      },
    };
  }

  async endProfileSession(
    actorUserId: string,
    sessionId: string,
    audit: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    this.assertEnabled();
    const actor = await this.assertSuperadmin(actorUserId);
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new UnauthorizedException('No active UAT test profile');
    }
    const session = await this.getActiveSession(sessionId);
    const details = this.parseSession(session?.changes);
    if (!session || !details || details.actorUserId !== actor.id) {
      throw new UnauthorizedException('No active UAT test profile');
    }
    const ended = await this.prisma.auditLog.findFirst({
      where: {
        entity: UAT_TEST_PROFILE_AUDIT_ENTITY,
        entityId: sessionId,
        action: 'UAT_TEST_PROFILE_END',
      },
      select: { id: true },
    });
    if (ended) throw new UnauthorizedException('No active UAT test profile');

    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: 'UAT_TEST_PROFILE_END',
        entity: UAT_TEST_PROFILE_AUDIT_ENTITY,
        entityId: sessionId,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        changes: JSON.stringify({
          actorUserId: actor.id,
          profileUserId: details.profileUserId,
          reason: 'operator_returned_to_superadmin',
        }),
      },
    });
    return { success: true };
  }

  private assertEnabled() {
    if (!uatTestProfilesEnabled()) throw new NotFoundException();
  }

  private async assertSuperadmin(id: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!actor || actor.role !== 'superadmin') {
      throw new ForbiddenException('Current database superadmin required');
    }
    return actor;
  }

  private async getActiveSession(sessionId: string) {
    return this.prisma.auditLog.findFirst({
      where: {
        entity: UAT_TEST_PROFILE_AUDIT_ENTITY,
        entityId: sessionId,
        action: 'UAT_TEST_PROFILE_START',
      },
      select: { userId: true, changes: true, createdAt: true },
    });
  }

  private parseSession(value?: string | null): {
    actorUserId: string;
    profileUserId: string;
    expiresAt: number;
  } | null {
    try {
      const result = JSON.parse(value || 'null');
      if (
        !result ||
        typeof result.actorUserId !== 'string' ||
        typeof result.profileUserId !== 'string' ||
        !Number.isFinite(result.expiresAt)
      ) {
        return null;
      }
      return result;
    } catch {
      return null;
    }
  }
}
