import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LocalAuthService } from '../auth-local/auth-local.service';
import { RuntimeActorGuard } from '../gateways/runtime-identity';
import { PrismaService } from '../prisma/prisma.service';

/** Only the explicit Brain/Meet entrypoint can select a team for an unassigned superadmin. */
@Injectable()
export class BrainMeetGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) throw new UnauthorizedException('Current session required');
    // Default validation excludes synthetic TTS capabilities; they cannot authorize conversation.
    const actor = await new LocalAuthService(this.prisma).validateToken(token);
    if (actor) {
      const claims = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8'));
      if (claims.uatTestProfile || claims.uatTestSessionId || claims.uatActorUserId)
        throw new ForbiddenException('Role preview cannot start a conversation');
    }
    if (actor?.role !== 'superadmin') await new RuntimeActorGuard(this.prisma).canActivate(context);
    const id = req.params.teamId;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(id))
      throw new BadRequestException('Valid selected team required');
    if (actor?.role !== 'superadmin' && req.runtimeIdentity?.teamId !== id)
      throw new ForbiddenException('Conversation access to selected team denied');
    const team = await this.prisma.team.findUnique({ where: { id }, include: { brand: { include: { company: true } } } });
    if (!team) throw new NotFoundException('Selected conversation team does not exist');
    if (!team.brand?.company) throw new BadRequestException('Selected team requires brand and company');
    req.runtimeIdentity = {
      ...req.runtimeIdentity, userId: actor?.id || req.runtimeIdentity.userId,
      teamId: team.id, teamName: team.name, brandId: team.brand.id, brandName: team.brand.name,
      companyId: team.brand.company.id, companyName: team.brand.company.name,
    };
    req.user = { ...req.user, userId: req.runtimeIdentity.userId };
    return true;
  }
}
