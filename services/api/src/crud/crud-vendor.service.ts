import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudVendorService {
  constructor(private readonly prisma: PrismaService) {}

  async getVendors(teamId: string) {
    const vendors = await this.prisma.vendor.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
    });
    return vendors.map((v) => ({
      id: v.id,
      teamId: v.teamId,
      name: v.name,
      type: v.type,
      baseUrl: v.baseUrl,
      username: v.username || null,
      hasPassword: !!v.password,
      hasApiKey: !!v.apiKey,
      isActive: v.isActive,
      startGoal: v.startGoal || null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));
  }

  async createVendor(data: {
    teamId: string;
    name: string;
    type: string;
    baseUrl?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    config?: Record<string, unknown>;
    startGoal?: string;
  }) {
    const vendor = await this.prisma.vendor.create({
      data: {
        teamId: data.teamId,
        name: data.name,
        type: data.type,
        baseUrl: data.baseUrl,
        username: data.username,
        password: data.password,
        apiKey: data.apiKey,
        config: data.config as any,
        startGoal: data.startGoal,
      },
    });
    return {
      id: vendor.id,
      teamId: vendor.teamId,
      name: vendor.name,
      type: vendor.type,
      baseUrl: vendor.baseUrl,
      username: vendor.username || null,
      hasPassword: !!vendor.password,
      hasApiKey: !!vendor.apiKey,
      isActive: vendor.isActive,
      startGoal: vendor.startGoal || null,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
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
      config?: Record<string, unknown>;
      isActive?: boolean;
      startGoal?: string;
    },
  ) {
    const updateData: any = { ...data };
    // Safety: never write masked placeholder values to the DB
    if (updateData.username === '***') delete updateData.username;
    if (updateData.password === '***') delete updateData.password;
    if (updateData.apiKey === '***') delete updateData.apiKey;
    if (data.config) {
      updateData.config = data.config;
    }
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: updateData,
    });
    return {
      id: vendor.id,
      teamId: vendor.teamId,
      name: vendor.name,
      type: vendor.type,
      baseUrl: vendor.baseUrl,
      username: vendor.username || null,
      hasPassword: !!vendor.password,
      hasApiKey: !!vendor.apiKey,
      isActive: vendor.isActive,
      startGoal: vendor.startGoal || null,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }

  async deleteVendor(id: string) {
    await this.prisma.vendor.delete({ where: { id } });
    return { success: true };
  }
}
