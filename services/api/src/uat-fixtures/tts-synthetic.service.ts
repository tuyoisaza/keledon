import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAuthService } from '../auth-local/auth-local.service';
import { isAccountActive } from '../auth-local/account-lifecycle.policy';

export const TTS_SYNTHETIC_ENTITY = 'BRAIN_TTS_SYNTHETIC';
export interface TtsSyntheticRun {
  runId: string;
  actorId: string;
  selectedTeamId: string;
  expiresAt: number;
  members: Array<{ id: string; role: string; companyId: string | null; teamId: string | null }>;
}

@Injectable()
export class TtsSyntheticService {
  constructor(private readonly prisma: PrismaService, private readonly auth: LocalAuthService) {}

  private async owner(tx: Prisma.TransactionClient, actorId: string) {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== 'superadmin' || actor.uatFixtureRunId || !isAccountActive(actor))
      throw new ForbiddenException('An active non-synthetic platform administrator is required');
  }

  async prepare(actorId: string, input: unknown) {
    const body = input as Record<string, unknown>;
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some(key => !['runId', 'teamId'].includes(key)) ||
        typeof body.runId !== 'string' || !/^brain-tts-[0-9a-f-]{36}$/.test(body.runId) ||
        typeof body.teamId !== 'string' || !body.teamId || body.teamId.length > 128)
      throw new BadRequestException('A brain-tts UUID runId and selected teamId are required');
    const runId = body.runId as string;
    const teamId = body.teamId as string;
    const run = await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(542541, 2)`;
      await this.owner(tx, actorId);
      if (!await tx.team.findUnique({ where: { id: teamId }, select: { id: true } }))
        throw new NotFoundException('Selected team not found');
      const existing = await tx.auditLog.findFirst({ where: {
        entity: TTS_SYNTHETIC_ENTITY, entityId: runId, action: 'TTS_SYNTHETIC_CREATED',
      } });
      if (existing) {
        const saved: TtsSyntheticRun = JSON.parse(existing.changes || 'null');
        if (saved?.actorId !== actorId || saved.selectedTeamId !== teamId || saved.expiresAt <= Date.now())
          throw new ConflictException('Run ownership, selected team or expiry does not permit reuse');
        const retired = await tx.auditLog.findFirst({ where: {
          entity: TTS_SYNTHETIC_ENTITY, entityId: runId, action: 'TTS_SYNTHETIC_RETIRED',
        } });
        if (retired) throw new ConflictException('Retired runs cannot be restored');
        return saved;
      }
      // Bounded allocation; no scheduler and no modification of an earlier fixture run.
      const recent = await tx.auditLog.findMany({ where: {
        entity: TTS_SYNTHETIC_ENTITY, action: 'TTS_SYNTHETIC_CREATED',
        createdAt: { gte: new Date(Date.now() - 3600000) },
      }, take: 4, orderBy: { createdAt: 'desc' } });
      if (recent.length >= 3) throw new ConflictException('Synthetic bootstrap hourly capacity reached');
      for (const event of recent) {
        const details: TtsSyntheticRun = JSON.parse(event.changes || 'null');
        if (details?.expiresAt > Date.now() && !await tx.auditLog.findFirst({ where: {
          entity: TTS_SYNTHETIC_ENTITY, entityId: event.entityId, action: 'TTS_SYNTHETIC_RETIRED',
        } })) throw new ConflictException('Retire the active synthetic TTS run first');
      }
      const now = new Date();
      const expiresAt = Date.now() + 15 * 60000;
      const members: TtsSyntheticRun['members'] = [];
      // Create accounts directly at their intended role; never elevate/reassign an existing account.
      const admin = await tx.user.create({ data: {
        email: `${runId}-superadmin@example.invalid`, name: 'Company Co TTS synthetic superadmin',
        role: 'superadmin', uatFixtureRunId: runId, uatFixtureExpiresAt: new Date(expiresAt),
        uatFixtureAuthAfter: now,
      } });
      members.push({ id: admin.id, role: admin.role, companyId: null, teamId: null });
      for (const suffix of ['A', 'B']) {
        const company = await tx.company.create({ data: { name: `Company Co TTS ${suffix} ${runId}` } });
        const brand = await tx.brand.create({ data: { name: `Company Co TTS ${suffix}`, companyId: company.id } });
        const team = await tx.team.create({ data: { name: `Company Co TTS ${suffix}`, brandId: brand.id } });
        const user = await tx.user.create({ data: {
          email: `${runId}-${suffix.toLowerCase()}@example.invalid`, name: `Company Co TTS ${suffix}`,
          role: 'user', companyId: company.id, teamId: team.id, uatFixtureRunId: runId,
          uatFixtureExpiresAt: new Date(expiresAt), uatFixtureAuthAfter: now,
        } });
        members.push({ id: user.id, role: user.role, companyId: company.id, teamId: team.id });
      }
      const manifest = { runId, actorId, selectedTeamId: teamId, expiresAt, members };
      await tx.auditLog.create({ data: {
        userId: actorId, entity: TTS_SYNTHETIC_ENTITY, entityId: runId,
        action: 'TTS_SYNTHETIC_CREATED', changes: JSON.stringify(manifest),
      } });
      return manifest;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
    await this.prisma.auditLog.create({ data: {
      userId: actorId, entity: TTS_SYNTHETIC_ENTITY, entityId: runId,
      action: 'TTS_SYNTHETIC_SESSIONS_ISSUED', changes: JSON.stringify({ expiresAt: run.expiresAt }),
    } });
    return {
      ...run,
      sessions: run.members.map(member => ({
        userId: member.id, role: member.role, teamId: member.teamId,
        token: this.auth.generateTtsSyntheticToken(member.id, runId, run.expiresAt),
      })),
      expiryProbe: this.auth.generateTtsSyntheticToken(run.members[0].id, runId, Math.min(run.expiresAt, Date.now() + 5000)),
    };
  }

  async retire(actorId: string, runId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(542541, 2)`;
      await this.owner(tx, actorId);
      const event = await tx.auditLog.findFirst({ where: {
        entity: TTS_SYNTHETIC_ENTITY, entityId: runId, action: 'TTS_SYNTHETIC_CREATED', userId: actorId,
      } });
      if (!event) throw new NotFoundException('Owned synthetic run not found');
      const run: TtsSyntheticRun = JSON.parse(event.changes || 'null');
      // Verify every target before changing any record. Retention preserves the audit trail.
      for (const member of run.members) {
        const user = await tx.user.findUnique({ where: { id: member.id } });
        if (!user || user.uatFixtureRunId !== runId || !user.email.endsWith('@example.invalid') ||
            user.role !== member.role || user.companyId !== member.companyId || user.teamId !== member.teamId)
          throw new ConflictException('Synthetic ownership changed; no accounts were retired');
      }
      await tx.user.updateMany({ where: { id: { in: run.members.map(m => m.id) }, uatFixtureRunId: runId },
        data: { uatFixtureRetiredAt: new Date(), uatFixtureAuthAfter: new Date() } });
      await tx.auditLog.create({ data: {
        userId: actorId, entity: TTS_SYNTHETIC_ENTITY, entityId: runId,
        action: 'TTS_SYNTHETIC_RETIRED', changes: JSON.stringify({ syntheticOnly: true, count: run.members.length }),
      } });
      return { runId, retired: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  }
}
