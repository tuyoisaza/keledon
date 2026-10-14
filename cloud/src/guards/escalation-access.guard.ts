import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CurrentActor = {
  id: string;
  role: string;
  companyId: string | null;
  teamId: string | null;
  name: string | null;
};

type EscalationRequest = {
  user?: { userId?: string };
  actor?: CurrentActor;
  escalationTeamIds?: string[];
  escalationTeamId?: string;
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
};

/** Resolve escalation authority and tenant scope from current database records. */
@Injectable()
export class EscalationAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<EscalationRequest>();
    const actor = req.user?.userId
      ? await this.prisma.user.findUnique({
          where: { id: req.user.userId },
          select: {
            id: true,
            role: true,
            companyId: true,
            teamId: true,
            name: true,
          },
        })
      : null;
    const deny = (): never => {
      throw new ForbiddenException('Escalation access denied');
    };
    if (
      !actor ||
      !['user', 'agent', 'admin', 'coordinator', 'superadmin'].includes(
        actor.role,
      )
    )
      return deny();
    req.actor = actor;
    if (actor.role === 'superadmin') return true;
    if (!actor.companyId) return deny();

    const manager = ['admin', 'coordinator'].includes(actor.role);
    const teams = await this.prisma.team.findMany({
      where: { brand: { companyId: actor.companyId } },
      select: { id: true },
    });
    const teamIds = teams.map((team) => team.id);
    if (!teamIds.length) return deny();
    req.escalationTeamIds = teamIds;

    const assertTeam = (teamId: string | null | undefined) => {
      if (
        !teamId ||
        !teamIds.includes(teamId) ||
        (!manager && teamId !== actor.teamId)
      )
        return deny();
    };
    const handler = context.getHandler().name;
    if (handler === 'getStats') {
      const rawTeamId = req.query?.teamId;
      if (rawTeamId !== undefined && typeof rawTeamId !== 'string')
        return deny();
      const teamId = typeof rawTeamId === 'string' ? rawTeamId : undefined;
      if (teamId) assertTeam(teamId);
      else if (!manager) assertTeam(actor.teamId);
      req.escalationTeamId = teamId || (manager ? undefined : actor.teamId);
    } else if (handler === 'getActive') {
      if (!manager) return deny();
    } else if (handler === 'getByTeam') {
      assertTeam(req.params?.teamId);
    } else if (handler === 'getBySession') {
      const session = await this.prisma.session.findUnique({
        where: { id: req.params?.sessionId },
        select: { id: true, userId: true, teamId: true },
      });
      if (!session?.teamId) return deny();
      assertTeam(session.teamId);
      if (!manager && session.userId !== actor.id) return deny();
    } else if (handler === 'acknowledge' || handler === 'resolve') {
      if (!manager) return deny();
      const escalation = await this.prisma.escalationLog.findUnique({
        where: { id: req.params?.id },
        select: { id: true, teamId: true },
      });
      if (!escalation?.teamId) return deny();
      assertTeam(escalation.teamId);
    } else return deny();

    return true;
  }
}
