import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type {
  FlowDefinition,
  FlowDefinitionInput,
  FlowVersion,
  FlowVersionInput,
  FlowVersionUpdateInput,
  IntentFlowMapping,
  IntentFlowMappingInput,
  TenantFlowPermission,
  TenantFlowPermissionInput,
} from './mvp-store.types';
import {
  validateFlowDefinitionInput,
  validateFlowVersionInput,
  validateFlowVersionUpdateInput,
  validateIntentFlowMappingInput,
  validateTenantFlowPermissionInputs,
} from './mvp-store-write-validation';

type LegacyStore = Partial<{
  flowDefinitions: FlowDefinition[];
  flowVersions: FlowVersion[];
  tenantFlowPermissions: TenantFlowPermission[];
  intentFlowMappings: IntentFlowMapping[];
}>;

const iso = (value: Date) => value.toISOString();

@Injectable()
export class TenantFlowConfigService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.importLegacyStore();
  }

  async getFlowDefinitions(companyId?: string): Promise<FlowDefinition[]> {
    const records = await this.prisma.tenantFlowConfigDefinition.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { createdAt: 'asc' },
    });
    return records.map((item) => ({
      id: item.id,
      companyId: item.companyId ?? undefined,
      interfaceId: item.interfaceId ?? undefined,
      name: item.name,
      description: item.description ?? undefined,
      category: item.category as FlowDefinition['category'],
      status: item.status as FlowDefinition['status'],
      intentTags: item.intentTags,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    }));
  }

  async createFlowDefinition(
    input: FlowDefinitionInput,
  ): Promise<FlowDefinition> {
    validateFlowDefinitionInput(input);
    const companyId = String(input.companyId || '').trim();
    if (!companyId) throw new BadRequestException('Company scope is required');
    const item = await this.prisma.tenantFlowConfigDefinition.create({
      data: {
        companyId,
        interfaceId: input.interfaceId,
        name: String(input.name || 'New Flow'),
        description: input.description,
        category: input.category || 'case',
        status: input.status || 'active',
        intentTags: input.intentTags || [],
      },
    });
    return {
      id: item.id,
      companyId: item.companyId ?? undefined,
      interfaceId: item.interfaceId ?? undefined,
      name: item.name,
      description: item.description ?? undefined,
      category: item.category as FlowDefinition['category'],
      status: item.status as FlowDefinition['status'],
      intentTags: item.intentTags,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    };
  }

  async updateFlowDefinition(
    id: string,
    input: FlowDefinitionInput,
    companyId?: string,
  ): Promise<FlowDefinition | null> {
    validateFlowDefinitionInput(input);
    const current = await this.prisma.tenantFlowConfigDefinition.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
    });
    if (!current) return null;
    if (
      current.companyId &&
      input.companyId &&
      current.companyId !== input.companyId
    )
      throw new BadRequestException(
        'Flow ownership cannot change after assignment',
      );
    const changed = await this.prisma.tenantFlowConfigDefinition.updateMany({
      where: { id, ...(companyId ? { companyId } : {}) },
      data: {
        companyId: input.companyId,
        interfaceId: input.interfaceId,
        name: input.name,
        description: input.description,
        category: input.category,
        intentTags: input.intentTags,
        status: input.status,
      },
    });
    if (!changed.count) return null;
    const updated = await this.prisma.tenantFlowConfigDefinition.findUnique({
      where: { id },
    });
    if (!updated) return null;
    return {
      id: updated.id,
      companyId: updated.companyId ?? undefined,
      interfaceId: updated.interfaceId ?? undefined,
      name: updated.name,
      description: updated.description ?? undefined,
      category: updated.category as FlowDefinition['category'],
      status: updated.status as FlowDefinition['status'],
      intentTags: updated.intentTags,
      createdAt: iso(updated.createdAt),
      updatedAt: iso(updated.updatedAt),
    };
  }

  async getFlowVersions(companyId?: string): Promise<FlowVersion[]> {
    const records = await this.prisma.tenantFlowConfigVersion.findMany({
      where: companyId ? { flowDefinition: { companyId } } : undefined,
      orderBy: [{ flowDefinitionId: 'asc' }, { version: 'asc' }],
    });
    return records.map((item) => ({
      id: item.id,
      flowDefinitionId: item.flowDefinitionId,
      version: item.version,
      status: item.status as FlowVersion['status'],
      steps: Array.isArray(item.steps)
        ? (item.steps as FlowVersion['steps'])
        : [],
      createdBy: item.createdBy ?? undefined,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    }));
  }

  async createFlowVersion(
    input: FlowVersionInput,
    actorId: string,
    companyId?: string,
  ): Promise<FlowVersion> {
    validateFlowVersionInput(input);
    if (!actorId) throw new BadRequestException('Current actor is required');
    const definition = await this.prisma.tenantFlowConfigDefinition.findFirst({
      where: {
        id: input.flowDefinitionId,
        ...(companyId ? { companyId } : {}),
      },
    });
    if (!definition)
      throw new BadRequestException('Flow definition is unavailable');
    try {
      const item = await this.prisma.tenantFlowConfigVersion.create({
        data: {
          flowDefinitionId: definition.id,
          version: Number(input.version || 1),
          status: input.status || 'draft',
          steps: (input.steps || []) as Prisma.InputJsonValue,
          createdBy: actorId,
        },
      });
      return {
        id: item.id,
        flowDefinitionId: item.flowDefinitionId,
        version: item.version,
        status: item.status as FlowVersion['status'],
        steps: Array.isArray(item.steps)
          ? (item.steps as FlowVersion['steps'])
          : [],
        createdBy: item.createdBy ?? undefined,
        createdAt: iso(item.createdAt),
        updatedAt: iso(item.updatedAt),
      };
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new BadRequestException('Flow version already exists');
      throw error;
    }
  }

  async updateFlowVersion(
    id: string,
    input: FlowVersionUpdateInput,
    companyId?: string,
  ): Promise<FlowVersion | null> {
    validateFlowVersionUpdateInput(input);
    const current = await this.prisma.tenantFlowConfigVersion.findFirst({
      where: { id, ...(companyId ? { flowDefinition: { companyId } } : {}) },
    });
    if (!current) return null;
    if (current.status !== 'draft')
      throw new BadRequestException('Only draft flow versions can be edited');
    try {
      const changed = await this.prisma.tenantFlowConfigVersion.updateMany({
        where: {
          id,
          status: 'draft',
          ...(companyId ? { flowDefinition: { companyId } } : {}),
        },
        data: {
          version: input.version,
          status: input.status,
          steps: input.steps as Prisma.InputJsonValue | undefined,
        },
      });
      if (!changed.count) {
        const latest = await this.prisma.tenantFlowConfigVersion.findUnique({
          where: { id },
        });
        if (latest && latest.status !== 'draft')
          throw new BadRequestException(
            'Only draft flow versions can be edited',
          );
        return null;
      }
      return (
        (await this.getFlowVersions(companyId)).find(
          (item) => item.id === id,
        ) ?? null
      );
    } catch (error) {
      if (this.isUniqueViolation(error))
        throw new BadRequestException('Flow version already exists');
      throw error;
    }
  }

  async getTenantFlowPermissions(
    companyId: string,
  ): Promise<TenantFlowPermission[]> {
    const records = await this.prisma.tenantFlowConfigPermission.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((item) => ({
      id: item.id,
      companyId: item.companyId,
      flowDefinitionId: item.flowDefinitionId,
      isEnabled: item.isEnabled,
      defaultForIntent: item.defaultForIntent ?? undefined,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    }));
  }

  async upsertTenantFlowPermissions(
    entries: TenantFlowPermissionInput[],
    scopeCompanyId?: string,
  ): Promise<TenantFlowPermission[]> {
    entries = validateTenantFlowPermissionInputs(entries);
    const companyIds = entries.map(
      (entry) => scopeCompanyId || String(entry.companyId || ''),
    );
    const flowIds = entries.map((entry) =>
      String(entry.flowDefinitionId || ''),
    );
    const definitions = await this.prisma.tenantFlowConfigDefinition.findMany({
      where: { id: { in: flowIds }, companyId: { in: companyIds } },
      select: { id: true, companyId: true },
    });
    if (
      entries.some(
        (entry, index) =>
          !definitions.some(
            (flow) =>
              flow.id === flowIds[index] &&
              flow.companyId === companyIds[index],
          ),
      )
    )
      throw new BadRequestException(
        'Flow definition is unavailable for this company',
      );
    await this.prisma.$transaction(
      entries.map((entry, index) => {
        const company = companyIds[index];
        const flowDefinitionId = flowIds[index];
        return this.prisma.tenantFlowConfigPermission.upsert({
          where: {
            companyId_flowDefinitionId: {
              companyId: company,
              flowDefinitionId,
            },
          },
          create: {
            companyId: company,
            flowDefinitionId,
            isEnabled: Boolean(entry.isEnabled),
            defaultForIntent: entry.defaultForIntent,
          },
          update: {
            isEnabled: Boolean(entry.isEnabled),
            defaultForIntent: entry.defaultForIntent,
          },
        });
      }),
    );
    return scopeCompanyId
      ? this.getTenantFlowPermissions(scopeCompanyId)
      : (
          await Promise.all(
            [...new Set(companyIds)].map((id) =>
              this.getTenantFlowPermissions(id),
            ),
          )
        ).flat();
  }

  async getIntentFlowMappings(companyId: string): Promise<IntentFlowMapping[]> {
    const records = await this.prisma.tenantIntentFlowConfigMapping.findMany({
      where: { companyId },
    });
    return records.map((item) => ({
      id: item.id,
      companyId: item.companyId,
      intent: item.intent,
      allowedFlowDefinitionIds: item.allowedFlowDefinitionIds,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    }));
  }

  async upsertIntentFlowMapping(
    entry: IntentFlowMappingInput,
    scopeCompanyId?: string,
  ): Promise<IntentFlowMapping> {
    validateIntentFlowMappingInput(entry);
    const companyId = scopeCompanyId || String(entry.companyId || '');
    const intent = String(entry.intent || '').trim();
    const allowedFlowDefinitionIds = [
      ...new Set(entry.allowedFlowDefinitionIds || []),
    ];
    const count = await this.prisma.tenantFlowConfigDefinition.count({
      where: { id: { in: allowedFlowDefinitionIds }, companyId },
    });
    if (count !== new Set(allowedFlowDefinitionIds).size)
      throw new BadRequestException(
        'Intent mapping contains a flow outside this company',
      );
    const item = await this.prisma.tenantIntentFlowConfigMapping.upsert({
      where: { companyId_intent: { companyId, intent } },
      create: { companyId, intent, allowedFlowDefinitionIds },
      update: { allowedFlowDefinitionIds },
    });
    return {
      id: item.id,
      companyId: item.companyId,
      intent: item.intent,
      allowedFlowDefinitionIds: item.allowedFlowDefinitionIds,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    };
  }

  private async importLegacyStore(): Promise<void> {
    const file = path.join(
      process.env.KELEDON_DATA_DIR || '/app/data',
      'mvp-store.json',
    );
    if (!fs.existsSync(file)) return;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as LegacyStore;
    const companies = await this.prisma.company.findMany({
      select: { id: true },
    });
    const companyIds = new Set(companies.map(({ id }) => id));
    const definitions = (parsed.flowDefinitions || []).map((item) => ({
      id: item.id,
      companyId:
        item.companyId && companyIds.has(item.companyId)
          ? item.companyId
          : null,
      interfaceId: item.interfaceId ?? null,
      name: item.name,
      description: item.description ?? null,
      category: item.category || 'case',
      status: item.status || 'active',
      intentTags: item.intentTags || [],
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
    if (definitions.length)
      await this.prisma.tenantFlowConfigDefinition.createMany({
        data: definitions,
        skipDuplicates: true,
      });
    const importedDefinitionIds = definitions.map(({ id }) => id);
    const persistedDefinitions = importedDefinitionIds.length
      ? await this.prisma.tenantFlowConfigDefinition.findMany({
          where: { id: { in: importedDefinitionIds } },
          select: { id: true, companyId: true },
        })
      : [];
    const definitionIds = new Set(persistedDefinitions.map(({ id }) => id));
    const versions = (parsed.flowVersions || [])
      .filter((item) => definitionIds.has(item.flowDefinitionId))
      .map((item) => ({
        id: item.id,
        flowDefinitionId: item.flowDefinitionId,
        version: item.version,
        status: item.status || 'draft',
        steps: item.steps as Prisma.InputJsonValue,
        createdBy: item.createdBy || null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
    if (versions.length)
      await this.prisma.tenantFlowConfigVersion.createMany({
        data: versions,
        skipDuplicates: true,
      });
    const flowCompany = new Map(
      persistedDefinitions.map(({ id, companyId }) => [id, companyId]),
    );
    const permissions = (parsed.tenantFlowPermissions || [])
      .filter(
        (item) =>
          companyIds.has(item.companyId) &&
          flowCompany.get(item.flowDefinitionId) === item.companyId,
      )
      .map((item) => ({
        id: item.id,
        companyId: item.companyId,
        flowDefinitionId: item.flowDefinitionId,
        isEnabled: item.isEnabled,
        defaultForIntent: item.defaultForIntent ?? null,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
    if (permissions.length)
      await this.prisma.tenantFlowConfigPermission.createMany({
        data: permissions,
        skipDuplicates: true,
      });
    const mappings = (parsed.intentFlowMappings || [])
      .filter((item) => companyIds.has(item.companyId))
      .map((item) => ({
        id: item.id,
        companyId: item.companyId,
        intent: item.intent,
        allowedFlowDefinitionIds: (item.allowedFlowDefinitionIds || []).filter(
          (id) => flowCompany.get(id) === item.companyId,
        ),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
    if (mappings.length)
      await this.prisma.tenantIntentFlowConfigMapping.createMany({
        data: mappings,
        skipDuplicates: true,
      });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
