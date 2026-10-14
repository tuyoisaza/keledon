import { BadRequestException, Injectable } from '@nestjs/common';
import { getCrudHealthReport } from './crud-health';
import { PrismaService } from '../prisma/prisma.service';
import { CrudKeledonService } from './crud-keledon.service';
import { CrudAuditService } from './crud-audit.service';
import { CrudVendorService } from './crud-vendor.service';
import { CrudCompanyService } from './crud-company.service';
import { CrudSessionDataService } from './crud-session-data.service';

@Injectable()
export class CrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keledonService: CrudKeledonService,
    private readonly auditService: CrudAuditService,
    private readonly vendorService: CrudVendorService,
    private readonly companyService: CrudCompanyService,
    private readonly sessionDataService: CrudSessionDataService,
  ) {}

  // ========== HEALTH ==========

  getHealth() {
    return getCrudHealthReport();
  }

  // ========== COMPANIES ==========

  async getCompanies() {
    return this.companyService.getCompanies();
  }

  async getCompany(id: string) {
    return this.companyService.getCompany(id);
  }

  async createCompany(data: {
    name: string;
    industry?: string;
    countries?: string[];
  }) {
    return this.companyService.createCompany(data);
  }

  async updateCompany(
    id: string,
    data: { name?: string; industry?: string; countries?: string[] },
  ) {
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

  async getBrand(id: string) {
    return this.companyService.getBrand(id);
  }
  async getUser(id: string) {
    return this.companyService.getUser(id);
  }
  async getVendor(id: string) {
    return this.vendorService.getVendor(id);
  }

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

  async getTeam(id: string) {
    return this.companyService.getTeam(id);
  }

  async createTeam(data: { name: string; brandId: string; country?: string }) {
    return this.companyService.createTeam(data);
  }

  async updateTeam(
    id: string,
    data: { name?: string; country?: string; escalationTriggers?: string[] },
  ) {
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
  }) {
    return this.companyService.createUser(data);
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
    return this.companyService.updateUser(id, data);
  }

  async deleteUser(id: string) {
    return this.companyService.deleteUser(id);
  }

  // ========== KELEDONS ==========
  // Delegated to CrudKeledonService (crud-keledon.service.ts)

  async getKeledons(companyId?: string, userId?: string) {
    return this.keledonService.getKeledons(companyId, userId);
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
    const rows = await this.prisma.managedInterface.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(({ credentials, ...record }) => ({
      ...record,
      hasCredentials: !!credentials,
    }));
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
    const { credentials, ...record } =
      await this.prisma.managedInterface.create({ data });
    return { ...record, hasCredentials: !!credentials };
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
    const { credentials, ...record } =
      await this.prisma.managedInterface.update({ where: { id }, data });
    return { ...record, hasCredentials: !!credentials };
  }

  async deleteManagedInterface(id: string) {
    return this.prisma.managedInterface.delete({ where: { id } });
  }

  async getTeamInterfaces(teamId: string) {
    const teamInterfaces = await this.prisma.teamInterface.findMany({
      where: { teamId },
      include: { managedInterface: true },
    });
    return teamInterfaces.map(
      ({ managedInterface: { credentials, ...record } }) => ({
        ...record,
        hasCredentials: !!credentials,
      }),
    );
  }

  async setTeamInterfaces(teamId: string, interfaceIds: string[]) {
    if (
      !Array.isArray(interfaceIds) ||
      interfaceIds.some(
        (interfaceId) =>
          typeof interfaceId !== 'string' || interfaceId.trim().length === 0,
      )
    ) {
      throw new BadRequestException('interfaceIds must be an array of IDs');
    }
    const uniqueIds = [...new Set(interfaceIds)];
    if (uniqueIds.length !== interfaceIds.length) {
      throw new BadRequestException('interfaceIds must not contain duplicates');
    }
    const existing = await this.prisma.managedInterface.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (existing.length !== uniqueIds.length) {
      throw new BadRequestException('One or more interfaces do not exist');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.teamInterface.deleteMany({ where: { teamId } });
      if (uniqueIds.length === 0) return { count: 0 };
      return tx.teamInterface.createMany({
        data: uniqueIds.map((interfaceId) => ({ teamId, interfaceId })),
      });
    });
  }

  // ========== WORKFLOWS ==========

  async getWorkflows() {
    return this.prisma.workflow.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getWorkflow(id: string) {
    return this.prisma.workflow.findUnique({ where: { id } });
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
      interfaceId?: string | null;
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
      select: {
        id: true,
        name: true,
        providerId: true,
        language: true,
        isEnabled: true,
        isDefault: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTenantVoiceProfile(id: string, companyId?: string) {
    return this.prisma.tenantVoiceProfile.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
      select: {
        id: true,
        name: true,
        providerId: true,
        language: true,
        isEnabled: true,
        isDefault: true,
      },
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
      select: {
        id: true,
        name: true,
        providerId: true,
        language: true,
        isEnabled: true,
        isDefault: true,
      },
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
      select: {
        id: true,
        name: true,
        providerId: true,
        language: true,
        isEnabled: true,
        isDefault: true,
      },
    });
  }

  async deleteTenantVoiceProfile(id: string) {
    return this.prisma.tenantVoiceProfile.delete({ where: { id } });
  }

  // ========== SESSIONS AND KNOWLEDGE ==========

  async getSessions(companyId?: string, limit = 100) {
    return this.sessionDataService.getSessions(companyId, limit);
  }

  async getSession(id: string) {
    return this.sessionDataService.getSession(id);
  }

  async createSession(data: {
    userId?: string;
    teamId?: string;
    status?: string;
    metadata?: string;
  }) {
    return this.sessionDataService.createSession(data);
  }

  async updateSession(
    id: string,
    data: { status?: string; metadata?: string },
  ) {
    return this.sessionDataService.updateSession(id, data);
  }

  async deleteOrphanedSessions(): Promise<{ deleted: number }> {
    return this.sessionDataService.deleteOrphanedSessions();
  }

  async getOrphanedSessionCount(): Promise<number> {
    return this.sessionDataService.getOrphanedSessionCount();
  }

  async getKnowledgeBases(companyId: string) {
    return this.sessionDataService.getKnowledgeBases(companyId);
  }

  async createKnowledgeBase(data: {
    companyId: string;
    name: string;
    description?: string;
  }) {
    return this.sessionDataService.createKnowledgeBase(data);
  }

  async deleteKnowledgeBase(id: string) {
    return this.sessionDataService.deleteKnowledgeBase(id);
  }

  async getKnowledgeDocuments(knowledgeBaseId: string) {
    return this.sessionDataService.getKnowledgeDocuments(knowledgeBaseId);
  }

  async createKnowledgeDocument(data: {
    knowledgeBaseId: string;
    title: string;
    content: string;
    metadata?: string;
  }) {
    return this.sessionDataService.createKnowledgeDocument(data);
  }

  async deleteKnowledgeDocument(id: string) {
    return this.sessionDataService.deleteKnowledgeDocument(id);
  }

  // ========== ========== AUDIT LOGS ========== ==========  ========== ==========
  // Delegated to CrudAuditService (crud-audit.service.ts)

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
    allowedOrigins?: string[];
    config?: Record<string, unknown>;
  }) {
    return this.vendorService.createVendor(data);
  }

  async updateVendor(
    id: string,
    data: {
      name?: string;
      type?: string;
      baseUrl?: string;
      isActive?: boolean;
      username?: string;
      password?: string;
      apiKey?: string;
      allowedOrigins?: string[];
      config?: Record<string, unknown>;
    },
  ) {
    return this.vendorService.updateVendor(id, data);
  }

  async deleteVendor(id: string) {
    return this.vendorService.deleteVendor(id);
  }
}
