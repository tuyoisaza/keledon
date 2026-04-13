import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

    return {
      device_id: paired.id,
      auth_token: authToken,
      cloud_url: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
      organization_id: paired.organizationId,
      keledon_id: paired.keledonId
    };
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

  async generatePairingCode(userId: string, organizationId?: string, keledonId?: string): Promise<string> {
    const code = this.generatePairingCodeString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const device = await this.prisma.device.create({
      data: {
        userId,
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