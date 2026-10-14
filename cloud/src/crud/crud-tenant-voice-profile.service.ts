import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudTenantVoiceProfileService {
  constructor(private readonly prisma: PrismaService) {}

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
  }) {
    if (Object.prototype.hasOwnProperty.call(data, 'config')) {
      throw new BadRequestException(
        'Voice profile config is not supported through CRUD.',
      );
    }
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
    },
  ) {
    if (Object.prototype.hasOwnProperty.call(data, 'config')) {
      throw new BadRequestException(
        'Voice profile config is not supported through CRUD.',
      );
    }
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
}
