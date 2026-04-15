import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
console.error = (...args: any[]) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  captureError(msg);
  originalConsoleError.apply(console, args);
};

@Injectable()
export class CrudService {
  constructor(private readonly prisma: PrismaService) {}

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
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CLOUD_URL: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
        KELEDON_LAUNCH_SECRET: process.env.KELEDON_LAUNCH_SECRET ? 'set' : 'not set'
      },
      versions: {
        cloud: process.env.npm_package_version || '0.0.89'
      }
    };
  }

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
      include: {
        users: { select: { id: true } },
        keledons: { select: { id: true } },
        brand: {
          include: {
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return teams.map(t => ({
      id: t.id,
      name: t.name,
      brandId: t.brandId,
      country: t.country,
      sttProvider: t.sttProvider,
      ttsProvider: t.ttsProvider,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      _count: { users: t.users.length, keledons: t.keledons.length },
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

  // ========== KELEDONS ==========

  async getKeledons(companyId?: string) {
    return this.prisma.keledon.findMany({
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
        uiInterfaces: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        brandId: true,
        countryCode: true,
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            country: true,
            brandId: true,
            brand: { select: { id: true, name: true, companyId: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  async createKeledon(data: { 
    name: string; 
    teamId: string; 
    brandId?: string;
    countryCode?: string;
    userId?: string;
    email?: string;
    role?: string;
    autonomyLevel?: number;
    uiInterfaces?: string[];
  }) {
    // Create Keledon first
    const keledon = await this.prisma.keledon.create({
      data: {
        ...data,
        uiInterfaces: data.uiInterfaces ? JSON.stringify(data.uiInterfaces) : undefined,
      },
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
        uiInterfaces: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        brandId: true,
        countryCode: true,
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            country: true,
            brandId: true,
            brand: { select: { id: true, name: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // Auto-create device with pairing code for this Keledon
    const code = this.generatePairingCodeString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const device = await this.prisma.device.create({
      data: {
        keledonId: keledon.id,
        name: `Keledon: ${keledon.name}`,
        machineId: `keledon-${keledon.id}`,
        platform: 'keledon',
        status: 'pending',
        pairingCode: code,
        pairingCodeExpiresAt: expiresAt
      }
    });

    // Return keledon with pairing code info
    return {
      ...keledon,
      pairingCode: code,
      pairingCodeExpiresAt: expiresAt,
      deviceId: device.id
    };
  }

  async updateKeledon(id: string, data: { 
    name?: string; 
    teamId?: string; 
    brandId?: string;
    countryCode?: string;
    userId?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    callsHandled?: number;
    fcrRate?: number;
    avgHandleTime?: number;
    autonomyLevel?: number;
    policies?: string;
    uiInterfaces?: string[];
  }) {
    return this.prisma.keledon.update({
      where: { id },
      data: {
        ...data,
        uiInterfaces: data.uiInterfaces ? JSON.stringify(data.uiInterfaces) : undefined,
      },
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
        uiInterfaces: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        brandId: true,
        countryCode: true,
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            country: true,
            brandId: true,
            brand: { select: { id: true, name: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async deleteKeledon(id: string) {
    return this.prisma.keledon.delete({ where: { id } });
  }

  async regenerateKeledonPairingCode(keledonId: string) {
    const keledon = await this.prisma.keledon.findUnique({ where: { id: keledonId } });
    if (!keledon) {
      throw new Error('Keledon not found');
    }

    // Check if device exists for this keledon
    const existingDevice = await this.prisma.device.findFirst({
      where: { keledonId }
    });

    const code = this.generatePairingCodeString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (existingDevice) {
      // Update existing device with new code
      await this.prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          pairingCode: code,
          pairingCodeExpiresAt: expiresAt,
          status: 'pending'
        }
      });
    } else {
      // Create new device
      await this.prisma.device.create({
        data: {
          keledonId,
          name: `Keledon: ${keledon.name}`,
          machineId: `keledon-${keledonId}`,
          platform: 'keledon',
          status: 'pending',
          pairingCode: code,
          pairingCodeExpiresAt: expiresAt
        }
      });
    }

    return { pairing_code: code, expires_at: expiresAt };
  }

  async generateKeledonLaunchLink(keledonId: string, userId: string) {
    console.log('[Launch] Starting for keledonId:', keledonId, 'userId:', userId);
    try {
      const keledon = await this.prisma.keledon.findUnique({ where: { id: keledonId } });
      if (!keledon) {
        console.log('[Launch] Keledon not found');
        throw new Error('Keledon not found');
      }
      console.log('[Launch] Keledon found:', keledon.name);

      // Get device for this keledon
      const device = await this.prisma.device.findFirst({
        where: { keledonId }
      });

      if (!device) {
        console.log('[Launch] No device found for keledon');
        throw new Error('Keledon has no paired device');
      }
      console.log('[Launch] Device found, pairingCode:', device.pairingCode);

      if (!device.pairingCode) {
        throw new Error('Keledon has no pairing code');
      }

      // Verify user has access - check Prisma first, then fallback for Google users
      let user = await this.prisma.user.findUnique({ where: { id: userId } });
      let isAuthorized = false;
      
      if (!user && userId.startsWith('google_')) {
        console.log('[Launch] Google user, allowing');
        isAuthorized = true;
      } else if (user) {
        console.log('[Launch] Prisma user found, role:', user.role);
        isAuthorized = 
          user.role === 'superadmin' ||
          user.role === 'admin' ||
          keledon.userId === userId;
      } else {
        console.log('[Launch] User not found in Prisma');
      }

      if (!isAuthorized) {
        throw new Error('User not authorized to launch this Keledon');
      }

      // Generate signed launch link
      const timestamp = Date.now();
      const payload = `${keledonId}:${userId}:${timestamp}`;
      const signature = this.signPayload(payload);

      const deepLink = `keledon://launch?keledonId=${keledonId}&code=${device.pairingCode}&userId=${userId}&timestamp=${timestamp}&signature=${signature}`;

      console.log('[Launch] Success, deepLink:', deepLink.substring(0, 50) + '...');
      return {
        keledon_id: keledonId,
        keledon_name: keledon.name,
        deep_link: deepLink,
        expires_at: new Date(timestamp + 60000),
        device_status: device.status
      };
    } catch (error) {
      console.error('[Launch] Error:', error.message);
      throw error;
    }
  }

  private signPayload(payload: string): string {
    const crypto = require('crypto');
    const secret = process.env.KELEDON_LAUNCH_SECRET || process.env.KELDEON_LAUNCH_SECRET || 'keledon-default-secret';
    return crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 16);
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

  async deleteOrphanedSessions(): Promise<{ deleted: number }> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { userId: null },
          { teamId: null },
        ],
      },
    });
    return { deleted: result.count };
  }

  async getOrphanedSessionCount(): Promise<number> {
    const count = await this.prisma.session.count({
      where: {
        OR: [
          { userId: null },
          { teamId: null },
        ],
      },
    });
    return count;
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

  // Helper to generate pairing code (same as device.service)
  private generatePairingCodeString(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
