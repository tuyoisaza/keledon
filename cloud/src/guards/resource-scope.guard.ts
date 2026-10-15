import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type RequestRecord = Record<string, unknown>;

interface ResourceScopeRequest {
  user?: RequestRecord;
  vectorScope?: { companyId: string; teamId?: string };
  body?: unknown;
  query?: RequestRecord;
  params?: RequestRecord;
  method?: string;
}

function asRecord(value: unknown): RequestRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RequestRecord)
    : {};
}

function stringField(record: RequestRecord, field: string): string | undefined {
  const value = record[field];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function stringArrayField(record: RequestRecord, field: string): string[] {
  const value = record[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function recordArrayField(
  record: RequestRecord,
  field: string,
): RequestRecord[] {
  const value = record[field];
  return Array.isArray(value) ? value.map(asRecord) : [];
}

/** Deny unscoped entrypoints; intersect every caller filter/record with current DB scope. */
@Injectable()
export class ResourceScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ResourceScopeRequest>();
    const kind = context.getClass().name;
    const handler = context.getHandler().name;
    if (kind === 'MvpDataController' && handler === 'getCloudConfig')
      return true; // explicit public safe endpoint
    const deny = () => {
      throw new ForbiddenException('Resource access denied');
    };
    const requestedActorId = req.user
      ? stringField(req.user, 'userId')
      : undefined;
    const actor = requestedActorId
      ? await this.prisma.user.findUnique({
          where: { id: requestedActorId },
        })
      : null;
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
      ...asRecord(req.user),
      userId: actor.id,
      companyId: actor.companyId,
      teamId: actor.teamId,
      role: actor.role,
    };
    if (actor.role === 'superadmin') return true;
    if (!actor.companyId) return deny();
    const manager = ['admin', 'coordinator'].includes(actor.role);
    const body = asRecord(req.body);
    const query = { ...req.query };
    const params = asRecord(req.params);
    const teamAllowed = async (id: unknown): Promise<void> => {
      if (typeof id !== 'string') return deny();
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
    const flowAllowed = async (id: unknown) => {
      if (typeof id !== 'string') return deny();
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
    const sessionAllowed = async (id: unknown) => {
      if (typeof id !== 'string') return deny();
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
      const tenantFlowHandlers = [
        'getFlowDefinitions',
        'createFlowDefinition',
        'updateFlowDefinition',
        'archiveFlowDefinition',
        'getFlowVersions',
        'createFlowVersion',
        'updateFlowVersion',
        'getTenantFlowPermissions',
        'upsertTenantFlowPermissions',
        'getIntentFlowMappings',
        'upsertIntentFlowMapping',
      ];
      const safeReadHandlers = [
        'getProviderCatalog',
        'getRpaProviders',
        'getTechStatus',
      ];
      if (
        !manager ||
        (!safeReadHandlers.includes(handler) &&
          !tenantFlowHandlers.includes(handler))
      )
        return deny();
      if (tenantFlowHandlers.includes(handler)) {
        query.companyId = actor.companyId;
        params.companyId = actor.companyId;
        if (
          [
            'createFlowDefinition',
            'updateFlowDefinition',
            'upsertIntentFlowMapping',
          ].includes(handler)
        )
          body.companyId = actor.companyId;
        if (
          handler === 'upsertTenantFlowPermissions' &&
          Array.isArray(req.body)
        ) {
          req.body = req.body.map((entry) => ({
            ...asRecord(entry),
            companyId: actor.companyId,
          }));
        }
      }
    } else if (kind === 'TTSController') {
      await teamAllowed(actor.teamId);
      body.teamId = actor.teamId;
    } else if (kind === 'RAGController') {
      await sessionAllowed(
        stringField(params, 'sessionId') || stringField(body, 'sessionId'),
      );
      body.companyId = actor.companyId;
    } else if (kind === 'VectorStoreController') {
      const scopedRead = ['search', 'getStatus', 'listDocuments'].includes(
        handler,
      );
      const scopedWrite =
        manager &&
        ['addDocument', 'updateDocument', 'deleteDocument'].includes(handler);
      if (!scopedRead && !scopedWrite) return deny();
      // addDocument uses Qdrant upsert, so accepting a caller ID would let a
      // tenant manager overwrite an existing point from another tenant.
      if (
        handler === 'addDocument' &&
        body.id !== undefined &&
        actor.role !== 'superadmin'
      )
        return deny();
      body.company_id = actor.companyId;
      const requestedTeamId = stringField(body, 'team_id');
      if (manager) {
        if (requestedTeamId) await teamAllowed(requestedTeamId);
        body.team_id = requestedTeamId || undefined;
      } else {
        await teamAllowed(actor.teamId);
        body.team_id = actor.teamId;
      }
      const brandId = stringField(body, 'brand_id');
      if (brandId) {
        const brand = await this.prisma.brand.findFirst({
          where: { id: brandId, companyId: actor.companyId },
          select: { id: true },
        });
        if (!brand) return deny();
      }
      if (['addDocument', 'updateDocument'].includes(handler))
        body.created_by = actor.id;
      if (['getStatus', 'listDocuments'].includes(handler)) {
        req.vectorScope = {
          companyId: actor.companyId,
          ...(!manager ? { teamId: actor.teamId } : {}),
        };
      } else if (['updateDocument', 'deleteDocument'].includes(handler)) {
        req.vectorScope = { companyId: actor.companyId };
      }
    } else if (kind === 'KnowledgeController') {
      if (!manager && handler !== 'searchKnowledge') return deny();
      body.companyId = actor.companyId;
      query.companyId = actor.companyId;
      if (!manager) body.teamId = actor.teamId || '__DENY__';
      else if (stringField(body, 'teamId')) {
        await teamAllowed(stringField(body, 'teamId'));
      }
      const id =
        stringField(params, 'id') || stringField(body, 'knowledgeBaseId');
      if (id) {
        const kb = await this.prisma.knowledgeBase.findUnique({
          where: { id },
          select: { companyId: true },
        });
        if (!kb || kb.companyId !== actor.companyId) return deny();
      }
    } else if (kind === 'FlowController') {
      if (req.method !== 'GET' && !manager) return deny();
      const flowIdParam = stringField(params, 'id');
      const stepIdParam = stringField(params, 'stepId');
      if (flowIdParam) await flowAllowed(flowIdParam);
      if (stepIdParam) {
        const step = await this.prisma.flowStep.findUnique({
          where: { id: stepIdParam },
          select: { flowId: true },
        });
        if (!step) return deny();
        await flowAllowed(step.flowId);
        if (
          body.flowId !== undefined &&
          stringField(body, 'flowId') !== step.flowId
        )
          return deny();
        const nextStepId = stringField(body, 'nextStepId');
        if (nextStepId) {
          const next = await this.prisma.flowStep.findUnique({
            where: { id: nextStepId },
            select: { flowId: true },
          });
          if (!next || next.flowId !== step.flowId) return deny();
        }
      }
      for (const item of recordArrayField(body, 'steps')) {
        const nextStepId = stringField(item, 'nextStepId');
        if (nextStepId) {
          const next = await this.prisma.flowStep.findUnique({
            where: { id: nextStepId },
            select: { flowId: true },
          });
          if (!next || next.flowId !== flowIdParam) return deny();
        }
      }
      for (const stepId of stringArrayField(body, 'stepIds')) {
        const step = await this.prisma.flowStep.findUnique({
          where: { id: stepId },
          select: { flowId: true },
        });
        if (!step || step.flowId !== flowIdParam) return deny();
      }
      const bodyTeamId = stringField(body, 'teamId');
      if (bodyTeamId) await teamAllowed(bodyTeamId);
      if (!flowIdParam && !stepIdParam) {
        const teamId =
          stringField(query, 'teamId') || bodyTeamId || actor.teamId;
        await teamAllowed(teamId);
        query.teamId = teamId;
        if (req.method === 'POST') {
          body.teamId = teamId;
          body.createdBy = actor.id;
        }
      }
      // Never pass Prisma relation writes through the single-step legacy update service.
      if (
        stepIdParam &&
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
      let sessionId =
        stringField(params, 'sessionId') || stringField(body, 'sessionId');
      const runId = stringField(params, 'runId');
      if (runId) {
        const run = await this.prisma.flowRun.findUnique({
          where: { id: runId },
          select: { sessionId: true },
        });
        sessionId = run?.sessionId;
      }
      if (!sessionId) return deny(); // aggregate/agent-memory lookups are global, superadmin only
      const session = await sessionAllowed(sessionId);
      const flowIds = stringArrayField(body, 'flowIds');
      const flowId = stringField(body, 'flowId');
      if (flowId) flowIds.push(flowId);
      for (const flowId of flowIds) {
        const flow = await flowAllowed(flowId);
        if (flow.teamId !== session.teamId) return deny();
      }
    } else if (kind === 'CallsController') {
      const sessionId = stringField(params, 'sessionId');
      const session = sessionId ? await sessionAllowed(sessionId) : null;
      if (handler === 'createCall') {
        const deviceId = stringField(body, 'deviceId');
        const device =
          deviceId &&
          (await this.prisma.device.findUnique({
            where: { id: deviceId },
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
      const teamId = session?.teamId || stringField(body, 'teamId');
      const activeVendorId = stringField(body, 'activeVendorId');
      if (activeVendorId) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: activeVendorId },
          select: { teamId: true },
        });
        if (!vendor || vendor.teamId !== teamId) return deny();
      }
      const activeFlowId = stringField(body, 'activeFlowId');
      if (activeFlowId) {
        const flow = await flowAllowed(activeFlowId);
        if (flow.teamId !== teamId) return deny();
      }
    } else return deny();
    if (!(
      kind === 'MvpDataController' && handler === 'upsertTenantFlowPermissions'
    ))
      req.body = body;
    Object.defineProperty(req, 'query', { value: query, configurable: true });
    return true;
  }
}
