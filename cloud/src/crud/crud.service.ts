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

  async updateCompany(id: string, data: { name?: string; industry?: string; countries?: string[] }) {
    const { countries, ...companyData } = data;
    
    // Delete existing countries and create new ones if provided
    if (countries !== undefined) {
      await this.prisma.companyCountry.deleteMany({ where: { companyId: id } });
    }

    const result = await this.prisma.company.update({
      where: { id },
      data: {
        ...companyData,
        ...(countries !== undefined ? {
          countries: {
            create: countries.map(code => ({ countryCode: code }))
          }
        } : {})
      },
      include: { countries: true }
    });

    return result;
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
      select: {
        id: true,
        name: true,
        brandId: true,
        country: true,
        sttProvider: true,
        ttsProvider: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true, agents: true } },
        brand: {
          select: {
            id: true,
            name: true,
            color: true,
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return teams.map(t => ({
      ...t,
      company: t.brand?.company ? { id: t.brand.company.id, name: t.brand.company.name } : undefined
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
            company: { select: { id: true, name: true } }
          }
        }
      }
    });
    return {
      ...team,
      company: team.brand?.company ? { id: team.brand.company.id, name: team.brand.company.name } : undefined
    };
  }

  async updateTeam(id: string, data: { name?: string; country?: string }) {
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
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            color: true,
            company: { select: { id: true, name: true } }
          }
        }
      }
    });
    return {
      ...team,
      company: team.brand?.company ? { id: team.brand.company.id, name: team.brand.company.name } : undefined
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
            brand: { select: { id: true, name: true } }
          }
        }
      },
      where: companyId ? { companyId } : undefined,
      orderBy: { name: 'asc' }
    });

    return users.map(u => ({
      ...u,
      brandId: u.team?.brandId || undefined
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
        team: { select: { id: true, name: true, brandId: true } }
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
        team: { select: { id: true, name: true, brandId: true } }
      }
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // ========== AGENTS ==========

  async getAgents(companyId?: string) {
    return this.prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        callsHandled: true,
        fcrRate: true,
        avgHandleTime: true,
        autonomyLevel: true,
        policies: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            brandId: true,
            brand: { select: { id: true, name: true, companyId: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { name: 'asc' }
    });
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        callsHandled: true,
        fcrRate: true,
        avgHandleTime: true,
        autonomyLevel: true,
        policies: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            brandId: true,
            brand: { select: { id: true, name: true } }
          }
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        callsHandled: true,
        fcrRate: true,
        avgHandleTime: true,
        autonomyLevel: true,
        policies: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            brandId: true,
            brand: { select: { id: true, name: true } }
          }
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

  // ========== SEED FROM CRUD.JSON ==========

  async seedFromCrudJson(): Promise<{ companies: number; brands: number; teams: number; users: number }> {
    const fs = require('fs');
    const dataPath = '/app/data/crud.json';
    
    if (!fs.existsSync(dataPath)) {
      throw new Error('crud.json not found');
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    let companiesCreated = 0;
    let brandsCreated = 0;
    let teamsCreated = 0;
    let usersCreated = 0;

    // Seed Companies
    if (data.companies && Array.isArray(data.companies)) {
      for (const company of data.companies) {
        const existing = await this.prisma.company.findFirst({ where: { name: company.name } });
        if (!existing) {
          await this.prisma.company.create({
            data: {
              name: company.name,
              industry: company.industry || null,
            }
          });
          companiesCreated++;
        }
      }
    }

    // Seed Brands
    if (data.brands && Array.isArray(data.brands)) {
      for (const brand of data.brands) {
        const existing = await this.prisma.brand.findFirst({ where: { name: brand.name } });
        if (!existing) {
          const company = await this.prisma.company.findFirst({ where: { name: brand.company_name } });
          if (company) {
            await this.prisma.brand.create({
              data: {
                name: brand.name,
                companyId: company.id,
                color: brand.color || '#6366f1',
              }
            });
            brandsCreated++;
          }
        }
      }
    }

    // Seed Teams
    if (data.teams && Array.isArray(data.teams)) {
      for (const team of data.teams) {
        const existing = await this.prisma.team.findFirst({ where: { name: team.name } });
        if (!existing) {
          let brandId = null;
          if (team.brand_name) {
            const brand = await this.prisma.brand.findFirst({ where: { name: team.brand_name } });
            brandId = brand?.id || null;
          }
          await this.prisma.team.create({
            data: {
              name: team.name,
              brandId: brandId,
              country: team.country || null,
              sttProvider: team.stt_provider || 'vosk',
              ttsProvider: team.tts_provider || 'elevenlabs',
            }
          });
          teamsCreated++;
        }
      }
    }

    // Seed Users
    if (data.users && Array.isArray(data.users)) {
      for (const user of data.users) {
        const existing = await this.prisma.user.findFirst({ where: { email: user.email } });
        if (!existing) {
          let companyId = null;
          let teamId = null;

          if (user.company_name) {
            const company = await this.prisma.company.findFirst({ where: { name: user.company_name } });
            companyId = company?.id || null;
          }
          if (user.team_name) {
            const team = await this.prisma.team.findFirst({ where: { name: user.team_name } });
            teamId = team?.id || null;
          }

          await this.prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email.split('@')[0],
              role: user.role || 'user',
              companyId: companyId,
              teamId: teamId,
            }
          });
          usersCreated++;
        }
      }
    }

    return {
      companies: companiesCreated,
      brands: brandsCreated,
      teams: teamsCreated,
      users: usersCreated
    };
  }
}
