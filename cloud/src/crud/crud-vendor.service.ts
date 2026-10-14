import { Injectable } from '@nestjs/common';
import { Prisma, Vendor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { encryptVendorSecretAtRest } from '../security/vendor-secret-crypto';
import {
  getVendorAllowedOrigins,
  normalizeVendorAllowedOrigins,
  normalizeVendorBaseUrl,
} from '../vendor-url-policy';

type VendorPublicSource = Pick<
  Vendor,
  | 'id'
  | 'teamId'
  | 'name'
  | 'type'
  | 'baseUrl'
  | 'config'
  | 'username'
  | 'isActive'
  | 'startGoal'
  | 'createdAt'
  | 'updatedAt'
> &
  Partial<Pick<Vendor, 'password' | 'apiKey'>>;

@Injectable()
export class CrudVendorService {
  constructor(private readonly prisma: PrismaService) {}

  async getVendor(id: string) {
    return this.prisma.vendor
      .findUnique({
        where: { id },
        select: {
          id: true,
          teamId: true,
          name: true,
          type: true,
          baseUrl: true,
          config: true,
          username: true,
          isActive: true,
          startGoal: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      .then((vendor) => vendor && this.toPublicVendor(vendor));
  }

  async getVendors(teamId: string) {
    const vendors = await this.prisma.vendor.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
    });
    return vendors.map((vendor) => this.toPublicVendor(vendor));
  }

  private toPublicVendor(vendor: VendorPublicSource) {
    const config =
      vendor.config &&
      typeof vendor.config === 'object' &&
      !Array.isArray(vendor.config)
        ? vendor.config
        : {};
    return {
      id: vendor.id,
      teamId: vendor.teamId,
      name: vendor.name,
      type: vendor.type,
      baseUrl: vendor.baseUrl,
      allowedOrigins: getVendorAllowedOrigins(
        vendor.baseUrl,
        config.allowedOrigins,
      ),
      username: vendor.username ? '***' : null,
      hasPassword:
        vendor.password === undefined ? undefined : !!vendor.password,
      hasApiKey: vendor.apiKey === undefined ? undefined : !!vendor.apiKey,
      isActive: vendor.isActive,
      startGoal: vendor.startGoal || null,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }

  async createVendor(data: {
    teamId: string;
    name: string;
    type: string;
    baseUrl?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    allowedOrigins?: string[];
    config?: Prisma.InputJsonObject;
    startGoal?: string;
  }) {
    const baseUrl = normalizeVendorBaseUrl(data.baseUrl);
    const allowedOrigins = normalizeVendorAllowedOrigins(
      baseUrl,
      data.allowedOrigins,
    );
    const vendor = await this.prisma.vendor.create({
      data: {
        teamId: data.teamId,
        name: data.name,
        type: data.type,
        baseUrl,
        username: data.username
          ? encryptVendorSecretAtRest(data.username)
          : data.username,
        password: data.password
          ? encryptVendorSecretAtRest(data.password)
          : data.password,
        apiKey: data.apiKey
          ? encryptVendorSecretAtRest(data.apiKey)
          : data.apiKey,
        config: { ...(data.config || {}), allowedOrigins },
        startGoal: data.startGoal,
      },
    });
    return this.toPublicVendor(vendor);
  }

  async updateVendor(
    id: string,
    data: {
      name?: string;
      type?: string;
      baseUrl?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      allowedOrigins?: string[];
      config?: Prisma.InputJsonObject;
      isActive?: boolean;
      startGoal?: string;
    },
  ) {
    const current = await this.prisma.vendor.findUnique({
      where: { id },
      select: { baseUrl: true, config: true },
    });
    if (!current) throw new Error('Vendor not found');
    const currentConfig =
      current.config &&
      typeof current.config === 'object' &&
      !Array.isArray(current.config)
        ? (current.config as Record<string, unknown>)
        : {};
    const baseUrl =
      data.baseUrl === undefined
        ? normalizeVendorBaseUrl(current.baseUrl)
        : normalizeVendorBaseUrl(data.baseUrl);
    const priorOrigins = Array.isArray(currentConfig.allowedOrigins)
      ? currentConfig.allowedOrigins
      : [];
    const allowedOrigins = normalizeVendorAllowedOrigins(
      baseUrl,
      data.allowedOrigins === undefined ? priorOrigins : data.allowedOrigins,
    );
    const { config, ...vendorFields } = data;
    delete vendorFields.allowedOrigins;
    const updateData: Prisma.VendorUpdateInput = {
      ...vendorFields,
      baseUrl,
      config: {
        ...currentConfig,
        ...(config || {}),
        allowedOrigins,
      },
    };
    // Safety: never write masked placeholder values to the DB
    if (updateData.username === '***') delete updateData.username;
    if (updateData.password === '***') delete updateData.password;
    if (updateData.apiKey === '***') delete updateData.apiKey;
    for (const field of ['username', 'password', 'apiKey'] as const) {
      if (typeof updateData[field] === 'string' && updateData[field] !== '') {
        updateData[field] = encryptVendorSecretAtRest(updateData[field]);
      }
    }
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: updateData,
    });
    return this.toPublicVendor(vendor);
  }

  async deleteVendor(id: string) {
    await this.prisma.vendor.delete({ where: { id } });
    return { success: true };
  }
}
