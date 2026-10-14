import { Injectable } from '@nestjs/common';
import { getVendorAllowedOrigins } from '../vendor-url-policy';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { encryptVendorSecretForPairing } from '../security/vendor-secret-crypto';
import * as crypto from 'crypto';

type PairedDeviceResponse = {
  device_id: string;
  auth_token: string;
  cloud_url: string;
  organization_id: string | null;
  keledon_id: string | null;
  team?: {
    id: string;
    name: string;
    country: string | null;
    sttProvider: string | null;
    ttsProvider: string | null;
    escalationTriggers: Prisma.JsonValue;
    company: { id: string; name: string } | null;
  };
  vendors?: Array<{
    id: string;
    name: string;
    type: string;
    baseUrl: string;
    allowedOrigins: string[];
    username: string | null;
    password: string | null;
    apiKey: string | null;
  }>;
};

function getPersistedAllowedOrigins(config: Prisma.JsonValue): unknown {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return config.allowedOrigins;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

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
          gte: new Date(),
        },
      },
    });

    if (!device) {
      throw new Error('Invalid or expired pairing code');
    }

    const authToken = this.generateAuthToken();

    const paired = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        userId: device.userId,
        organizationId: device.organizationId,
        keledonId: device.keledonId,
        status: 'paired',
        pairingCode: null,
        pairingCodeExpiresAt: null,
        authToken,
        platform: data.platform,
        name: data.name,
        lastSeen: new Date(),
      },
    });

    const response: PairedDeviceResponse = {
      device_id: paired.id,
      auth_token: authToken,
      cloud_url: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
      organization_id: paired.organizationId,
      keledon_id: paired.keledonId,
    };

    if (paired.keledonId) {
      const keledon = await this.prisma.keledon.findUnique({
        where: { id: paired.keledonId },
        include: {
          team: {
            include: {
              brand: { include: { company: true } },
            },
          },
        },
      });

      if (keledon?.team) {
        response.team = {
          id: keledon.team.id,
          name: keledon.team.name,
          country: keledon.team.country,
          sttProvider: keledon.team.sttProvider,
          ttsProvider: keledon.team.ttsProvider,
          escalationTriggers: keledon.team.escalationTriggers || [],
          company: keledon.team.brand?.company
            ? {
                id: keledon.team.brand.company.id,
                name: keledon.team.brand.company.name,
              }
            : null,
        };

        const vendors = await this.prisma.vendor.findMany({
          where: { teamId: keledon.team.id, isActive: true },
        });

        response.vendors = vendors.map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type,
          baseUrl: v.baseUrl,
          allowedOrigins: getVendorAllowedOrigins(
            v.baseUrl,
            getPersistedAllowedOrigins(v.config),
          ),
          username: v.username
            ? encryptVendorSecretForPairing(v.username)
            : null,
          password: v.password
            ? encryptVendorSecretForPairing(v.password)
            : null,
          apiKey: v.apiKey ? encryptVendorSecretForPairing(v.apiKey) : null,
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
      where: { machineId: data.machine_id },
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
        version: '0.0.1',
      },
    });

    return { device_id: device.id, already_registered: false };
  }

  async generatePairingCode(
    userId?: string,
    organizationId?: string,
    keledonId?: string,
  ): Promise<string> {
    const code = this.generatePairingCodeString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Only set userId if provided and user exists
    let resolvedUserId: string | null = null;
    if (userId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (userExists) {
        resolvedUserId = userId;
      }
    }

    await this.prisma.device.create({
      data: {
        userId: resolvedUserId,
        organizationId,
        keledonId,
        name: 'New Device',
        machineId: `pending-${Date.now()}`,
        platform: 'pending',
        status: 'pending',
        pairingCode: code,
        pairingCodeExpiresAt: expiresAt,
      },
    });

    return code;
  }

  async getDevicesByUser(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeen: 'desc' },
    });
  }

  async getDevicesByOrganization(organizationId: string) {
    return this.prisma.device.findMany({
      where: { organizationId },
      orderBy: { lastSeen: 'desc' },
    });
  }

  async getAllDevices() {
    return this.prisma.device.findMany({ orderBy: { lastSeen: 'desc' } });
  }

  async getDeviceStatus(deviceId: string) {
    return this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { status: true, lastSeen: true },
    });
  }

  async updateDeviceStatus(deviceId: string, status: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status,
        lastSeen: status === 'paired' ? new Date() : undefined,
      },
    });
  }

  async validateAuthToken(
    token: string,
  ): Promise<{ valid: boolean; deviceId?: string }> {
    const device = await this.prisma.device.findFirst({
      where: {
        authToken: token,
        status: 'paired',
      },
    });

    if (!device) {
      return { valid: false };
    }

    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: new Date() },
    });

    return { valid: true, deviceId: device.id };
  }

  async revokeDevice(deviceId: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { status: 'revoked', authToken: null },
    });
  }

  private readonly DEFAULT_RPA_CONFIG = {
    chain: ['testing-library-dom', 'playwright-style', 'native-dom'],
    fallback: true,
    providers: {
      'native-dom': { enabled: true, priority: 3 },
      'testing-library-dom': {
        enabled: true,
        priority: 1,
        options: { timeout: 5000 },
      },
      'playwright-style': { enabled: true, priority: 2 },
      'ai-vision': {
        enabled: false,
        priority: 99,
        options: { model: 'gpt-4o' },
      },
    } as Record<
      string,
      { enabled: boolean; priority: number; options?: unknown }
    >,
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
      const overrideMap = new Map(
        tenantOverrides.map((o) => [o.providerId, o]),
      );

      // Merge: start from browser defaults so unconfigured providers keep sane values
      const providers: Record<
        string,
        { enabled: boolean; priority: number; options?: unknown }
      > = {
        ...this.DEFAULT_RPA_CONFIG.providers,
      };

      for (const entry of globalEntries) {
        const override = overrideMap.get(entry.id);
        const enabled =
          override !== undefined ? override.isEnabled : entry.isEnabled;

        let meta: Record<string, unknown> = {};
        try {
          if (entry.metadata) {
            const parsed: unknown = JSON.parse(entry.metadata);
            if (isRecord(parsed)) meta = parsed;
          }
        } catch {
          /* ignore bad JSON */
        }

        const resolvedOptions =
          meta.options !== undefined
            ? meta.options
            : providers[entry.id]?.options;
        providers[entry.id] = {
          enabled,
          priority:
            (typeof meta.priority === 'number' ? meta.priority : undefined) ??
            providers[entry.id]?.priority ??
            99,
          ...(resolvedOptions !== undefined
            ? { options: resolvedOptions }
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
        pairingCodeExpiresAt: expiresAt,
      },
    });
  }

  private generateAuthToken(): string {
    return `keledon_${crypto.randomBytes(32).toString('hex')}`;
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
