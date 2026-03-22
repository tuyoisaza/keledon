import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[Prisma] Connected to database');
      await this.autoSeedIfEmpty();
    } catch (error) {
      console.warn('[Prisma] Failed to connect (non-fatal):', error.message);
    }
  }

  private async autoSeedIfEmpty() {
    try {
      const companyCount = await this.company.count();
      
      if (companyCount === 0) {
        console.log('[Prisma] Database is empty, checking for seed data...');
        
        const dataPath = '/app/data/crud.json';
        
        if (fs.existsSync(dataPath)) {
          console.log('[Prisma] Found crud.json, seeding database...');
          const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          
          if (data.companies && Array.isArray(data.companies)) {
            for (const company of data.companies) {
              const existing = await this.company.findFirst({ where: { name: company.name } });
              if (!existing) {
                await this.company.create({
                  data: {
                    name: company.name,
                    industry: company.industry || null,
                  }
                });
                console.log(`[Seed] Created company: ${company.name}`);
              }
            }
          }
          
          if (data.brands && Array.isArray(data.brands)) {
            for (const brand of data.brands) {
              const existing = await this.brand.findFirst({ where: { name: brand.name } });
              if (!existing) {
                const company = await this.company.findFirst({ where: { name: brand.company_name } });
                if (company) {
                  await this.brand.create({
                    data: {
                      name: brand.name,
                      companyId: company.id,
                      color: brand.color || '#6366f1',
                    }
                  });
                  console.log(`[Seed] Created brand: ${brand.name}`);
                }
              }
            }
          }
          
          if (data.teams && Array.isArray(data.teams)) {
            for (const team of data.teams) {
              const existing = await this.team.findFirst({ where: { name: team.name } });
              if (!existing) {
                let brandId = null;
                if (team.brand_name) {
                  const brand = await this.brand.findFirst({ where: { name: team.brand_name } });
                  brandId = brand?.id || null;
                }
                await this.team.create({
                  data: {
                    name: team.name,
                    brandId: brandId,
                    country: team.country || null,
                    sttProvider: team.stt_provider || 'vosk',
                    ttsProvider: team.tts_provider || 'elevenlabs',
                  }
                });
                console.log(`[Seed] Created team: ${team.name}`);
              }
            }
          }
          
          if (data.users && Array.isArray(data.users)) {
            for (const user of data.users) {
              const existing = await this.user.findFirst({ where: { email: user.email } });
              if (!existing) {
                let companyId = null;
                let teamId = null;
                
                if (user.company_name) {
                  const company = await this.company.findFirst({ where: { name: user.company_name } });
                  companyId = company?.id || null;
                }
                if (user.team_name) {
                  const team = await this.team.findFirst({ where: { name: user.team_name } });
                  teamId = team?.id || null;
                }
                
                await this.user.create({
                  data: {
                    email: user.email,
                    name: user.name || user.email.split('@')[0],
                    role: user.role || 'user',
                    companyId: companyId,
                    teamId: teamId,
                  }
                });
                console.log(`[Seed] Created user: ${user.email}`);
              }
            }
          }
          
          console.log('[Prisma] Auto-seed completed');
        } else {
          console.log('[Prisma] No crud.json found, skipping seed');
        }
      } else {
        console.log(`[Prisma] Database has ${companyCount} companies`);
      }
    } catch (error) {
      console.error('[Prisma] Auto-seed failed:', error.message);
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
