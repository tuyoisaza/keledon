import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudSeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seedFromCrudJson(): Promise<{
    companies: number;
    brands: number;
    teams: number;
    users: number;
  }> {
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
        const existing = await this.prisma.company.findFirst({
          where: { name: company.name },
        });
        if (!existing) {
          await this.prisma.company.create({
            data: {
              name: company.name,
              industry: company.industry || null,
            },
          });
          companiesCreated++;
        }
      }
    }

    // Seed Brands
    if (data.brands && Array.isArray(data.brands)) {
      for (const brand of data.brands) {
        const existing = await this.prisma.brand.findFirst({
          where: { name: brand.name },
        });
        if (!existing) {
          const company = await this.prisma.company.findFirst({
            where: { name: brand.company_name },
          });
          if (company) {
            await this.prisma.brand.create({
              data: {
                name: brand.name,
                companyId: company.id,
                color: brand.color || '#6366f1',
              },
            });
            brandsCreated++;
          }
        }
      }
    }

    // Seed Teams
    if (data.teams && Array.isArray(data.teams)) {
      for (const team of data.teams) {
        const existing = await this.prisma.team.findFirst({
          where: { name: team.name },
        });
        if (!existing) {
          let brandId = null;
          if (team.brand_name) {
            const brand = await this.prisma.brand.findFirst({
              where: { name: team.brand_name },
            });
            brandId = brand?.id || null;
          }
          await this.prisma.team.create({
            data: {
              name: team.name,
              brandId: brandId,
              country: team.country || null,
              sttProvider: team.stt_provider || 'vosk',
              ttsProvider: team.tts_provider || 'elevenlabs',
            },
          });
          teamsCreated++;
        }
      }
    }

    // Seed Users
    if (data.users && Array.isArray(data.users)) {
      for (const user of data.users) {
        const existing = await this.prisma.user.findFirst({
          where: { email: user.email },
        });
        if (!existing) {
          let companyId = null;
          let teamId = null;

          if (user.company_name) {
            const company = await this.prisma.company.findFirst({
              where: { name: user.company_name },
            });
            companyId = company?.id || null;
          }
          if (user.team_name) {
            const team = await this.prisma.team.findFirst({
              where: { name: user.team_name },
            });
            teamId = team?.id || null;
          }

          await this.prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email.split('@')[0],
              role: user.role || 'user',
              companyId: companyId,
              teamId: teamId,
            },
          });
          usersCreated++;
        }
      }
    }

    return {
      companies: companiesCreated,
      brands: brandsCreated,
      teams: teamsCreated,
      users: usersCreated,
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
