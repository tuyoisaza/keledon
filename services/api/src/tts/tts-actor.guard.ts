import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LocalAuthService } from '../auth-local/auth-local.service';
import { RuntimeActorGuard } from '../gateways/runtime-identity';
import { PrismaService } from '../prisma/prisma.service';

/** Brain may select a tenant only with a current DB-backed superadmin session. */
@Injectable()
export class TtsActorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const match = /^Bearer (\S+)$/.exec(request.headers.authorization || '');
    if (!match) throw new UnauthorizedException('Authentication required');

    // validateToken checks signature, expiry, current account lifecycle and DB role.
    const actor = await new LocalAuthService(this.prisma).validateToken(match[1], { allowSyntheticTts: true });
    if (actor) {
      // The signature has been verified above; preview tokens never authorize TTS.
      const payload = JSON.parse(
        Buffer.from(match[1].split('.')[0], 'base64').toString('utf8'),
      );
      if (payload.uatTestProfile || payload.uatTestSessionId || payload.uatActorUserId)
        throw new ForbiddenException('Role preview cannot invoke TTS');
    }
    if (actor?.role === 'superadmin') {
      request.user = {
        userId: actor.id,
        companyId: actor.company_id,
        teamId: actor.team_id,
        role: actor.role,
        email: actor.email,
      };
    } else if (actor?.syntheticTtsRunId) {
      // Dedicated synthetic accounts obey the same DB assignment intersection.
      const team = actor.team_id && await this.prisma.team.findUnique({
        where: { id: actor.team_id }, select: { id: true, brand: { select: { companyId: true } } },
      });
      if (!team || !actor.company_id || team.brand?.companyId !== actor.company_id)
        throw new UnauthorizedException('Assigned synthetic user required');
      request.user = { userId: actor.id, companyId: actor.company_id, teamId: team.id,
        role: actor.role, email: actor.email };
      request.runtimeIdentity = { userId: actor.id, teamId: team.id, companyId: actor.company_id };
    } else {
      // Retain assignment/tenant checks and the paired-device authentication path.
      await new RuntimeActorGuard(this.prisma).canActivate(context);
    }

    const selected =
      request.body?.teamId ??
      (actor?.role !== 'superadmin' ? request.runtimeIdentity?.teamId : undefined);
    if (typeof selected !== 'string' || !selected.trim() || selected.length > 128)
      throw new BadRequestException('A valid teamId is required');
    const teamId = selected.trim();
    if (actor?.syntheticTtsRunId) {
      await this.prisma.auditLog.create({ data: {
        userId: actor.id, entity: 'BRAIN_TTS_SYNTHETIC', entityId: actor.syntheticTtsRunId,
        action: 'TTS_SYNTHETIC_REQUEST', changes: JSON.stringify({ teamId }),
      } });
      if (typeof request.body?.text !== 'string' || request.body.text.length > 250)
        throw new BadRequestException('Synthetic TTS samples are limited to 250 characters');
    }
    if (actor?.role !== 'superadmin' && teamId !== request.runtimeIdentity?.teamId)
      throw new ForbiddenException('TTS access to the selected team is denied');

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { brand: { include: { company: true } } },
    });
    if (!team) throw new NotFoundException('Selected TTS team does not exist');
    if (actor?.syntheticTtsRunId && actor.role === 'superadmin' && team.id !== actor.syntheticTtsTeamId)
      throw new ForbiddenException('Synthetic TTS session is limited to its approved selected team');
    if (!team.brand?.company)
      throw new BadRequestException('Selected TTS team has no valid brand/company');

    request.ttsScope = {
      teamId: team.id,
      brandId: team.brand.id,
      companyId: team.brand.company.id,
    };
    request.body = { ...request.body, teamId: team.id };
    return true;
  }
}
