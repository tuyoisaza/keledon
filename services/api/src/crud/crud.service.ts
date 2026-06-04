import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrudKeledonService } from './crud-keledon.service';
import { generatePairingCodeString } from './crud-keledon.service';
import { CrudAuditService } from './crud-audit.service';
import { CrudSeedService } from './crud-seed.service';
import { CrudVendorService } from './crud-vendor.service';
import { CrudCompanyService } from './crud-company.service';

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
    private readonly companyService: CrudCompanyService,
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
    return this.companyService.getCompanies();
  }

  async getCompany(id: string) {
    return this.companyService.getCompany(id);
  }

  async createCompany(data: { name: string; industry?: string; countries?: string[] }) {
    return this.companyService.createCompany(data);
  }

  async updateCompany(id: string, data: { name?: string; industry?: string; countries?: string[] }) {
    return this.companyService.updateCompany(id, data);
  }

  async deleteCompany(id: string) {
    return this.companyService.deleteCompany(id);
  }

  async addCompanyCountry(companyId: string, countryCode: string) {
    return this.companyService.addCompanyCountry(companyId, countryCode);
  }

  async removeCompanyCountry(companyId: string, countryCode: string) {
    return this.companyService.removeCompanyCountry(companyId, countryCode);
  }

  // ========== BRANDS ==========

  async getBrands(companyId?: string) {
    return this.companyService.getBrands(companyId);
  }

  async createBrand(data: { name: string; companyId: string; color?: string }) {
    return this.companyService.createBrand(data);
  }

  async updateBrand(id: string, data: { name?: string; color?: string }) {
    return this.companyService.updateBrand(id, data);
  }

  async deleteBrand(id: string) {
    return this.companyService.deleteBrand(id);
  }

  // ========== TEAMS ==========

  async getTeams(companyId?: string) {
    return this.companyService.getTeams(companyId);
  }

  async createTeam(data: { name: string; brandId: string; country?: string }) {
    return this.companyService.createTeam(data);
  }

  async updateTeam(id: string, data: { name?: string; country?: string; escalationTriggers?: string[] }) {
    return this.companyService.updateTeam(id, data);
  }

  async deleteTeam(id: string) {
    return this.companyService.deleteTeam(id);
  }

  // ========== USERS ==========

  async getUsers(companyId?: string) {
    return this.companyService.getUsers(companyId);
  }

  async createUser(data: {
    email: string;
    name?: string;
    companyId?: string;
    teamId?: string;
    role?: string;
    passwordHash?: string;
  }) {
    return this.companyService.createUser(data);
  }

  async updateUser(id: string, data: {
    email?: string;
    name?: string;
    companyId?: string;
    teamId?: string;
    role?: string;
  }) {
    return this.companyService.updateUser(id, data);
  }

  async deleteUser(id: string) {
    return this.companyService.deleteUser(id);
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