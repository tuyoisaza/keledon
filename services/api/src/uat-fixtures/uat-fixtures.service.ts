import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { isAccountActive } from '../auth-local/account-lifecycle.policy';

interface FixtureMember {
  userId: string;
  companyId: string;
  brandId: string;
  teamId: string;
  deviceId: string;
  keledonId: string;
  flowId?: string;
}

@Injectable()
export class UatFixturesService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireSuperadmin(tx: Prisma.TransactionClient, actorId: string) {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== 'superadmin' || !isAccountActive(actor))
      throw new ForbiddenException('Existing active superadmin required');
  }

  private validateRunId(id: string) {
    if (typeof id !== 'string' || !/^phdk-uat-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))
      throw new BadRequestException('A stable phdk-uat-UUIDv4 runId is required');
  }

  private async lock(tx: Prisma.TransactionClient) {
    // Serialize capacity/provision/retire across all API replicas without a scheduler.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(542541, 1)`;
  }

  async create(actorId: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new BadRequestException('Invalid fixture request');
    const body = input as Record<string, unknown>;
    if (Object.keys(body).some(key => !['runId', 'userIds', 'ttlHours'].includes(key)))
      throw new BadRequestException('Unsupported fixture field');
    this.validateRunId(body.runId as string);
    if (!Array.isArray(body.userIds) || body.userIds.length !== 2 ||
        body.userIds.some(id => typeof id !== 'string' || !id || id.length > 128) ||
        new Set(body.userIds).size !== 2 || !Number.isInteger(body.ttlHours) ||
        Number(body.ttlHours) < 1 || Number(body.ttlHours) > 24)
      throw new BadRequestException('Exactly two distinct users and a TTL of 1..24 hours are required');
    const runId = body.runId as string;
    const userIds = body.userIds as string[];
    return this.prisma.$transaction(async tx => {
      await this.lock(tx);
      await this.requireSuperadmin(tx, actorId);
      const existing = await tx.uatFixtureRun.findUnique({ where: { id: runId } });
      if (existing) {
        const members: FixtureMember[] = JSON.parse(existing.members);
        if (existing.createdBy !== actorId || members.some(m => !userIds.includes(m.userId)))
          throw new ConflictException('Fixture runId already belongs to another request');
        return this.summary(existing);
      }
      const now = new Date();
      // The current owner scope permits at most two synthetic tenants in total.
      // Retirement preserves records; it must not permit unbounded replacement runs.
      if (await tx.uatFixtureRun.count())
        throw new ConflictException('A fixture run already exists; reuse its runId or reconcile approved cleanup');
      const users = await tx.user.findMany({
        where: { id: { in: userIds } },
        include: { _count: { select: { devices: true, sessions: true, keledons: true } } },
      });
      if (users.length !== 2 || users.some(user =>
        user.role !== 'user' || user.companyId || user.teamId || user.uatFixtureRunId ||
        !/^phdk-uat-[a-z0-9-]+@example\.invalid$/.test(user.email) ||
        !user.passwordHash || Object.values(user._count).some(count => count !== 0)))
        throw new BadRequestException('Only unused first-party synthetic regular accounts are permitted');
      const expiresAt = new Date(now.getTime() + Number(body.ttlHours) * 3600000);
      const members: FixtureMember[] = [];
      for (const [index, userId] of userIds.entries()) {
        const suffix = index === 0 ? 'A' : 'B';
        const member: FixtureMember = {
          userId, companyId: randomUUID(), brandId: randomUUID(), teamId: randomUUID(),
          deviceId: randomUUID(), keledonId: randomUUID(),
          ...(index === 0 ? { flowId: randomUUID() } : {}),
        };
        await tx.company.create({ data: { id: member.companyId, name: `Company Co UAT ${suffix} ${runId}` } });
        await tx.brand.create({ data: { id: member.brandId, companyId: member.companyId, name: `PHDK UAT ${suffix}` } });
        await tx.team.create({ data: { id: member.teamId, brandId: member.brandId, name: `PHDK UAT ${suffix}` } });
        await tx.user.update({ where: { id: userId }, data: {
          companyId: member.companyId, teamId: member.teamId, uatFixtureRunId: runId,
          uatFixtureExpiresAt: expiresAt, uatFixtureRetiredAt: null, uatFixtureAuthAfter: now,
        } });
        await tx.keledon.create({ data: {
          id: member.keledonId, userId, teamId: member.teamId, brandId: member.brandId,
          name: `PHDK UAT ${suffix}`, isActive: false,
        } });
        await tx.device.create({ data: {
          id: member.deviceId, userId, organizationId: member.companyId,
          keledonId: member.keledonId, name: `PHDK UAT Browser ${suffix}`,
          machineId: `${runId}-${suffix}`, platform: 'win32', status: 'pending',
        } });
        if (member.flowId) await tx.flow.create({ data: {
          id: member.flowId, teamId: member.teamId, name: 'PHDK UAT inert flow',
          triggerKeywords: '[]', tool: 'browser', isActive: false, createdBy: actorId,
        } });
        members.push(member);
      }
      const run = await tx.uatFixtureRun.create({ data: {
        id: runId, createdBy: actorId, members: JSON.stringify(members), expiresAt,
      } });
      await this.audit(tx, actorId, runId, 'UAT_FIXTURE_CREATED');
      return this.summary(run);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
  }

  async get(actorId: string, runId: string) {
    this.validateRunId(runId);
    return this.prisma.$transaction(async tx => {
      await this.requireSuperadmin(tx, actorId);
      const run = await tx.uatFixtureRun.findUnique({ where: { id: runId } });
      if (!run) throw new NotFoundException('Fixture run not found');
      return this.summary(run);
    });
  }

  async setRetired(actorId: string, runId: string, retired: boolean) {
    this.validateRunId(runId);
    return this.prisma.$transaction(async tx => {
      await this.lock(tx);
      await this.requireSuperadmin(tx, actorId);
      const run = await tx.uatFixtureRun.findUnique({ where: { id: runId } });
      if (!run) throw new NotFoundException('Fixture run not found');
      if (!retired && run.expiresAt.getTime() <= Date.now())
        throw new ConflictException('An expired fixture run cannot be restored');
      if (Boolean(run.retiredAt) === retired) return this.summary(run);
      if (!retired && await tx.uatFixtureRun.count({ where: {
        id: { not: runId }, retiredAt: null, expiresAt: { gt: new Date() },
      } })) throw new ConflictException('Another fixture run is active');
      const members: FixtureMember[] = JSON.parse(run.members);
      for (const member of members) {
        const user = await tx.user.findUnique({ where: { id: member.userId } });
        if (!user || user.uatFixtureRunId !== runId || user.companyId !== member.companyId ||
            user.teamId !== member.teamId || (!retired && user.role !== 'user'))
          throw new ConflictException('Fixture ownership changed; reconcile before retirement or restoration');
      }
      const retiredAt = retired ? (run.retiredAt || new Date()) : null;
      // Role-preview identities share the run's TTL and retirement boundary.
      // They have no password or devices and cannot authenticate outside audited previews.
      await tx.user.updateMany({ where: { uatFixtureRunId: runId,
        email: { startsWith: 'phdk-role-' } }, data: {
        uatFixtureRetiredAt: retiredAt, uatFixtureAuthAfter: new Date(),
      } });
      for (const member of members) {
        await tx.user.update({ where: { id: member.userId }, data: {
          uatFixtureRetiredAt: retiredAt, uatFixtureAuthAfter: new Date(),
        } });
        // Never restore credentials, pairing codes, active flows or live agents.
        await tx.device.updateMany({ where: { id: member.deviceId, userId: member.userId }, data: {
          status: 'revoked', authToken: null, pairingCode: null, pairingCodeExpiresAt: null,
        } });
        await tx.keledon.updateMany({ where: { id: member.keledonId, userId: member.userId, teamId: member.teamId }, data: { isActive: false } });
        if (member.flowId) await tx.flow.updateMany({ where: { id: member.flowId, teamId: member.teamId }, data: { isActive: false } });
      }
      const updated = await tx.uatFixtureRun.update({ where: { id: runId }, data: { retiredAt } });
      await this.audit(tx, actorId, runId, retired ? 'UAT_FIXTURE_RETIRED' : 'UAT_FIXTURE_RESTORED');
      return this.summary(updated);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
  }

  private async audit(tx: Prisma.TransactionClient, actorId: string, runId: string, action: string) {
    await tx.auditLog.create({ data: {
      userId: actorId, entity: 'UAT_FIXTURE_RUN', entityId: runId, action,
      changes: JSON.stringify({ syntheticOnly: true, tenantCount: 2 }),
    } });
  }

  private summary(run: { id: string; expiresAt: Date; retiredAt: Date | null; members: string }) {
    return { runId: run.id, expiresAt: run.expiresAt, retiredAt: run.retiredAt,
      status: run.retiredAt ? 'retired' : run.expiresAt.getTime() <= Date.now() ? 'expired' : 'active',
      members: JSON.parse(run.members) as FixtureMember[] };
  }
}
