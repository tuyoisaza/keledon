import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Deny unscoped entrypoints; intersect every caller filter/record with current DB scope. */
@Injectable()
export class ResourceScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const kind = context.getClass().name;
    const handler = context.getHandler().name;
    if (kind === 'MvpDataController' && handler === 'getCloudConfig')
      return true; // explicit public safe endpoint
    const deny = () => {
      throw new ForbiddenException('Resource access denied');
    };
    const actor =
      req.user?.userId &&
      (await this.prisma.user.findUnique({ where: { id: req.user.userId } }));
    if (
      !actor ||
      ![
        'user',
        'agent',
        'guest',
        'admin',
        'coordinator',
        'superadmin',
      ].includes(actor.role)
    )
      return deny();
    req.user = {
      ...req.user,
      userId: actor.id,
      companyId: actor.companyId,
      teamId: actor.teamId,
      role: actor.role,
    };
    if (actor.role === 'superadmin') return true;
    if (!actor.companyId) return deny();
    const manager = ['admin', 'coordinator'].includes(actor.role);
    const body = req.body || {};
    const query = { ...req.query };
    const params = req.params || {};
    const teamAllowed = async (id: string) => {
      if (
        !id ||
        !(await this.prisma.team.findFirst({
          where: {
            id,
            brand: { companyId: actor.companyId },
            ...(!manager ? { id: actor.teamId || '__DENY__' } : {}),
          },
          select: { id: true },
        }))
      )
        deny();
    };
    const flowAllowed = async (id: string) => {
      const flow =
        id &&
        (await this.prisma.flow.findUnique({
          where: { id },
          select: { id: true, teamId: true },
        }));
      if (!flow?.teamId) return deny();
      await teamAllowed(flow.teamId);
      return flow;
    };
    const sessionAllowed = async (id: string) => {
      const session =
        id &&
        (await this.prisma.session.findUnique({
          where: { id },
          select: { teamId: true, userId: true },
        }));
      if (!session?.teamId || (!manager && session.userId !== actor.id))
        return deny();
      await teamAllowed(session.teamId);
      return session;
    };
    if (kind === 'MvpDataController') {
      if (
        !['getProviderCatalog', 'getRpaProviders', 'getTechStatus'].includes(
          handler,
        )
      )
        return deny();
    } else if (kind === 'TTSController') {
      await teamAllowed(actor.teamId);
      body.teamId = actor.teamId;
    } else if (kind === 'RAGController') {
      await sessionAllowed(params.sessionId || body.sessionId);
      body.companyId = actor.companyId;
    } else if (kind === 'VectorStoreController') {
      if (handler !== 'search' && !(handler === 'addDocument' && manager))
        return deny();
      body.company_id = actor.companyId;
      body.team_id = actor.teamId;
      if (body.brand_id) {
        const brand = await this.prisma.brand.findFirst({
          where: { id: body.brand_id, companyId: actor.companyId },
          select: { id: true },
        });
        if (!brand) return deny();
      }
      // Cross-scope point mutation cannot be proved through the legacy default collection API.
      // Keep update/delete/reindex/collection administration superadmin-only.
    } else if (kind === 'KnowledgeController') {
      if (!manager && handler !== 'searchKnowledge') return deny();
      body.companyId = actor.companyId;
      query.companyId = actor.companyId;
      if (!manager) body.teamId = actor.teamId || '__DENY__';
      else if (body.teamId) await teamAllowed(body.teamId);
      const id = params.id || body.knowledgeBaseId;
      if (id) {
        const kb = await this.prisma.knowledgeBase.findUnique({
          where: { id },
          select: { companyId: true },
        });
        if (!kb || kb.companyId !== actor.companyId) return deny();
      }
    } else if (kind === 'FlowController') {
      if (req.method !== 'GET' && !manager) return deny();
      if (params.id) await flowAllowed(params.id);
      if (params.stepId) {
        const step = await this.prisma.flowStep.findUnique({
          where: { id: params.stepId },
          select: { flowId: true },
        });
        if (!step) return deny();
        await flowAllowed(step.flowId);
        if (body.flowId !== undefined && body.flowId !== step.flowId)
          return deny();
        if (body.nextStepId) {
          const next = await this.prisma.flowStep.findUnique({
            where: { id: body.nextStepId },
            select: { flowId: true },
          });
          if (!next || next.flowId !== step.flowId) return deny();
        }
      }
      for (const item of body.steps || []) {
        if (item.nextStepId) {
          const next = await this.prisma.flowStep.findUnique({
            where: { id: item.nextStepId },
            select: { flowId: true },
          });
          if (!next || next.flowId !== params.id) return deny();
        }
      }
      for (const stepId of body.stepIds || []) {
        const step = await this.prisma.flowStep.findUnique({
          where: { id: stepId },
          select: { flowId: true },
        });
        if (!step || step.flowId !== params.id) return deny();
      }
      if (body.teamId) await teamAllowed(body.teamId);
      if (!params.id && !params.stepId) {
        const teamId = query.teamId || body.teamId || actor.teamId;
        await teamAllowed(teamId);
        query.teamId = teamId;
        if (req.method === 'POST') {
          body.teamId = teamId;
          body.createdBy = actor.id;
        }
      }
      // Never pass Prisma relation writes through the single-step legacy update service.
      if (
        params.stepId &&
        Object.keys(body).some(
          (key) =>
            ![
              'order',
              'type',
              'selector',
              'selectorType',
              'value',
              'extract',
              'waitFor',
              'condition',
              'timeout',
              'optional',
              'nextStepId',
            ].includes(key),
        )
      )
        return deny();
    } else if (kind === 'SubAgentController') {
      let sessionId = params.sessionId || body.sessionId;
      if (params.runId) {
        const run = await this.prisma.flowRun.findUnique({
          where: { id: params.runId },
          select: { sessionId: true },
        });
        sessionId = run?.sessionId;
      }
      if (!sessionId) return deny(); // aggregate/agent-memory lookups are global, superadmin only
      const session = await sessionAllowed(sessionId);
      for (const flowId of [
        ...(body.flowIds || []),
        ...(body.flowId ? [body.flowId] : []),
      ]) {
        const flow = await flowAllowed(flowId);
        if (flow.teamId !== session.teamId) return deny();
      }
    } else if (kind === 'CallsController') {
      const session = params.sessionId
        ? await sessionAllowed(params.sessionId)
        : null;
      if (handler === 'createCall') {
        const device =
          body.deviceId &&
          (await this.prisma.device.findUnique({
            where: { id: body.deviceId },
          }));
        if (
          !device ||
          device.organizationId !== actor.companyId ||
          (!manager && device.userId !== actor.id)
        )
          return deny();
        body.userId = actor.id;
        body.teamId = actor.teamId;
        body.keledonId = device.keledonId;
        await teamAllowed(body.teamId);
      }
      const teamId = session?.teamId || body.teamId;
      if (body.activeVendorId) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: body.activeVendorId },
          select: { teamId: true },
        });
        if (!vendor || vendor.teamId !== teamId) return deny();
      }
      if (body.activeFlowId) {
        const flow = await flowAllowed(body.activeFlowId);
        if (flow.teamId !== teamId) return deny();
      }
    } else return deny();
    req.body = body;
    Object.defineProperty(req, 'query', { value: query, configurable: true });
    return true;
  }
}
