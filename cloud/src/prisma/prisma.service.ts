import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { getSeedRecordId, getSeedRecords, getSeedString } from './seed-data';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly seedDataPath = '/app/data/crud.json';

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log('[Prisma] Connected to database');
      await this.cleanupOrphanedSessions(); // Clean existing orphaned sessions
      await this.autoSeedIfEmpty();
      this.startPeriodicCleanup(); // Start scheduled cleanup
    } catch {
      console.warn('[Prisma] Failed to connect (non-fatal)');
    }
  }

  private async cleanupOrphanedSessions(): Promise<void> {
    try {
      const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const result = await this.session.updateMany({
        where: {
          status: 'active',
          updatedAt: { lt: staleThreshold },
        },
        data: { status: 'ended' },
      });
      if (result.count > 0) {
        console.log(`[Prisma] Cleaned up ${result.count} orphaned sessions`);
      }
    } catch {
      console.error('[Prisma] Failed to cleanup orphaned sessions');
    }
  }

  private startPeriodicCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        void this.cleanupOrphanedSessions();
      },
      60 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private async autoSeedIfEmpty(): Promise<void> {
    try {
      const companyCount = await this.company.count();

      if (companyCount === 0) {
        console.log('[Prisma] Database is empty, checking for seed data...');

        const dataPath = this.seedDataPath;

        if (fs.existsSync(dataPath)) {
          console.log('[Prisma] Found crud.json, seeding database...');
          const data: unknown = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

          for (const company of getSeedRecords(data, 'companies')) {
            const name = getSeedString(company, 'name');
            if (!name) continue;
            const existing = await this.company.findFirst({
              where: { name },
            });
            if (!existing) {
              await this.company.create({
                data: {
                  name,
                  industry: getSeedString(company, 'industry') ?? null,
                },
              });
              console.log(`[Seed] Created company: ${name}`);
            }
          }

          for (const brand of getSeedRecords(data, 'brands')) {
            const name = getSeedString(brand, 'name');
            const companyName = getSeedString(brand, 'company_name');
            if (!name || !companyName) continue;
            const existing = await this.brand.findFirst({
              where: { name },
            });
            if (!existing) {
              const company = await this.company.findFirst({
                where: { name: companyName },
              });
              if (company) {
                await this.brand.create({
                  data: {
                    name,
                    companyId: company.id,
                    color: getSeedString(brand, 'color', 64) ?? '#6366f1',
                  },
                });
                console.log(`[Seed] Created brand: ${name}`);
              }
            }
          }

          for (const team of getSeedRecords(data, 'teams')) {
            const name = getSeedString(team, 'name');
            if (!name) continue;
            const existing = await this.team.findFirst({
              where: { name },
            });
            if (!existing) {
              let brandId: string | null = null;
              const brandName = getSeedString(team, 'brand_name');
              if (brandName) {
                const brand = await this.brand.findFirst({
                  where: { name: brandName },
                });
                brandId = getSeedRecordId(brand);
              }
              await this.team.create({
                data: {
                  name,
                  brandId,
                  country: getSeedString(team, 'country', 128) ?? null,
                  sttProvider:
                    getSeedString(team, 'stt_provider', 64) ?? 'vosk',
                  ttsProvider:
                    getSeedString(team, 'tts_provider', 64) ?? 'elevenlabs',
                },
              });
              console.log(`[Seed] Created team: ${name}`);
            }
          }

          for (const user of getSeedRecords(data, 'users')) {
            const email = getSeedString(user, 'email', 320)?.toLowerCase();
            if (!email || !email.includes('@')) continue;
            const existing = await this.user.findFirst({
              where: { email },
            });
            if (!existing) {
              let companyId: string | null = null;
              let teamId: string | null = null;

              const companyName = getSeedString(user, 'company_name');
              if (companyName) {
                const company = await this.company.findFirst({
                  where: { name: companyName },
                });
                companyId = getSeedRecordId(company);
              }
              const teamName = getSeedString(user, 'team_name');
              if (teamName) {
                const team = await this.team.findFirst({
                  where: { name: teamName },
                });
                teamId = getSeedRecordId(team);
              }

              await this.user.create({
                data: {
                  email,
                  name: getSeedString(user, 'name') ?? email.split('@')[0],
                  role: 'user',
                  companyId,
                  teamId,
                },
              });
              console.log(`[Seed] Created user: ${email}`);
            }
          }

          console.log('[Prisma] Auto-seed completed');
        } else {
          console.log('[Prisma] No crud.json found, skipping seed');
        }
      } else {
        console.log(`[Prisma] Database has ${companyCount} companies`);
      }
    } catch {
      console.error('[Prisma] Auto-seed failed');
    }
  }

  enableShutdownHooks(app: INestApplication): void {
    process.once('beforeExit', () => {
      void app.close().catch(() => {
        console.error('[Prisma] Failed to close application cleanly');
      });
    });
  }
}
