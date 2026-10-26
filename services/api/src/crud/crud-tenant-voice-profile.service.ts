import { voiceSettings } from '../tts/voice-settings';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudTenantVoiceProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private publicProfile(row:any) { if(!row)return row; try{return {...row,config:JSON.stringify(voiceSettings(row.config))};}catch{return {...row,config:null};} }
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
        config:true,
      },
      orderBy: { name: 'asc' },
    }).then(rows=>rows.map(row=>this.publicProfile(row)));
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
        config:true,
      },
    }).then(row=>this.publicProfile(row));
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
    if (data.config!==undefined) data.config=JSON.stringify(voiceSettings(data.config));
    return this.prisma.tenantVoiceProfile.create({
      data,
      select: {
        id: true,
        name: true,
        providerId: true,
        language: true,
        isEnabled: true,
        isDefault: true,
        config:true,
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
    config?: string;
    },
  ) {
    if (data.config!==undefined) data.config=JSON.stringify(voiceSettings(data.config));
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
        config:true,
      },
    });
  }

  async deleteTenantVoiceProfile(id: string) {
    return this.prisma.tenantVoiceProfile.delete({ where: { id } });
  }
}
