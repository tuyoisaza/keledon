import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export function generatePairingCodeString(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function signPayload(payload: string): string {
  const crypto = require('crypto');
  const secret =
    process.env.KELEDON_LAUNCH_SECRET ||
    process.env.KELDEON_LAUNCH_SECRET ||
    'keledon-default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .substring(0, 16);
}

@Injectable()
export class CrudKeledonService {
  constructor(private readonly prisma: PrismaService) {}

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
            brand: { select: { id: true, name: true, companyId: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: 'asc' },
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
        uiInterfaces: data.uiInterfaces
          ? JSON.stringify(data.uiInterfaces)
          : undefined,
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
            brand: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Auto-create device with pairing code for this Keledon
    const code = generatePairingCodeString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const device = await this.prisma.device.create({
      data: {
        keledonId: keledon.id,
        name: `Keledon: ${keledon.name}`,
        machineId: `keledon-${keledon.id}`,
        platform: 'keledon',
        status: 'pending',
        pairingCode: code,
        pairingCodeExpiresAt: expiresAt,
      },
    });

    // Return keledon with pairing code info
    return {
      ...keledon,
      pairingCode: code,
      pairingCodeExpiresAt: expiresAt,
      deviceId: device.id,
    };
  }

  async updateKeledon(
    id: string,
    data: {
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
    },
  ) {
    return this.prisma.keledon.update({
      where: { id },
      data: {
        ...data,
        uiInterfaces: data.uiInterfaces
          ? JSON.stringify(data.uiInterfaces)
          : undefined,
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
            brand: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteKeledon(id: string) {
    return this.prisma.keledon.delete({ where: { id } });
  }

  async getKeledonPairingCode(keledonId: string) {
    const device = await this.prisma.device.findFirst({
      where: { keledonId },
      select: { pairingCode: true, pairingCodeExpiresAt: true, status: true },
    });
    if (!device) {
      return { pairing_code: null, device_status: 'none' };
    }
    return {
      pairing_code: device.pairingCode,
      expires_at: device.pairingCodeExpiresAt,
      device_status: device.status,
    };
  }

  async regenerateKeledonPairingCode(keledonId: string) {
    const keledon = await this.prisma.keledon.findUnique({
      where: { id: keledonId },
    });
    if (!keledon) {
      throw new Error('Keledon not found');
    }

    // Check if device exists for this keledon
    const existingDevice = await this.prisma.device.findFirst({
      where: { keledonId },
    });

    const code = generatePairingCodeString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (existingDevice) {
      // Update existing device with new code
      await this.prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          pairingCode: code,
          pairingCodeExpiresAt: expiresAt,
          status: 'pending',
        },
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
          pairingCodeExpiresAt: expiresAt,
        },
      });
    }

    return { pairing_code: code, expires_at: expiresAt };
  }

  async generateKeledonLaunchLink(keledonId: string, userId: string) {
    console.log(
      '[Launch] Starting for keledonId:',
      keledonId,
      'userId:',
      userId,
    );
    try {
      const keledon = await this.prisma.keledon.findUnique({
        where: { id: keledonId },
      });
      if (!keledon) {
        console.log('[Launch] Keledon not found');
        throw new Error('Keledon not found');
      }
      console.log('[Launch] Keledon found:', keledon.name);

      // Get device for this keledon
      const device = await this.prisma.device.findFirst({
        where: { keledonId },
      });

      if (!device) {
        console.log('[Launch] No device found for keledon');
        throw new Error('Keledon has no paired device');
      }
      console.log('[Launch] Device found, pairingCode:', device.pairingCode);

      if (!device.pairingCode) {
        console.log('[Launch] No pairing code, generating on-demand...');
        device.pairingCode = generatePairingCodeString();
        device.pairingCodeExpiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await this.prisma.device.update({
          where: { id: device.id },
          data: {
            pairingCode: device.pairingCode,
            pairingCodeExpiresAt: device.pairingCodeExpiresAt,
            status: 'pending',
          },
        });
        console.log('[Launch] New pairing code generated:', device.pairingCode);
      } else {
        // Refresh expiry and reset status so pairing always works
        console.log('[Launch] Refreshing existing pairing code expiry and status');
        device.pairingCodeExpiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await this.prisma.device.update({
          where: { id: device.id },
          data: {
            pairingCodeExpiresAt: device.pairingCodeExpiresAt,
            status: 'pending',
          },
        });
      }

      // Re-read device status from DB so the response is accurate
      const updatedDevice = await this.prisma.device.findUnique({
        where: { id: device.id },
        select: { status: true, pairingCode: true, pairingCodeExpiresAt: true },
      });
      if (updatedDevice) {
        device.status = updatedDevice.status;
        device.pairingCode = updatedDevice.pairingCode;
        device.pairingCodeExpiresAt = updatedDevice.pairingCodeExpiresAt;
      }

      // Verify user has access - check Prisma first, then fallback for Google users
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
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

      const vendors = await this.prisma.vendor.findMany({ where: { teamId: keledon.teamId } });
      const activeVendors = vendors.filter((v) => v.isActive !== false);
      const nextSteps =
        activeVendors.length > 0
          ? [
              {
                title: 'Open vendor surfaces',
                detail: activeVendors.map((v) => v.name).join(', '),
              },
              ...activeVendors.map((vendor, index) => ({
                title: `Step ${index + 1}: Open ${vendor.name}`,
                detail: vendor.baseUrl
                  ? `${vendor.baseUrl}${vendor.type ? ` • ${vendor.type}` : ''}`
                  : vendor.type || 'No base URL configured',
              })),
              {
                title: 'Return to standby',
                detail:
                  'Stay connected, watch the activity log, and wait for the next call trigger.',
              },
            ]
          : [
              {
                title: 'No vendors configured yet',
                detail:
                  'Open Management → Vendors on the keledon site and register the call / CRM surfaces for this team.',
              },
            ];

      // Generate signed launch link
      const timestamp = Date.now();
      const payload = `${keledonId}:${userId}:${timestamp}`;
      const signature = this.signPayload(payload);

      const cloudUrl = process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com';
      const deepLink = `keledon://launch?keledonId=${keledonId}&code=${device.pairingCode}&userId=${userId}&timestamp=${timestamp}&signature=${signature}&cloudUrl=${encodeURIComponent(cloudUrl)}`;

      console.log(
        '[Launch] Success, deepLink:',
        deepLink.substring(0, 50) + '...',
      );
      return {
        keledon_id: keledonId,
        team_id: keledon.teamId,
        keledon_name: keledon.name,
        deep_link: deepLink,
        expires_at: new Date(timestamp + 60000),
        code_expires_at: device.pairingCodeExpiresAt,
        device_status: device.status,
        vendors: activeVendors,
        next_steps: nextSteps,
      };
    } catch (error) {
      console.error('[Launch] Error:', error.message);
      throw error;
    }
  }

  async getLaunchContext(keledonId: string) {
    try {
      const keledon = await this.prisma.keledon.findUnique({
        where: { id: keledonId },
      });
      if (!keledon) {
        return { error: 'Keledon not found', keledonId };
      }

      const team = await this.prisma.team.findUnique({
        where: { id: keledon.teamId },
      });
      const vendors = await this.prisma.vendor.findMany({ where: { teamId: keledon.teamId } });
      const activeVendors = vendors.filter((v) => v.isActive !== false);

      const nextSteps = activeVendors.length > 0
        ? [
            { title: 'Open vendor surfaces', detail: activeVendors.map((v) => v.name).join(', ') },
            ...activeVendors.map((vendor, index) => ({
              title: `Step ${index + 1}: Open ${vendor.name}`,
              detail: vendor.baseUrl
                ? `${vendor.baseUrl}${vendor.type ? ` • ${vendor.type}` : ''}`
                : vendor.type || 'No base URL configured',
            })),
            { title: 'Return to standby', detail: 'Stay connected, watch the activity log, and wait for the next call trigger.' },
          ]
        : [{ title: 'No vendors configured yet', detail: 'Open Management → Vendors on the keledon site.' }];

      return {
        keledon: { id: keledon.id, name: keledon.name, teamId: keledon.teamId, brandId: keledon.brandId, countryCode: keledon.countryCode },
        team: team ? { id: team.id, name: team.name, brandId: team.brandId, country: team.country } : null,
        activeVendors: activeVendors.map((v) => ({ id: v.id, name: v.name, type: v.type, baseUrl: v.baseUrl })),
        nextSteps,
        autoExecute: activeVendors.length > 0
          ? [{ goal: `open ${activeVendors[0].name}`, url: activeVendors[0].baseUrl }]
          : [{ goal: 'return to standby', url: null }],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { error: error.message, keledonId };
    }
  }

  private signPayload(payload: string): string {
    const crypto = require('crypto');
    const secret =
      process.env.KELEDON_LAUNCH_SECRET ||
      process.env.KELDEON_LAUNCH_SECRET ||
      'keledon-default-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .substring(0, 16);
  }

}
