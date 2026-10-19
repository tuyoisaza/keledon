import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAuthService } from './auth-local.service';
import { isAccountActive } from './account-lifecycle.policy';
import { isManagedRolePreview } from './role-preview-fixtures.service';
import { roleOperatorSession } from './role-preview-operator.policy';
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
    await this.assertSuperadmin(actorUserId);
    const ids = parseUatTestProfileIds(
      process.env.KELEDON_UAT_TEST_PROFILE_IDS,
    );
    const users = await this.prisma.user.findMany({
      where: { OR: [
        ...(uatTestProfilesEnabled() ? [{ id: { in: ids } }] : []),
        { email: { startsWith: 'phdk-role-' }, uatFixtureRunId: { not: null } },
      ] },
      orderBy: { name: 'asc' },
    });
    const permitted = [];
    for (const profile of users) {
      if (await isManagedRolePreview(this.prisma, profile, actorUserId) ||
          (uatTestProfilesEnabled() && ids.includes(profile.id) &&
            !profile.uatFixtureRunId && isAccountActive(profile) && isPermittedUatTestProfile(profile)))
        permitted.push({ id: profile.id, name: profile.name, role: profile.role });
    }
    return permitted;
  }

  async startProfile(
    actorUserId: string,
    profileId: string,
    audit: {
      ipAddress?: string;
      userAgent?: string;
    },
    operatorSessionId?: string,
    operatorExpiresAt?: number,
  ) {
    const actor = await this.assertSuperadmin(actorUserId);
    const operator = actor.uatFixtureRunId && operatorSessionId
      ? await roleOperatorSession(this.prisma, actor.id, operatorSessionId) : null;
    if (actor.uatFixtureRunId && (!operator || !Number.isFinite(operatorExpiresAt))) throw new ForbiddenException('Scoped operator session required');
    const allowedIds = parseUatTestProfileIds(
      process.env.KELEDON_UAT_TEST_PROFILE_IDS,
    );
    const profile = await this.prisma.user.findUnique({
      where: { id: profileId },
    });
    const managed = profile && await isManagedRolePreview(this.prisma, profile, actor.id);
    if (!profile || (!managed && !(uatTestProfilesEnabled() && allowedIds.includes(profileId) &&
        !profile.uatFixtureRunId && isAccountActive(profile) && isPermittedUatTestProfile(profile)))) {
      throw new NotFoundException();
    }

    const sessionId = randomUUID();
    const expiresAt = Math.min(Date.now() + UAT_TEST_PROFILE_TTL_MS,
      profile.uatFixtureExpiresAt?.getTime() ?? Infinity, operator?.expiresAt ?? Infinity, operatorExpiresAt ?? Infinity);
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
          companyId: profile.companyId,
          teamId: profile.teamId,
          reason: 'superadmin_role_preview',
          operatorSessionId: operatorSessionId || null,
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
        email: profile.email,
        companyId: profile.companyId,
        teamId: profile.teamId,
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
    if (ended) return { success: true };

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
          reason: details.expiresAt <= Date.now() ? 'expired_return_to_superadmin' : 'operator_returned_to_superadmin',
        }),
      },
    });
    return { success: true };
  }

  private async assertSuperadmin(id: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!actor || actor.role !== 'superadmin' || !isAccountActive(actor)) {
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
