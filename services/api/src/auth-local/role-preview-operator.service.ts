import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UatFixturesService } from '../uat-fixtures/uat-fixtures.service';
import { LocalAuthService } from './auth-local.service';
import { RolePreviewFixturesService } from './role-preview-fixtures.service';
import { isAccountActive } from './account-lifecycle.policy';
import { ROLE_OPERATOR_ENTITY, ROLE_OPERATOR_TTL_MS } from './role-preview-operator.policy';

@Injectable()
export class RolePreviewOperatorService {
  constructor(private readonly prisma: PrismaService, private readonly auth: LocalAuthService,
    private readonly fixtures: RolePreviewFixturesService, private readonly lifecycle: UatFixturesService) {}

  private async owner(actorId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (actor?.role !== 'superadmin' || actor.uatFixtureRunId || !isAccountActive(actor))
      throw new ForbiddenException('Existing non-synthetic administrator required for provisioning only');
  }

  async bootstrap(actorId: string) {
    await this.owner(actorId);
    const prepared = await this.fixtures.prepare(actorId);
    const session = await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(542541, 1)`;
      const run = await tx.uatFixtureRun.findUnique({ where: { id: prepared.runId } });
      const created = await tx.auditLog.findFirst({ where: {
        entity: 'UAT_FIXTURE_RUN', entityId: prepared.runId, action: 'UAT_FIXTURE_CREATED', userId: actorId,
      } });
      if (!run || run.createdBy !== actorId || run.retiredAt || run.expiresAt.getTime() <= Date.now() ||
          JSON.parse(created?.changes || 'null')?.purpose !== 'role_preview')
        throw new ConflictException('Only an owned dedicated role-preview fixture run may bootstrap this session');
      const email = `phdk-role-operator-${run.id.slice(9)}@example.invalid`;
      const now = new Date();
      const expiresAt = Math.min(now.getTime() + ROLE_OPERATOR_TTL_MS, run.expiresAt.getTime());
      let actor = await tx.user.findUnique({ where: { email } });
      if (actor) {
        if (actor.role !== 'superadmin' || actor.companyId || actor.teamId || actor.passwordHash || actor.uatFixtureRunId !== run.id ||
            !await tx.auditLog.findFirst({ where: {
              entity: ROLE_OPERATOR_ENTITY, entityId: actor.id, action: 'ROLE_OPERATOR_PROVISIONED', userId: actorId,
            } })) throw new ConflictException('Synthetic operator ownership changed');
        actor = await tx.user.update({ where: { id: actor.id }, data: {
          uatFixtureRetiredAt: null, uatFixtureExpiresAt: new Date(expiresAt), uatFixtureAuthAfter: now,
        } });
      } else {
        actor = await tx.user.create({ data: {
          email, name: 'Company Co · synthetic role superadmin', role: 'superadmin',
          uatFixtureRunId: run.id, uatFixtureExpiresAt: new Date(expiresAt), uatFixtureAuthAfter: now,
        } });
        await tx.auditLog.create({ data: {
          userId: actorId, entity: ROLE_OPERATOR_ENTITY, entityId: actor.id,
          action: 'ROLE_OPERATOR_PROVISIONED', changes: JSON.stringify({ runId: run.id, syntheticOnly: true }),
        } });
      }
      const sessionId = randomUUID();
      await tx.auditLog.create({ data: {
        userId: actorId, entity: ROLE_OPERATOR_ENTITY, entityId: sessionId, action: 'ROLE_OPERATOR_STARTED', createdAt: now,
        changes: JSON.stringify({ operatorId: actor.id, runId: run.id, expiresAt, purpose: 'role_selector_uat' }),
      } });
      const members = JSON.parse(run.members);
      return { sessionId, runId: run.id, expiresAt, operatorId: actor.id, otherCompanyId: members[1].companyId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
    return { ...session,
      token: this.auth.generateRoleOperatorToken(session.operatorId, session.sessionId, session.expiresAt),
      expiryProbe: this.auth.generateRoleOperatorToken(session.operatorId, session.sessionId, Math.min(session.expiresAt, Date.now() + 5000)),
    };
  }

  async retire(actorId: string, sessionId: unknown) {
    await this.owner(actorId);
    if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/.test(sessionId)) throw new NotFoundException();
    const event = await this.prisma.auditLog.findFirst({ where: {
      userId: actorId, entity: ROLE_OPERATOR_ENTITY, entityId: sessionId, action: 'ROLE_OPERATOR_STARTED',
    } });
    if (!event) throw new NotFoundException();
    const details = JSON.parse(event.changes || 'null');
    const run = await this.prisma.uatFixtureRun.findUnique({ where: { id: details.runId } });
    if (!run || run.createdBy !== actorId) throw new ForbiddenException();
    await this.lifecycle.setRetired(actorId, run.id, true);
    await this.prisma.auditLog.create({ data: {
      userId: actorId, entity: ROLE_OPERATOR_ENTITY, entityId: sessionId, action: 'ROLE_OPERATOR_ENDED',
      changes: JSON.stringify({ runId: run.id, operatorId: details.operatorId, reason: 'explicit_owned_fixture_retirement' }),
    } });
    return { retired: true, runId: run.id };
  }
}
