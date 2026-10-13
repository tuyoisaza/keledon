import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudMigrationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureVendorsSchema() {
    try {
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "vendors" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "teamId" UUID NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
          "name" VARCHAR(255) NOT NULL,
          "type" VARCHAR(50) NOT NULL DEFAULT 'other',
          "baseUrl" TEXT,
          "username" TEXT,
          "password" TEXT,
          "apiKey" TEXT,
          "config" JSONB,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT now(),
          "updatedAt" TIMESTAMP DEFAULT now()
        )
      `;
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "vendors_teamId_idx" ON "vendors"("teamId")
      `;
      await this.prisma.$executeRaw`
        ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "startGoal" TEXT
      `;
      return { status: 'ok', message: 'Vendors table created' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Schema update failed',
      };
    }
  }
}
