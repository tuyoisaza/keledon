import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Management permissions are derived from current records, never token role or caller filters.
@Injectable()
export class CrudAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const handler = context.getHandler().name;
    // Webhook retains its separate shared-secret guard, not a user-token bypass.
    if (handler === 'webhook') return true;
    const actor =
      req.user?.userId &&
      (await this.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, role: true, companyId: true, teamId: true },
      }));
    const deny = () => {
      throw new ForbiddenException('Resource access denied');
    };
    if (!actor) return deny();
    if (
      ![
        'guest',
        'user',
        'agent',
        'admin',
        'coordinator',
        'superadmin',
      ].includes(actor.role)
    )
      return deny();
    req.actor = actor;
    const superadmin = actor.role === 'superadmin';
    const management =
      superadmin || ['admin', 'coordinator'].includes(actor.role);
    const launch = handler === 'launchKeledon';
    const read = req.method === 'GET';
    const path = (req.route?.path || req.path || '').replace(
      /^\/api\/(crud|tenant)\/?/,
      '',
    );
    const resource =
      path.split('/')[0] === 'vendor' ? 'vendors' : path.split('/')[0];
    const scoped = [
      'companies',
      'brands',
      'teams',
      'users',
      'vendors',
      'keledons',
      'tenant-provider-config',
      'voice-profiles',
      'sessions',
    ];
    if (!superadmin && !scoped.includes(resource)) return deny();
    if (
      !management &&
      !launch &&
      !(read && ['keledons', 'vendors'].includes(resource))
    )
      return deny();
    if (!superadmin && !actor.companyId) return deny();
    if (
      !superadmin &&
      resource === 'companies' &&
      !read &&
      req.method !== 'PUT'
    )
      return deny();
    if (
      !superadmin &&
      [
        'regeneratePairingCode',
        'getPairingCode',
        'debugKeledonLaunch',
        'deleteOrphanedSessions',
        'getOrphanedSessionCount',
      ].includes(handler)
    )
      return deny();

    const company = actor.companyId;
    const teamScope = superadmin ? {} : { brand: { companyId: company } };
    const assertTeam = async (id: string) => {
      if (
        !id ||
        !(await this.prisma.team.findFirst({
          where: { id, ...teamScope },
          select: { id: true },
        }))
      )
        deny();
    };
    const assertBrand = async (id: string) => {
      if (
        !id ||
        !(await this.prisma.brand.findFirst({
          where: { id, ...(superadmin ? {} : { companyId: company }) },
          select: { id: true },
        }))
      )
        deny();
    };
    const entries = Array.isArray(req.body) ? req.body : [req.body || {}];
    for (const data of entries) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) deny();
      const fields: Record<string, string[]> = {
        companies: ['name', 'industry', 'countries', 'countryCode'],
        brands: ['name', 'companyId', 'color'],
        teams: [
          'name',
          'brandId',
          'country',
          'escalationTriggers',
          'interfaceIds',
        ],
        users: ['email', 'name', 'companyId', 'teamId', 'role', 'passwordHash'],
        vendors: [
          'teamId',
          'name',
          'type',
          'baseUrl',
          'username',
          'password',
          'apiKey',
          'config',
          'startGoal',
          'isActive',
        ],
        keledons: [
          'name',
          'teamId',
          'brandId',
          'countryCode',
          'userId',
          'email',
          'role',
          'isActive',
          'autonomyLevel',
          'policies',
          'uiInterfaces',
        ],
        'tenant-provider-config': [
          'companyId',
          'providerId',
          'providerType',
          'isEnabled',
          'isDefault',
          'limits',
        ],
        'voice-profiles': [
          'companyId',
          'name',
          'providerId',
          'language',
          'isEnabled',
          'isDefault',
          'config',
        ],
        sessions: [
          'teamId',
          'userId',
          'status',
          'startedAt',
          'endedAt',
          'transcript',
          'summary',
        ],
      };
      if (
        !launch &&
        fields[resource] &&
        Object.keys(data).some((key) => !fields[resource].includes(key))
      )
        deny();
      if (
        data.countries !== undefined &&
        (!Array.isArray(data.countries) ||
          data.countries.some((code: any) => typeof code !== 'string'))
      )
        deny();
      // Reject Prisma nested writes and other fields not part of the HTTP resource contract.
      const forbidden = [
        'connect',
        'create',
        'update',
        'delete',
        'upsert',
        'set',
      ];
      if (
        Object.values(data).some(
          (value: any) =>
            value &&
            typeof value === 'object' &&
            forbidden.some((key) => key in value),
        )
      )
        deny();
      if (
        !superadmin &&
        data.companyId !== undefined &&
        data.companyId !== company
      )
        deny();
      if (
        !superadmin &&
        req.method === 'POST' &&
        ['brands', 'voice-profiles'].includes(resource)
      )
        data.companyId = company;
      if (!superadmin && resource === 'tenant-provider-config')
        data.companyId = company;
      if (
        req.method === 'POST' &&
        !req.params?.id &&
        !launch &&
        ['teams', 'vendors', 'keledons', 'sessions'].includes(resource)
      ) {
        if (resource === 'teams') await assertBrand(data.brandId);
        else await assertTeam(data.teamId);
      }
      if (data.teamId) await assertTeam(data.teamId);
      if (data.brandId) await assertBrand(data.brandId);
      if (resource === 'users' && data.teamId && data.companyId) {
        const team = await this.prisma.team.findFirst({
          where: { id: data.teamId, brand: { companyId: data.companyId } },
          select: { id: true },
        });
        if (!team) deny();
      }
      if (data.userId && !launch) {
        const target = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { companyId: true, teamId: true },
        });
        if (
          !target ||
          (!superadmin && target.companyId !== company) ||
          (data.teamId && target.teamId !== data.teamId)
        )
          deny();
      }
      if (resource === 'users') {
        if (
          data.role !== undefined &&
          ![
            'guest',
            'user',
            'agent',
            'admin',
            'coordinator',
            'superadmin',
          ].includes(data.role)
        )
          deny();
        if (!superadmin && data.role !== undefined && data.role !== 'user')
          deny();
        if (!superadmin && req.method === 'POST') {
          data.role = 'user';
          data.companyId = company;
        }
        if (!superadmin && req.method === 'PUT' && data.companyId !== undefined)
          deny();
      }
    }
    const id = req.params?.id;
    if (resource === 'companies' && id && !superadmin && id !== company)
      return deny();
    if (resource === 'brands' && id) await assertBrand(id);
    if (resource === 'teams' && id) await assertTeam(id);
    if (resource === 'vendors' && req.params?.teamId) {
      await assertTeam(req.params.teamId);
      if (!management && req.params.teamId !== actor.teamId) return deny();
    }
    if (
      id &&
      ['users', 'vendors', 'keledons', 'voice-profiles', 'sessions'].includes(
        resource,
      )
    ) {
      const model = {
        users: 'user',
        vendors: 'vendor',
        keledons: 'keledon',
        'voice-profiles': 'tenantVoiceProfile',
        sessions: 'session',
      }[resource];
      const record = await (this.prisma as any)[model].findUnique({
        where: { id },
      });
      if (!record) return deny();
      if (!superadmin) {
        if (['users', 'voice-profiles'].includes(resource)) {
          if (record.companyId !== company) return deny();
        } else await assertTeam(record.teamId);
        if (resource === 'users' && !read && record.role !== 'user')
          return deny();
        if (
          !management &&
          resource === 'keledons' &&
          record.userId !== actor.id
        )
          return deny();
        if (
          !management &&
          resource === 'vendors' &&
          record.teamId !== actor.teamId
        )
          return deny();
      }
    }
    if (!superadmin && read && !id) {
      Object.defineProperty(req, 'query', {
        value: { ...req.query, companyId: company },
        configurable: true,
      });
      if (resource === 'companies') req.companyScope = company;
    }
    if (launch) req.body = { userId: actor.id };
    return true;
  }
}
