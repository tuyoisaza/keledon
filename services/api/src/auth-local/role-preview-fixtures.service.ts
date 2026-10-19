import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { isAccountActive } from './account-lifecycle.policy';
import { rolePreviewOwner } from './role-preview-operator.policy';

export const PREVIEW_ROLES = ['user', 'agent', 'admin', 'coordinator'] as const;
export const PREVIEW_FIXTURE_EVENT = 'ROLE_PREVIEW_PROVISIONED';

/** Product-facing test identities; no passwords, provider access or human impersonation. */
@Injectable()
export class RolePreviewFixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async prepare(actorId: string) {
    return this.prisma.$transaction(async tx => {
      // Share the fixture lifecycle's capacity lock. Never create more than two tenants.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(542541, 1)`;
      const actor = await tx.user.findUnique({ where: { id: actorId } });
      if (actor?.role !== 'superadmin' || !isAccountActive(actor))
        throw new ForbiddenException('Active superadmin required');
      let run = await tx.uatFixtureRun.findFirst();
      const now = new Date();
      if (!run) {
        const runId = `phdk-uat-${randomUUID()}`;
        const expiresAt = new Date(now.getTime() + 24 * 3600000);
        const members = [];
        for (const suffix of ['A', 'B']) {
          const company = await tx.company.create({ data: { name: `Company Co UAT ${suffix} ${runId}` } });
          const brand = await tx.brand.create({ data: { name: `PHDK UAT ${suffix}`, companyId: company.id } });
          const team = await tx.team.create({ data: { name: `PHDK UAT ${suffix}`, brandId: brand.id } });
          const user = await tx.user.create({ data: {
            name: `Company Co UAT ${suffix}`, email: `phdk-uat-${randomUUID()}@example.invalid`,
            role: 'user', companyId: company.id, teamId: team.id, uatFixtureRunId: runId,
            uatFixtureExpiresAt: expiresAt, uatFixtureAuthAfter: now,
          } });
          const keledon = await tx.keledon.create({ data: {
            name: `PHDK UAT ${suffix}`, userId: user.id, teamId: team.id, brandId: brand.id, isActive: false,
          } });
          const device = await tx.device.create({ data: {
            name: `PHDK UAT Browser ${suffix}`, userId: user.id, organizationId: company.id,
            keledonId: keledon.id, machineId: `${runId}-${suffix}`, platform: 'win32', status: 'revoked',
          } });
          members.push({ userId: user.id, companyId: company.id, brandId: brand.id,
            teamId: team.id, deviceId: device.id, keledonId: keledon.id });
        }
        run = await tx.uatFixtureRun.create({ data: {
          id: runId, createdBy: actorId, members: JSON.stringify(members), expiresAt,
        } });
        await tx.auditLog.create({ data: {
          userId: actorId, action: 'UAT_FIXTURE_CREATED', entity: 'UAT_FIXTURE_RUN', entityId: run.id,
          changes: JSON.stringify({ syntheticOnly: true, tenantCount: 2, purpose: 'role_preview' }),
        } });
      }
      if (run.createdBy === actorId && (run.retiredAt || run.expiresAt <= now)) {
        const created = await tx.auditLog.findFirst({ where: {
          entity: 'UAT_FIXTURE_RUN', entityId: run.id, action: 'UAT_FIXTURE_CREATED', userId: actorId,
        } });
        // Only this product feature's dedicated fixtures may be renewed here.
        // Existing UAT runs retain their original lifecycle and owner restrictions.
        if (JSON.parse(created?.changes || 'null')?.purpose === 'role_preview') {
          const expiresAt = new Date(now.getTime() + 24 * 3600000);
          run = await tx.uatFixtureRun.update({ where: { id: run.id }, data: { expiresAt, retiredAt: null } });
          await tx.user.updateMany({ where: { uatFixtureRunId: run.id }, data: {
            uatFixtureExpiresAt: expiresAt, uatFixtureRetiredAt: null, uatFixtureAuthAfter: now,
          } });
          await tx.auditLog.create({ data: {
            userId: actorId, entity: 'UAT_FIXTURE_RUN', entityId: run.id, action: 'ROLE_PREVIEW_RENEWED',
            changes: JSON.stringify({ expiresAt, syntheticOnly: true }),
          } });
        }
      }
      if (run.createdBy !== actorId || run.retiredAt || run.expiresAt <= now)
        throw new ConflictException('Fixture owner must reconcile or restore the existing run before preparing roles');
      const member = JSON.parse(run.members)[0];
      const seed = await tx.user.findUnique({ where: { id: member?.userId || '' } });
      if (!seed || !isAccountActive(seed) || seed.uatFixtureRunId !== run.id ||
          seed.companyId !== member.companyId || seed.teamId !== member.teamId)
        throw new ConflictException('Synthetic tenant membership changed');
      for (const role of PREVIEW_ROLES) {
        const email = `phdk-role-${role}-${run.id.slice(9)}@example.invalid`;
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) {
          if (!await isManagedRolePreview(tx, existing, actorId))
            throw new ConflictException('Role fixture changed; reconcile before reuse');
          continue;
        }
        const profile = await tx.user.create({ data: {
          email, name: `Company Co · ${role}`, role, companyId: seed.companyId, teamId: seed.teamId,
          uatFixtureRunId: run.id, uatFixtureExpiresAt: run.expiresAt, uatFixtureAuthAfter: now,
        } });
        await tx.auditLog.create({ data: {
          userId: actorId, companyId: seed.companyId, action: PREVIEW_FIXTURE_EVENT,
          entity: 'UAT_ROLE_PROFILE', entityId: profile.id,
          changes: JSON.stringify({ runId: run.id, role, companyId: seed.companyId, teamId: seed.teamId }),
        } });
      }
      return { success: true, runId: run.id, expiresAt: run.expiresAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
  }
}

export async function isManagedRolePreview(
  prisma: Prisma.TransactionClient,
  profile: { id: string; role: string; email: string; companyId?: string | null; teamId?: string | null;
    passwordHash?: string | null; uatFixtureRunId?: string | null; uatFixtureExpiresAt?: Date | null; uatFixtureRetiredAt?: Date | null },
  actorId: string,
): Promise<boolean> {
  if (!profile.uatFixtureRunId || profile.passwordHash || !isAccountActive(profile) ||
      !PREVIEW_ROLES.some(role => role === profile.role) ||
      profile.email !== `phdk-role-${profile.role}-${profile.uatFixtureRunId.slice(9)}@example.invalid`) return false;
  const run = await prisma.uatFixtureRun.findUnique({ where: { id: profile.uatFixtureRunId } });
  const ownerId = await rolePreviewOwner(prisma, actorId);
  if (!run || !ownerId || run.createdBy !== ownerId || run.retiredAt || run.expiresAt.getTime() <= Date.now()) return false;
  const member = JSON.parse(run.members)[0];
  if (!member || member.companyId !== profile.companyId || member.teamId !== profile.teamId) return false;
  const event = await prisma.auditLog.findFirst({ where: {
    userId: ownerId, entity: 'UAT_ROLE_PROFILE', entityId: profile.id, action: PREVIEW_FIXTURE_EVENT,
  } });
  if (!event) return false;
  const details = JSON.parse(event.changes || 'null');
  return details?.runId === run.id && details.role === profile.role &&
    details.companyId === profile.companyId && details.teamId === profile.teamId;
}
