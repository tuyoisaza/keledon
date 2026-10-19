import type { Prisma } from '@prisma/client';
import { isAccountActive } from './account-lifecycle.policy';

export const ROLE_OPERATOR_ENTITY = 'ROLE_PREVIEW_OPERATOR';
export const ROLE_OPERATOR_TTL_MS = 15 * 60000;

/** Resolve a delegated synthetic actor only from persisted ownership and provisioning evidence. */
export async function rolePreviewOwner(prisma: Prisma.TransactionClient, actorId: string): Promise<string | null> {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (actor?.role !== 'superadmin' || !isAccountActive(actor)) return null;
  if (!actor.uatFixtureRunId) return actor.id;
  if (actor.passwordHash || actor.companyId || actor.teamId ||
      actor.email !== `phdk-role-operator-${actor.uatFixtureRunId.slice(9)}@example.invalid`) return null;
  const run = await prisma.uatFixtureRun.findUnique({ where: { id: actor.uatFixtureRunId } });
  if (!run || run.retiredAt || run.expiresAt.getTime() <= Date.now()) return null;
  const owner = await prisma.user.findUnique({ where: { id: run.createdBy } });
  if (owner?.role !== 'superadmin' || owner.uatFixtureRunId || !isAccountActive(owner)) return null;
  const provisioned = await prisma.auditLog.findFirst({ where: {
    entity: ROLE_OPERATOR_ENTITY, entityId: actorId, action: 'ROLE_OPERATOR_PROVISIONED', userId: owner.id,
  } });
  if (!provisioned) return null;
  const details = JSON.parse(provisioned.changes || 'null');
  return details?.runId === run.id ? owner.id : null;
}

export async function roleOperatorSession(prisma: Prisma.TransactionClient, actorId: string, sessionId: string) {
  const ownerId = await rolePreviewOwner(prisma, actorId);
  if (!ownerId || ownerId === actorId) return null;
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  const event = await prisma.auditLog.findFirst({ where: {
    entity: ROLE_OPERATOR_ENTITY, entityId: sessionId, action: 'ROLE_OPERATOR_STARTED', userId: ownerId,
  } });
  if (!event || !actor || event.createdAt.getTime() < (actor.uatFixtureAuthAfter?.getTime() ?? Infinity)) return null;
  const details = JSON.parse(event.changes || 'null');
  if (details?.operatorId !== actorId || details.runId !== actor.uatFixtureRunId ||
      !Number.isFinite(details.expiresAt) || details.expiresAt <= Date.now() ||
      details.expiresAt - event.createdAt.getTime() > ROLE_OPERATOR_TTL_MS ||
      await prisma.auditLog.findFirst({ where: {
        entity: ROLE_OPERATOR_ENTITY, entityId: sessionId, action: 'ROLE_OPERATOR_ENDED',
      } })) return null;
  return { actor, ownerId, expiresAt: details.expiresAt as number, runId: details.runId as string };
}
