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
    const actor = await new LocalAuthService(this.prisma).validateToken(match[1]);
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
    if (actor?.role !== 'superadmin' && teamId !== request.runtimeIdentity?.teamId)
      throw new ForbiddenException('TTS access to the selected team is denied');

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { brand: { include: { company: true } } },
    });
    if (!team) throw new NotFoundException('Selected TTS team does not exist');
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
