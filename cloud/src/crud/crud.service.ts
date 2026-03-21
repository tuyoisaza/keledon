import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== COMPANIES ==========

  async getCompanies() {
    return this.prisma.company.findMany({
      include: {
        countries: true,
        _count: { select: { brands: true, users: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        countries: true,
        brands: true,
        users: true
      }
    });
  }

  async createCompany(data: { name: string; industry?: string; countries?: string[] }) {
    const { countries, ...companyData } = data;
    return this.prisma.company.create({
      data: {
        ...companyData,
        countries: countries ? {
          create: countries.map(code => ({ countryCode: code }))
        } : undefined
      },
      include: { countries: true }
    });
  }

  async updateCompany(id: string, data: { name?: string; industry?: string }) {
    return this.prisma.company.update({
      where: { id },
      data,
      include: { countries: true }
    });
  }

  async deleteCompany(id: string) {
    return this.prisma.company.delete({ where: { id } });
  }

  async addCompanyCountry(companyId: string, countryCode: string) {
    return this.prisma.companyCountry.create({
      data: { companyId, countryCode }
    });
  }

  async removeCompanyCountry(companyId: string, countryCode: string) {
    return this.prisma.companyCountry.deleteMany({
      where: { companyId, countryCode }
    });
  }

  // ========== BRANDS ==========

  async getBrands(companyId?: string) {
    return this.prisma.brand.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { teams: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  async createBrand(data: { name: string; companyId: string; color?: string }) {
    return this.prisma.brand.create({
      data,
      include: { company: { select: { id: true, name: true } } }
    });
  }

  async updateBrand(id: string, data: { name?: string; color?: string }) {
    return this.prisma.brand.update({
      where: { id },
      data,
      include: { company: { select: { id: true, name: true } } }
    });
  }

  async deleteBrand(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }

  // ========== TEAMS ==========

  async getTeams(companyId?: string) {
    const teams = await this.prisma.team.findMany({
      include: {
        brand: {
          include: { company: { select: { id: true, name: true } } }
        },
        _count: { select: { users: true, agents: true } }
      },
      orderBy: { name: 'asc' }
    });

    if (companyId) {
      return teams.filter(t => t.brand?.company?.id === companyId);
    }
    return teams;
  }

  async createTeam(data: { name: string; brandId: string; country?: string }) {
    return this.prisma.team.create({
      data,
      include: {
        brand: {
          include: { company: { select: { id: true, name: true } } }
        }
      }
    });
  }

  async updateTeam(id: string, data: { name?: string; country?: string }) {
    return this.prisma.team.update({
      where: { id },
      data,
      include: {
        brand: {
          include: { company: { select: { id: true, name: true } } }
        }
      }
    });
  }

  async deleteTeam(id: string) {
    return this.prisma.team.delete({ where: { id } });
  }

  // ========== USERS ==========

  async getUsers(companyId?: string) {
    const users = await this.prisma.user.findMany({
      include: {
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    if (companyId) {
      return users.filter(u => u.companyId === companyId);
    }
    return users;
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
      include: {
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      }
    });
  }

  async updateUser(id: string, data: { 
    email?: string; 
    name?: string; 
    companyId?: string; 
    teamId?: string;
    role?: string;
  }) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      }
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // ========== AGENTS ==========

  async getAgents(companyId?: string) {
    const agents = await this.prisma.agent.findMany({
      include: {
        team: {
          include: { 
            brand: { select: { id: true, name: true, companyId: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { name: 'asc' }
    });

    if (companyId) {
      return agents.filter(a => a.team?.brand?.companyId === companyId);
    }
    return agents;
  }

  async createAgent(data: { 
    name: string; 
    teamId: string; 
    userId?: string;
    email?: string;
    role?: string;
    autonomyLevel?: number;
  }) {
    return this.prisma.agent.create({
      data,
      include: {
        team: {
          include: { brand: { select: { id: true, name: true } } }
        },
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async updateAgent(id: string, data: { 
    name?: string; 
    teamId?: string; 
    userId?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    callsHandled?: number;
    fcrRate?: number;
    avgHandleTime?: number;
    autonomyLevel?: number;
    policies?: string;
  }) {
    return this.prisma.agent.update({
      where: { id },
      data,
      include: {
        team: {
          include: { brand: { select: { id: true, name: true } } }
        },
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async deleteAgent(id: string) {
    return this.prisma.agent.delete({ where: { id } });
  }

  // ========== MANAGED INTERFACES ==========

  async getManagedInterfaces() {
    return this.prisma.managedInterface.findMany({
      orderBy: { name: 'asc' }
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

  async updateManagedInterface(id: string, data: {
    name?: string;
    baseUrl?: string;
    category?: string;
    status?: string;
    credentials?: string;
  }) {
    return this.prisma.managedInterface.update({ where: { id }, data });
  }

  async deleteManagedInterface(id: string) {
    return this.prisma.managedInterface.delete({ where: { id } });
  }

  async getTeamInterfaces(teamId: string) {
    const teamInterfaces = await this.prisma.teamInterface.findMany({
      where: { teamId },
      include: { managedInterface: true }
    });
    return teamInterfaces.map(ti => ti.managedInterface);
  }

  async setTeamInterfaces(teamId: string, interfaceIds: string[]) {
    await this.prisma.teamInterface.deleteMany({ where: { teamId } });
    return this.prisma.teamInterface.createMany({
      data: interfaceIds.map(interfaceId => ({ teamId, interfaceId }))
    });
  }

  // ========== WORKFLOWS ==========

  async getWorkflows() {
    return this.prisma.workflow.findMany({
      orderBy: { name: 'asc' }
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

  async updateWorkflow(id: string, data: {
    name?: string;
    description?: string;
    trigger?: string;
    steps?: string;
    variables?: string;
    isEnabled?: boolean;
  }) {
    return this.prisma.workflow.update({ where: { id }, data });
  }

  async deleteWorkflow(id: string) {
    return this.prisma.workflow.delete({ where: { id } });
  }

  // ========== PROVIDER CATALOG ==========

  async getProviderCatalog() {
    return this.prisma.providerCatalog.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });
  }

  async upsertProviderCatalog(entries: Array<{
    id: string;
    type: string;
    name: string;
    description?: string;
    status?: string;
    isEnabled?: boolean;
    metadata?: string;
  }>) {
    return this.prisma.$transaction(
      entries.map(entry =>
        this.prisma.providerCatalog.upsert({
          where: { id: entry.id },
          update: entry,
          create: entry
        })
      )
    );
  }

  // ========== TENANT PROVIDER CONFIG ==========

  async getTenantProviderConfig(companyId: string) {
    return this.prisma.tenantProviderConfig.findMany({
      where: { companyId },
      include: { providerCatalog: true }
    });
  }

  async upsertTenantProviderConfig(entries: Array<{
    companyId: string;
    providerId: string;
    providerType: string;
    isEnabled?: boolean;
    isDefault?: boolean;
    limits?: string;
  }>) {
    return this.prisma.$transaction(
      entries.map(entry =>
        this.prisma.tenantProviderConfig.upsert({
          where: { companyId_providerId: { companyId: entry.companyId, providerId: entry.providerId } },
          update: entry,
          create: entry
        })
      )
    );
  }

  // ========== TENANT VOICE PROFILES ==========

  async getTenantVoiceProfiles(companyId: string) {
    return this.prisma.tenantVoiceProfile.findMany({
      where: { companyId },
      include: { providerCatalog: true },
      orderBy: { name: 'asc' }
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
      include: { providerCatalog: true }
    });
  }

  async updateTenantVoiceProfile(id: string, data: {
    name?: string;
    providerId?: string;
    language?: string;
    isEnabled?: boolean;
    isDefault?: boolean;
    config?: string;
  }) {
    return this.prisma.tenantVoiceProfile.update({
      where: { id },
      data,
      include: { providerCatalog: true }
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
          select: { id: true }
        })
      : null;
    
    return this.prisma.session.findMany({
      where: companyId ? { teamId: { in: teams?.map(t => t.id) } } : undefined,
      include: {
        user: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async getSession(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: 'asc' } }
      }
    });
  }

  async createSession(data: { userId?: string; teamId?: string; status?: string; metadata?: string }) {
    return this.prisma.session.create({ data });
  }

  async updateSession(id: string, data: { status?: string; metadata?: string }) {
    return this.prisma.session.update({ where: { id }, data });
  }

  // ========== KNOWLEDGE ==========

  async getKnowledgeBases(companyId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { companyId },
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' }
    });
  }

  async createKnowledgeBase(data: { companyId: string; name: string; description?: string }) {
    return this.prisma.knowledgeBase.create({ data });
  }

  async deleteKnowledgeBase(id: string) {
    return this.prisma.knowledgeBase.delete({ where: { id } });
  }

  async getKnowledgeDocuments(knowledgeBaseId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId },
      orderBy: { createdAt: 'desc' }
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

  // ========== AUDIT LOGS ==========

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async getAuditLogs(companyId?: string, limit = 100) {
    const userIds = companyId
      ? (await this.prisma.user.findMany({
          where: { companyId },
          select: { id: true }
        })).map(u => u.id)
      : null;

    return this.prisma.auditLog.findMany({
      where: userIds ? { userId: { in: userIds } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
