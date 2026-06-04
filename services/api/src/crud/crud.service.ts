import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrudKeledonService } from './crud-keledon.service';
import { generatePairingCodeString } from './crud-keledon.service';
import { CrudAuditService } from './crud-audit.service';
import { CrudSeedService } from './crud-seed.service';
import { CrudVendorService } from './crud-vendor.service';

const errorBuffer: string[] = [];
const MAX_ERRORS = 50;

function captureError(msg: string) {
  const entry = `${new Date().toISOString()} | ${msg}`;
  errorBuffer.push(entry);
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.shift();
  }
}

const originalConsoleError = console.error;
console.error = (...args: any[]): void => {
  const msg = args
    .map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  captureError(msg);
  originalConsoleError.apply(console, args);
};

@Injectable()
export class CrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keledonService: CrudKeledonService,
    private readonly auditService: CrudAuditService,
    private readonly seedService: CrudSeedService,
    private readonly vendorService: CrudVendorService,
  ) {}

  // ========== HEALTH ==========

  async getHealth() {
    const memUsage = process.memoryUsage();
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      errors: errorBuffer.slice(-50),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
      },
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CLOUD_URL: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
        KELEDON_LAUNCH_SECRET: process.env.KELEDON_LAUNCH_SECRET
          ? 'set'
          : 'not set',
      },
      versions: {
        cloud: process.env.npm_package_version || '0.0.92',
      },
    };
  }

  // ========== COMPANIES ==========

  async getCompanies() {
    return this.prisma.company.findMany({
      include: {
        countries: true,
        _count: { select: { brands: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        countries: true,
        brands: true,
        users: true,
      },
    });
  }

  async createCompany(data: {
    name: string;
    industry?: string;
    countries?: string[];
  }) {
    const { countries, ...companyData } = data;
    return this.prisma.company.create({
      data: {
        ...companyData,
        countries: countries
          ? {
              create: countries.map((code) => ({ countryCode: code })),
            }
          : undefined,
      },
      include: { countries: true },
    });
  }

  async updateCompany(
    id: string,
    data: { name?: string; industry?: string; countries?: string[] },
  ) {
    const { countries, ...companyData } = data;

    // Delete existing countries and create new ones if provided
    if (countries !== undefined) {
      await this.prisma.companyCountry.deleteMany({ where: { companyId: id } });
    }

    const result = await this.prisma.company.update({
      where: { id },
      data: {
        ...companyData,
        ...(countries !== undefined
          ? {
              countries: {
                create: countries.map((code) => ({ countryCode: code })),
              },
            }
          : {}),
      },
      include: { countries: true },
    });

    return result;
  }

  async deleteCompany(id: string) {
    return this.prisma.company.delete({ where: { id } });
  }

  async addCompanyCountry(companyId: string, countryCode: string) {
    return this.prisma.companyCountry.create({
      data: { companyId, countryCode },
    });
  }

  async removeCompanyCountry(companyId: string, countryCode: string) {
    return this.prisma.companyCountry.deleteMany({
      where: { companyId, countryCode },
    });
  }

  // ========== BRANDS ==========

  async getBrands(companyId?: string) {
    return this.prisma.brand.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { teams: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(data: { name: string; companyId: string; color?: string }) {
    return this.prisma.brand.create({
      data,
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async updateBrand(id: string, data: { name?: string; color?: string }) {
    return this.prisma.brand.update({
      where: { id },
      data,
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async deleteBrand(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }

  // ========== TEAMS ==========

  async getTeams(companyId?: string) {
    const teams = await this.prisma.team.findMany({
      include: {
        users: { select: { id: true } },
        keledons: { select: { id: true } },
        brand: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      brandId: t.brandId,
      country: t.country,
      sttProvider: t.sttProvider,
      ttsProvider: t.ttsProvider,
      escalationTriggers: t.escalationTriggers,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      _count: { users: t.users.length, keledons: t.keledons.length },
      company: t.brand?.company
        ? { id: t.brand.company.id, name: t.brand.company.name }
        : undefined,
    }));
  }

  async createTeam(data: { name: string; brandId: string; country?: string }) {
    const team = await this.prisma.team.create({
      data,
      select: {
        id: true,
        name: true,
        brandId: true,
        country: true,
        sttProvider: true,
        ttsProvider: true,
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            color: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
    return {
      ...team,
      company: team.brand?.company
        ? { id: team.brand.company.id, name: team.brand.company.name }
        : undefined,
    };
  }

  async updateTeam(
    id: string,
    data: { name?: string; country?: string; escalationTriggers?: string[] },
  ) {
    const team = await this.prisma.team.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        brandId: true,
        country: true,
        sttProvider: true,
        ttsProvider: true,
        escalationTriggers: true,
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            color: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
    return {
      ...team,
      company: team.brand?.company
        ? { id: team.brand.company.id, name: team.brand.company.name }
        : undefined,
    };
  }

  async deleteTeam(id: string) {
    return this.prisma.team.delete({ where: { id } });
  }

  // ========== USERS ==========

  async getUsers(companyId?: string) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        teamId: true,
        isOnline: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, name: true } },
        team: {
          select: {
            id: true,
            name: true,
            brandId: true,
            brand: { select: { id: true, name: true } },
          },
        },
      },
      where: companyId ? { companyId } : undefined,
      orderBy: { name: 'asc' },
    });

    return users.map((u) => ({
      ...u,
      brandId: u.team?.brandId || undefined,
    }));
  }

  async createUser(data: {
    email: string;
    name?: string;
    companyId?: string;
    teamId?: string;
    role?: string;
    passwordHash?: string;
  }) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        teamId: true,
        isOnline: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, brandId: true } },
      },
    });
  }

  async updateUser(
    id: string,
    data: {
      email?: string;
      name?: string;
      companyId?: string;
      teamId?: string;
      role?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        teamId: true,
        isOnline: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, brandId: true } },
      },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // ========== KELEDONS ==========
  // Delegated to CrudKeledonService (crud-keledon.service.ts)

  async getKeledons(companyId?: string) {
    return this.keledonService.getKeledons(companyId);
  }

  async createKeledon(data: any) {
    return this.keledonService.createKeledon(data);
  }

  async updateKeledon(id: string, data: any) {
    return this.keledonService.updateKeledon(id, data);
  }

  async deleteKeledon(id: string) {
    return this.keledonService.deleteKeledon(id);
  }

  async getKeledonPairingCode(keledonId: string) {
    return this.keledonService.getKeledonPairingCode(keledonId);
  }

  async regenerateKeledonPairingCode(keledonId: string) {
    return this.keledonService.regenerateKeledonPairingCode(keledonId);
  }

  async generateKeledonLaunchLink(keledonId: string, userId: string) {
    return this.keledonService.generateKeledonLaunchLink(keledonId, userId);
  }

  async getLaunchContext(keledonId: string) {
    return this.keledonService.getLaunchContext(keledonId);
  }

  // ========== MANAGED INTERFACES ==========

  async getManagedInterfaces() {
    return this.prisma.managedInterface.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createManagedInterface(data: {
    name: string;
    baseUrl: string;
    category?: string;
    providerKey?: string;
    capabilities?: string;
    icon?: string;
    status?: string;
    credentials?: string;
  }) {
    return this.prisma.managedInterface.create({ data });
  }

  async updateManagedInterface(
    id: string,
    data: {
      name?: string;
      baseUrl?: string;
      category?: string;
      status?: string;
      credentials?: string;
    },
  ) {
    return this.prisma.managedInterface.update({ where: { id }, data });
  }

  async deleteManagedInterface(id: string) {
    return this.prisma.managedInterface.delete({ where: { id } });
  }

  async getTeamInterfaces(teamId: string) {
    const teamInterfaces = await this.prisma.teamInterface.findMany({
      where: { teamId },
      include: { managedInterface: true },
    });
    return teamInterfaces.map((ti) => ti.managedInterface);
  }

  async setTeamInterfaces(teamId: string, interfaceIds: string[]) {
    await this.prisma.teamInterface.deleteMany({ where: { teamId } });
    return this.prisma.teamInterface.createMany({
      data: interfaceIds.map((interfaceId) => ({ teamId, interfaceId })),
    });
  }

  // ========== WORKFLOWS ==========

  async getWorkflows() {
    return this.prisma.workflow.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createWorkflow(data: {
    name: string;
    interfaceId?: string;
    description?: string;
    trigger: string;
    steps: string;
    variables: string;
    isEnabled?: boolean;
  }) {
    return this.prisma.workflow.create({ data });
  }

  async updateWorkflow(
    id: string,
    data: {
      name?: string;
      description?: string;
      trigger?: string;
      steps?: string;
      variables?: string;
      isEnabled?: boolean;
    },
  ) {
    return this.prisma.workflow.update({ where: { id }, data });
  }

  async deleteWorkflow(id: string) {
    return this.prisma.workflow.delete({ where: { id } });
  }

  // ========== PROVIDER CATALOG ==========

  async getProviderCatalog() {
    return this.prisma.providerCatalog.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async upsertProviderCatalog(
    entries: Array<{
      id: string;
      type: string;
      name: string;
      description?: string;
      status?: string;
      isEnabled?: boolean;
      metadata?: string;
    }>,
  ) {
    return this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.providerCatalog.upsert({
          where: { id: entry.id },
          update: entry,
          create: entry,
        }),
      ),
    );
  }

  // ========== TENANT PROVIDER CONFIG ==========

  async getTenantProviderConfig(companyId: string) {
    return this.prisma.tenantProviderConfig.findMany({
      where: { companyId },
      include: { providerCatalog: true },
    });
  }

  async upsertTenantProviderConfig(
    entries: Array<{
      companyId: string;
      providerId: string;
      providerType: string;
      isEnabled?: boolean;
      isDefault?: boolean;
      limits?: string;
    }>,
  ) {
    return this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.tenantProviderConfig.upsert({
          where: {
            companyId_providerId: {
              companyId: entry.companyId,
              providerId: entry.providerId,
            },
          },
          update: entry,
          create: entry,
        }),
      ),
    );
  }

  // ========== TENANT VOICE PROFILES ==========

  async getTenantVoiceProfiles(companyId: string) {
    return this.prisma.tenantVoiceProfile.findMany({
      where: { companyId },
      include: { providerCatalog: true },
      orderBy: { name: 'asc' },
    });
  }

  async createTenantVoiceProfile(data: {
    companyId: string;
    providerId: string;
    name: string;
    language?: string;
    isEnabled?: boolean;
    isDefault?: boolean;
    config?: string;
  }) {
    return this.prisma.tenantVoiceProfile.create({
      data,
      include: { providerCatalog: true },
    });
  }

  async updateTenantVoiceProfile(
    id: string,
    data: {
      name?: string;
      providerId?: string;
      language?: string;
      isEnabled?: boolean;
      isDefault?: boolean;
      config?: string;
    },
  ) {
    return this.prisma.tenantVoiceProfile.update({
      where: { id },
      data,
      include: { providerCatalog: true },
    });
  }

  async deleteTenantVoiceProfile(id: string) {
    return this.prisma.tenantVoiceProfile.delete({ where: { id } });
  }

  // ========== SESSIONS ==========

  async getSessions(companyId?: string, limit = 100) {
    const teams = companyId
      ? await this.prisma.team.findMany({
          where: { brand: { companyId } },
          select: { id: true },
        })
      : null;

    return this.prisma.session.findMany({
      where: companyId
        ? { teamId: { in: teams?.map((t) => t.id) } }
        : undefined,
      include: {
        user: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getSession(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createSession(data: {
    userId?: string;
    teamId?: string;
    status?: string;
    metadata?: string;
  }) {
    return this.prisma.session.create({ data });
  }

  async updateSession(
    id: string,
    data: { status?: string; metadata?: string },
  ) {
    return this.prisma.session.update({ where: { id }, data });
  }

  async deleteOrphanedSessions(): Promise<{ deleted: number }> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [{ userId: null }, { teamId: null }],
      },
    });
    return { deleted: result.count };
  }

  async getOrphanedSessionCount(): Promise<number> {
    const count = await this.prisma.session.count({
      where: {
        OR: [{ userId: null }, { teamId: null }],
      },
    });
    return count;
  }

  // ========== KNOWLEDGE ==========

  async getKnowledgeBases(companyId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { companyId },
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createKnowledgeBase(data: {
    companyId: string;
    name: string;
    description?: string;
  }) {
    return this.prisma.knowledgeBase.create({ data });
  }

  async deleteKnowledgeBase(id: string) {
    return this.prisma.knowledgeBase.delete({ where: { id } });
  }

  async getKnowledgeDocuments(knowledgeBaseId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createKnowledgeDocument(data: {
    knowledgeBaseId: string;
    title: string;
    content: string;
    metadata?: string;
  }) {
    return this.prisma.knowledgeDocument.create({ data });
  }

  async deleteKnowledgeDocument(id: string) {
    return this.prisma.knowledgeDocument.delete({ where: { id } });
  }

  // ========== ========== AUDIT LOGS ========== ==========
  // Delegated to CrudAuditService (crud-audit.service.ts)

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.auditService.createAuditLog(data);
  }

  async getAuditLogs(params?: {
    companyId?: string;
    limit?: number;
    offset?: number;
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.auditService.getAuditLogs(params);
  }

  // ========== ========== SEED FROM CRUD.JSON ========== ==========
  // Delegated to CrudSeedService (crud-seed.service.ts)

  async seedFromCrudJson(): Promise<{
    companies: number;
    brands: number;
    teams: number;
    users: number;
  }> {
    return this.seedService.seedFromCrudJson();
  }

  // ========== ========== VENDORS ========== ==========
  // Delegated to CrudVendorService (crud-vendor.service.ts)

  async getVendors(teamId: string) {
    return this.vendorService.getVendors(teamId);
  }

  async createVendor(data: {
    name: string;
    teamId: string;
    type: string;
    baseUrl?: string;
    isActive?: boolean;
    username?: string;
    password?: string;
    apiKey?: string;
    config?: Record<string, unknown>;
  }) {
    return this.vendorService.createVendor(data);
  }

  async updateVendor(id: string, data: {
    name?: string;
    type?: string;
    baseUrl?: string;
    isActive?: boolean;
    username?: string;
    password?: string;
    apiKey?: string;
    config?: Record<string, unknown>;
  }) {
    return this.vendorService.updateVendor(id, data);
  }

  async deleteVendor(id: string) {
    return this.vendorService.deleteVendor(id);
  }
}