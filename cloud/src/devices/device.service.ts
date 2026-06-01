import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.KELEDON_VENDOR_KEY || 'keledon-vendor-secret-key-32!';

@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    try {
      const [ivHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }

  async pairDevice(data: {
    device_id: string;
    machine_id: string;
    pairing_code: string;
    platform: string;
    name: string;
    organizationId?: string;
    userId?: string;
    keledonId?: string;
  }) {
    const code = data.pairing_code.toUpperCase();
    
    const device = await this.prisma.device.findFirst({
      where: {
        pairingCode: code,
        status: 'pending',
        pairingCodeExpiresAt: {
          gte: new Date()
        }
      }
    });

    if (!device) {
      throw new Error('Invalid or expired pairing code');
    }

    const authToken = this.generateAuthToken();

    const paired = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        keledonId: data.keledonId,
        status: 'paired',
        pairingCode: null,
        pairingCodeExpiresAt: null,
        authToken,
        platform: data.platform,
        name: data.name,
        lastSeen: new Date()
      }
    });

    const response: any = {
      device_id: paired.id,
      auth_token: authToken,
      cloud_url: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
      organization_id: paired.organizationId,
      keledon_id: paired.keledonId
    };

    if (paired.keledonId) {
      const keledon = await this.prisma.keledon.findUnique({
        where: { id: paired.keledonId },
        include: {
          team: {
            include: {
              brand: { include: { company: true } }
            }
          }
        }
      });

      if (keledon?.team) {
        response.team = {
          id: keledon.team.id,
          name: keledon.team.name,
          country: keledon.team.country,
          sttProvider: keledon.team.sttProvider,
          ttsProvider: keledon.team.ttsProvider,
          escalationTriggers: keledon.team.escalationTriggers || [],
          company: keledon.team.brand?.company ? {
            id: keledon.team.brand.company.id,
            name: keledon.team.brand.company.name
          } : null
        };

        const vendors = await this.prisma.vendor.findMany({
          where: { teamId: keledon.team.id, isActive: true }
        });

        response.vendors = vendors.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          baseUrl: v.baseUrl,
          username: v.username ? this.encrypt(v.username) : null,
          password: v.password ? this.encrypt(v.password) : null,
          apiKey: v.apiKey ? this.encrypt(v.apiKey) : null,
          config: v.config
        }));
      }
    }

    return response;
  }

  async registerPendingDevice(data: {
    device_id: string;
    machine_id: string;
    platform: string;
    name: string;
    userId?: string;
    organizationId?: string;
  }) {
    const existing = await this.prisma.device.findUnique({
      where: { machineId: data.machine_id }
    });

    if (existing) {
      return { device_id: existing.id, already_registered: true };
    }

    const device = await this.prisma.device.create({
      data: {
        id: data.device_id,
        machineId: data.machine_id,
        platform: data.platform,
        name: data.name,
        userId: data.userId,
        organizationId: data.organizationId,
        status: 'pending',
        version: '0.0.1'
      }
    });

    return { device_id: device.id, already_registered: false };
  }

  async generatePairingCode(userId?: string, organizationId?: string, keledonId?: string): Promise<string> {
    const code = this.generatePairingCodeString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Only set userId if provided and user exists
    let resolvedUserId: string | null = null;
    if (userId) {
      const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
      if (userExists) {
        resolvedUserId = userId;
      }
    }

    const device = await this.prisma.device.create({
      data: {
        userId: resolvedUserId,
        organizationId,
        keledonId,
        name: 'New Device',
        machineId: `pending-${Date.now()}`,
        platform: 'pending',
        status: 'pending',
        pairingCode: code,
        pairingCodeExpiresAt: expiresAt
      }
    });

    return code;
  }

  async getDevicesByUser(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeen: 'desc' }
    });
  }

  async getDevicesByOrganization(organizationId: string) {
    return this.prisma.device.findMany({
      where: { organizationId },
      orderBy: { lastSeen: 'desc' }
    });
  }

  async updateDeviceStatus(deviceId: string, status: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { 
        status,
        lastSeen: status === 'paired' ? new Date() : undefined
      }
    });
  }

  async validateAuthToken(token: string): Promise<{ valid: boolean; deviceId?: string }> {
    const device = await this.prisma.device.findFirst({
      where: { 
        authToken: token,
        status: 'paired'
      }
    });

    if (!device) {
      return { valid: false };
    }

    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: new Date() }
    });

    return { valid: true, deviceId: device.id };
  }

  async revokeDevice(deviceId: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { status: 'revoked', authToken: null }
    });
  }

  private readonly DEFAULT_RPA_CONFIG = {
    chain: ['testing-library-dom', 'playwright-style', 'native-dom'],
    fallback: true,
    providers: {
      'native-dom':           { enabled: true,  priority: 3 },
      'testing-library-dom':  { enabled: true,  priority: 1, options: { timeout: 5000 } },
      'playwright-style':     { enabled: true,  priority: 2 },
      'ai-vision':            { enabled: false, priority: 99, options: { model: 'gpt-4o' } },
    } as Record<string, { enabled: boolean; priority: number; options?: Record<string, any> }>,
  };

  async getRpaConfig(deviceId: string) {
    try {
      // Walk device → keledon → team → brand → company for tenant overrides
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
        select: { keledonId: true },
      });

      let companyId: string | null = null;
      if (device?.keledonId) {
        const keledon = await this.prisma.keledon.findUnique({
          where: { id: device.keledonId },
          include: { team: { include: { brand: true } } },
        });
        companyId = keledon?.team?.brand?.companyId ?? null;
      }

      // Global RPA catalog entries
      const globalEntries = await this.prisma.providerCatalog.findMany({
        where: { type: 'rpa' },
      });

      if (globalEntries.length === 0) {
        return this.DEFAULT_RPA_CONFIG;
      }

      // Tenant overrides (if we resolved a company)
      const tenantOverrides = companyId
        ? await this.prisma.tenantProviderConfig.findMany({
            where: { companyId, providerType: 'rpa' },
          })
        : [];
      const overrideMap = new Map(tenantOverrides.map(o => [o.providerId, o]));

      // Merge: start from browser defaults so unconfigured providers keep sane values
      const providers: Record<string, { enabled: boolean; priority: number; options?: Record<string, any> }> = {
        ...this.DEFAULT_RPA_CONFIG.providers,
      };

      for (const entry of globalEntries) {
        const override = overrideMap.get(entry.id);
        const enabled = override !== undefined ? override.isEnabled : entry.isEnabled;

        let meta: Record<string, any> = {};
        try { if (entry.metadata) meta = JSON.parse(entry.metadata); } catch { /* ignore bad JSON */ }

        providers[entry.id] = {
          enabled,
          priority: meta.priority ?? providers[entry.id]?.priority ?? 99,
          ...(meta.options ?? providers[entry.id]?.options
            ? { options: meta.options ?? providers[entry.id]?.options }
            : {}),
        };
      }

      // Chain = enabled providers sorted by priority
      const chain = Object.entries(providers)
        .filter(([, cfg]) => cfg.enabled)
        .sort(([, a], [, b]) => a.priority - b.priority)
        .map(([id]) => id);

      return { chain, fallback: true, providers };
    } catch {
      return this.DEFAULT_RPA_CONFIG;
    }
  }

  async createTestDevice(pairingCode: string, expiresAt: Date) {
    return this.prisma.device.create({
      data: {
        keledonId: 'test-keledon',
        name: 'Test Browser',
        machineId: `test-${Date.now()}`,
        platform: 'keledon',
        status: 'pending',
        pairingCode,
        pairingCodeExpiresAt: expiresAt
      }
    });
  }

  private generateAuthToken(): string {
    return `keledon_${Date.now()}_${Math.random().toString(36).slice(2, 16)}`;
  }

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