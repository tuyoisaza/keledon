import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import {
  getSeedRecordId,
  getSeedRecords,
  getSeedString,
} from '../prisma/seed-data';

@Injectable()
export class CrudSeedService {
  private readonly seedDataPath = '/app/data/crud.json';

  constructor(private readonly prisma: PrismaService) {}

  async seedFromCrudJson(): Promise<{
    companies: number;
    brands: number;
    teams: number;
    users: number;
  }> {
    if (!fs.existsSync(this.seedDataPath)) {
      throw new Error('crud.json not found');
    }

    const data: unknown = JSON.parse(
      fs.readFileSync(this.seedDataPath, 'utf8'),
    );
    let companiesCreated = 0;
    let brandsCreated = 0;
    let teamsCreated = 0;
    let usersCreated = 0;

    for (const company of getSeedRecords(data, 'companies')) {
      const name = getSeedString(company, 'name');
      if (!name) continue;
      const existing = await this.prisma.company.findFirst({ where: { name } });
      if (existing) continue;
      await this.prisma.company.create({
        data: {
          name,
          industry: getSeedString(company, 'industry') ?? null,
        },
      });
      companiesCreated++;
    }

    for (const brand of getSeedRecords(data, 'brands')) {
      const name = getSeedString(brand, 'name');
      const companyName = getSeedString(brand, 'company_name');
      if (!name || !companyName) continue;
      const existing = await this.prisma.brand.findFirst({ where: { name } });
      if (existing) continue;
      const company = await this.prisma.company.findFirst({
        where: { name: companyName },
      });
      const companyId = getSeedRecordId(company);
      if (!companyId) continue;
      await this.prisma.brand.create({
        data: {
          name,
          companyId,
          color: getSeedString(brand, 'color', 64) ?? '#6366f1',
        },
      });
      brandsCreated++;
    }

    for (const team of getSeedRecords(data, 'teams')) {
      const name = getSeedString(team, 'name');
      if (!name) continue;
      const existing = await this.prisma.team.findFirst({ where: { name } });
      if (existing) continue;
      let brandId: string | null = null;
      const brandName = getSeedString(team, 'brand_name');
      if (brandName) {
        const brand = await this.prisma.brand.findFirst({
          where: { name: brandName },
        });
        brandId = getSeedRecordId(brand);
      }
      await this.prisma.team.create({
        data: {
          name,
          brandId,
          country: getSeedString(team, 'country', 128) ?? null,
          sttProvider: getSeedString(team, 'stt_provider', 64) ?? 'vosk',
          ttsProvider: getSeedString(team, 'tts_provider', 64) ?? 'elevenlabs',
        },
      });
      teamsCreated++;
    }

    for (const user of getSeedRecords(data, 'users')) {
      const email = getSeedString(user, 'email', 320)?.toLowerCase();
      if (!email || !email.includes('@')) continue;
      const existing = await this.prisma.user.findFirst({ where: { email } });
      if (existing) continue;

      let companyId: string | null = null;
      let teamId: string | null = null;
      const companyName = getSeedString(user, 'company_name');
      if (companyName) {
        const company = await this.prisma.company.findFirst({
          where: { name: companyName },
        });
        companyId = getSeedRecordId(company);
      }
      const teamName = getSeedString(user, 'team_name');
      if (teamName) {
        const team = await this.prisma.team.findFirst({
          where: { name: teamName },
        });
        teamId = getSeedRecordId(team);
      }

      await this.prisma.user.create({
        data: {
          email,
          name: getSeedString(user, 'name') ?? email.split('@')[0],
          role: 'user',
          companyId,
          teamId,
        },
      });
      usersCreated++;
    }

    return {
      companies: companiesCreated,
      brands: brandsCreated,
      teams: teamsCreated,
      users: usersCreated,
    };
  }
}
