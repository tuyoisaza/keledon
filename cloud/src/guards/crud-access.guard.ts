import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CurrentActor = Pick<User, 'id' | 'role' | 'companyId' | 'teamId'>;
type CrudGuardRequest = {
  user?: { userId?: string };
  actor?: CurrentActor;
  method: string;
  route?: { path?: string };
  path?: string;
  body?: unknown;
  params?: Record<string, string | undefined>;
  query?: Record<string, unknown>;
  companyScope?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ForbiddenException('Resource access denied');
  }
  return value;
}

// Management permissions are derived from current records, never token role or caller filters.
@Injectable()
export class CrudAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<CrudGuardRequest>();
    const handler = context.getHandler().name;
    const actor =
      req.user?.userId &&
      (await this.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, role: true, companyId: true, teamId: true },
      }));
    const deny = (): never => {
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
    // Audit records are append-only security evidence. Trusted interceptors and
    // domain services write them; the general CRUD API is read-only.
    const trustedAuditExport =
      superadmin && handler === 'recordAuditExport' && req.method === 'POST';
    if (
      resource === 'audit-logs' &&
      req.method !== 'GET' &&
      !trustedAuditExport
    )
      return deny();
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
      'knowledge',
      'interfaces',
    ];
    if (!superadmin && !scoped.includes(resource)) return deny();
    if (
      !superadmin &&
      resource === 'interfaces' &&
      !(req.method === 'GET' && ['admin', 'coordinator'].includes(actor.role))
    )
      return deny();
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

    const company = actor.companyId ?? '';
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
    let entries: Record<string, unknown>[];
    if (Array.isArray(req.body)) {
      entries = req.body.filter(isRecord);
      if (entries.length !== req.body.length) deny();
    } else if (!req.body) {
      entries = [{}];
    } else if (isRecord(req.body)) {
      entries = [req.body];
    } else {
      return deny();
    }
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
        // Password hashes are produced only by the authentication service; never accept
        // credential material through the general-purpose user CRUD endpoint.
        users: ['email', 'name', 'companyId', 'teamId', 'role'],
        vendors: [
          'teamId',
          'name',
          'type',
          'baseUrl',
          'allowedOrigins',
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
        ],
        sessions:
          handler === 'createSession'
            ? ['teamId', 'userId', 'status', 'metadata']
            : handler === 'updateSession'
              ? ['status', 'metadata']
              : ['teamId', 'userId', 'status', 'metadata'],
        knowledge:
          handler === 'createKnowledgeBase'
            ? ['companyId', 'name', 'description']
            : handler === 'updateKnowledgeBase'
              ? ['name', 'description']
              : ['knowledgeBaseId', 'title', 'content', 'metadata'],
      };
      if (
        !launch &&
        fields[resource] &&
        Object.keys(data).some((key) => !fields[resource].includes(key))
      )
        deny();
      if (
        !superadmin &&
        resource === 'teams' &&
        handler === 'setTeamInterfaces'
      ) {
        if (
          !Array.isArray(data.interfaceIds) ||
          data.interfaceIds.some((interfaceId) => typeof interfaceId !== 'string') ||
          new Set(data.interfaceIds).size !== data.interfaceIds.length
        )
          deny();
        const interfaceIds = data.interfaceIds as string[];
        const permitted = await this.prisma.managedInterface.findMany({
          where: { id: { in: interfaceIds }, companyId: company },
          select: { id: true },
        });
        if (permitted.length !== interfaceIds.length) deny();
      }
      if (
        data.countries !== undefined &&
        (!Array.isArray(data.countries) ||
          data.countries.some((code) => typeof code !== 'string'))
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
          (value) =>
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
      if (!superadmin && resource === 'knowledge') {
        if (handler === 'createKnowledgeBase') data.companyId = company;
        if (handler === 'createKnowledgeDocument') {
          const knowledgeBaseId = requireString(req.params?.id);
          await this.assertKnowledgeBaseCompany(knowledgeBaseId, company, deny);
          data.knowledgeBaseId = knowledgeBaseId;
        }
      }
      if (
        req.method === 'POST' &&
        !req.params?.id &&
        !launch &&
        ['teams', 'vendors', 'keledons', 'sessions'].includes(resource)
      ) {
        if (resource === 'teams') {
          const brandId = requireString(data.brandId);
          await assertBrand(brandId);
        } else {
          const teamId = requireString(data.teamId);
          await assertTeam(teamId);
        }
      }
      if (typeof data.teamId === 'string') await assertTeam(data.teamId);
      if (typeof data.brandId === 'string') await assertBrand(data.brandId);
      if (
        resource === 'users' &&
        typeof data.teamId === 'string' &&
        typeof data.companyId === 'string'
      ) {
        const team = await this.prisma.team.findFirst({
          where: { id: data.teamId, brand: { companyId: data.companyId } },
          select: { id: true },
        });
        if (!team) deny();
      }
      if (typeof data.userId === 'string' && !launch) {
        const target = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { companyId: true, teamId: true },
        });
        if (
          !target ||
          (!superadmin && target.companyId !== company) ||
          (typeof data.teamId === 'string' && target.teamId !== data.teamId)
        )
          deny();
      }
      if (resource === 'users') {
        const role = data.role;
        if (role !== undefined) {
          const roleString = requireString(role);
          if (
            ![
              'guest',
              'user',
              'agent',
              'admin',
              'coordinator',
              'superadmin',
            ].includes(roleString)
          )
            deny();
        }
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
    if (!superadmin && resource === 'knowledge' && id) {
      await this.assertKnowledgeBaseCompany(id, company, deny);
    }
    if (!superadmin && resource === 'knowledge' && req.params?.docId) {
      const document = await this.prisma.knowledgeDocument.findUnique({
        where: { id: req.params.docId },
        select: { knowledgeBase: { select: { companyId: true } } },
      });
      if (document?.knowledgeBase?.companyId !== company) return deny();
    }
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
      const record = await this.findScopedRecord(resource, id);
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

  private findScopedRecord(
    resource: string,
    id: string,
  ): Promise<{
    companyId?: string | null;
    teamId?: string | null;
    role?: string;
    userId?: string | null;
  } | null> {
    switch (resource) {
      case 'users':
        return this.prisma.user.findUnique({
          where: { id },
          select: { companyId: true, teamId: true, role: true },
        });
      case 'vendors':
        return this.prisma.vendor.findUnique({
          where: { id },
          select: { teamId: true },
        });
      case 'keledons':
        return this.prisma.keledon.findUnique({
          where: { id },
          select: { teamId: true, userId: true },
        });
      case 'voice-profiles':
        return this.prisma.tenantVoiceProfile.findUnique({
          where: { id },
          select: { companyId: true },
        });
      case 'sessions':
        return this.prisma.session.findUnique({
          where: { id },
          select: { teamId: true },
        });
      default:
        return Promise.resolve(null);
    }
  }

  private async assertKnowledgeBaseCompany(
    id: string,
    companyId: string,
    deny: () => never,
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (knowledgeBase?.companyId !== companyId) deny();
  }
}
