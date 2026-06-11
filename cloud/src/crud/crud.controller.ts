import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CrudService } from './crud.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookGuard } from '../guards/webhook.guard';

@Controller('api/crud')
export class CrudController {
  constructor(private readonly crud: CrudService, private readonly prisma: PrismaService) {}

  // ========== HEALTH ==========

  @Get('health')
  getHealth() {
    return this.crud.getHealth();
  }

  // ========== MIGRATE ==========

  @Post('migrate')
  async migrate() {
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
      await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "vendors_teamId_idx" ON "vendors"("teamId")`;

      // Add startGoal column if missing (v0.3.35+)
      await this.prisma.$executeRaw`
        ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "startGoal" TEXT
      `;

      return { status: 'ok', message: 'Vendors table created' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // ========== COMPANIES ==========

  @Get('companies')
  getCompanies() {
    return this.crud.getCompanies();
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.crud.getCompany(id);
  }

  @Post('companies')
  createCompany(@Body() data: any) {
    return this.crud.createCompany(data);
  }

  @Put('companies/:id')
  updateCompany(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateCompany(id, data);
  }

  @Delete('companies/:id')
  async deleteCompany(@Param('id') id: string) {
    await this.crud.deleteCompany(id);
    return { success: true };
  }

  @Post('companies/:id/countries')
  addCompanyCountry(@Param('id') id: string, @Body() data: { countryCode: string }) {
    return this.crud.addCompanyCountry(id, data.countryCode);
  }

  @Delete('companies/:id/countries/:code')
  removeCompanyCountry(@Param('id') id: string, @Param('code') code: string) {
    return this.crud.removeCompanyCountry(id, code);
  }

  // ========== BRANDS ==========

  @Get('brands')
  getBrands(@Query('companyId') companyId?: string) {
    return this.crud.getBrands(companyId);
  }

  @Post('brands')
  createBrand(@Body() data: any) {
    return this.crud.createBrand(data);
  }

  @Put('brands/:id')
  updateBrand(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateBrand(id, data);
  }

  @Delete('brands/:id')
  async deleteBrand(@Param('id') id: string) {
    await this.crud.deleteBrand(id);
    return { success: true };
  }

  // ========== TEAMS ==========

  @Get('teams')
  getTeams(@Query('companyId') companyId?: string) {
    return this.crud.getTeams(companyId);
  }

  @Get('teams/:id')
  getTeam(@Param('id') id: string) {
    return this.crud.getTeams(id);
  }

  @Post('teams')
  createTeam(@Body() data: any) {
    return this.crud.createTeam(data);
  }

  @Put('teams/:id')
  updateTeam(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateTeam(id, data);
  }

  @Delete('teams/:id')
  async deleteTeam(@Param('id') id: string) {
    await this.crud.deleteTeam(id);
    return { success: true };
  }

  @Get('teams/:id/interfaces')
  getTeamInterfaces(@Param('id') id: string) {
    return this.crud.getTeamInterfaces(id);
  }

  @Put('teams/:id/interfaces')
  setTeamInterfaces(@Param('id') id: string, @Body() data: { interfaceIds: string[] }) {
    return this.crud.setTeamInterfaces(id, data.interfaceIds);
  }

  // ========== USERS ==========

  @Get('users')
  getUsers(@Query('companyId') companyId?: string) {
    return this.crud.getUsers(companyId);
  }

  @Post('users')
  createUser(@Body() data: any) {
    return this.crud.createUser(data);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateUser(id, data);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.crud.deleteUser(id);
    return { success: true };
  }

  // ========== KELEDONS ==========

  @Get('keledons')
  getKeledons(@Query('companyId') companyId?: string) {
    return this.crud.getKeledons(companyId);
  }

  @Post('keledons')
  createKeledon(@Body() data: any) {
    return this.crud.createKeledon(data);
  }

  @Put('keledons/:id')
  updateKeledon(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateKeledon(id, data);
  }

  @Delete('keledons/:id')
  async deleteKeledon(@Param('id') id: string) {
    await this.crud.deleteKeledon(id);
    return { success: true };
  }

  @Post('keledons/:id/pairing-code')
  async regeneratePairingCode(@Param('id') keledonId: string) {
    return this.crud.regenerateKeledonPairingCode(keledonId);
  }

  @Post('keledons/:id/launch')
  async launchKeledon(
    @Param('id') keledonId: string,
    @Body() body: { userId: string }
  ) {
    return this.crud.generateKeledonLaunchLink(keledonId, body.userId);
  }

  // ========== MANAGED INTERFACES ==========

  @Get('interfaces')
  getManagedInterfaces() {
    return this.crud.getManagedInterfaces();
  }

  @Post('interfaces')
  createManagedInterface(@Body() data: any) {
    return this.crud.createManagedInterface(data);
  }

  @Put('interfaces/:id')
  updateManagedInterface(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateManagedInterface(id, data);
  }

  @Delete('interfaces/:id')
  async deleteManagedInterface(@Param('id') id: string) {
    await this.crud.deleteManagedInterface(id);
    return { success: true };
  }

  // ========== WORKFLOWS ==========

  @Get('workflows')
  getWorkflows() {
    return this.crud.getWorkflows();
  }

  @Post('workflows')
  createWorkflow(@Body() data: any) {
    return this.crud.createWorkflow(data);
  }

  @Put('workflows/:id')
  updateWorkflow(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateWorkflow(id, data);
  }

  @Delete('workflows/:id')
  async deleteWorkflow(@Param('id') id: string) {
    await this.crud.deleteWorkflow(id);
    return { success: true };
  }

  // ========== PROVIDER CATALOG ==========

  @Get('provider-catalog')
  getProviderCatalog() {
    return this.crud.getProviderCatalog();
  }

  @Put('provider-catalog')
  upsertProviderCatalog(@Body() data: any[]) {
    return this.crud.upsertProviderCatalog(data);
  }

  // ========== TENANT PROVIDER CONFIG ==========

  @Get('tenant-provider-config')
  getTenantProviderConfig(@Query('companyId') companyId: string) {
    return this.crud.getTenantProviderConfig(companyId);
  }

  @Put('tenant-provider-config')
  upsertTenantProviderConfig(@Body() data: any[]) {
    return this.crud.upsertTenantProviderConfig(data);
  }

  // ========== TENANT VOICE PROFILES ==========

  @Get('voice-profiles')
  getTenantVoiceProfiles(@Query('companyId') companyId: string) {
    return this.crud.getTenantVoiceProfiles(companyId);
  }

  @Post('voice-profiles')
  createTenantVoiceProfile(@Body() data: any) {
    return this.crud.createTenantVoiceProfile(data);
  }

  @Put('voice-profiles/:id')
  updateTenantVoiceProfile(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateTenantVoiceProfile(id, data);
  }

  @Delete('voice-profiles/:id')
  async deleteTenantVoiceProfile(@Param('id') id: string) {
    await this.crud.deleteTenantVoiceProfile(id);
    return { success: true };
  }

  // ========== SESSIONS ==========

  @Get('sessions')
  getSessions(@Query('companyId') companyId?: string, @Query('limit') limit?: number) {
    return this.crud.getSessions(companyId, limit ? parseInt(String(limit)) : undefined);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.crud.getSession(id);
  }

  @Post('sessions')
  createSession(@Body() data: any) {
    return this.crud.createSession(data);
  }

  @Put('sessions/:id')
  updateSession(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateSession(id, data);
  }

  @Get('sessions/orphaned/count')
  getOrphanedSessionCount() {
    return this.crud.getOrphanedSessionCount();
  }

  @Delete('sessions/orphaned')
  deleteOrphanedSessions() {
    return this.crud.deleteOrphanedSessions();
  }

  // ========== KNOWLEDGE ==========

  @Get('knowledge')
  getKnowledgeBases(@Query('companyId') companyId: string) {
    return this.crud.getKnowledgeBases(companyId);
  }

  @Post('knowledge')
  createKnowledgeBase(@Body() data: any) {
    return this.crud.createKnowledgeBase(data);
  }

  @Delete('knowledge/:id')
  async deleteKnowledgeBase(@Param('id') id: string) {
    await this.crud.deleteKnowledgeBase(id);
    return { success: true };
  }

  @Get('knowledge/:id/documents')
  getKnowledgeDocuments(@Param('id') id: string) {
    return this.crud.getKnowledgeDocuments(id);
  }

  @Post('knowledge/:id/documents')
  createKnowledgeDocument(@Param('id') id: string, @Body() data: any) {
    return this.crud.createKnowledgeDocument({ ...data, knowledgeBaseId: id });
  }

  @Delete('knowledge/documents/:docId')
  async deleteKnowledgeDocument(@Param('docId') id: string) {
    await this.crud.deleteKnowledgeDocument(id);
    return { success: true };
  }

  // ========== AUDIT LOGS ==========

  @Get('audit-logs')
  getAuditLogs(@Query('companyId') companyId?: string, @Query('limit') limit?: number) {
    return this.crud.getAuditLogs(companyId, limit ? parseInt(String(limit)) : undefined);
  }

  @Post('audit-logs')
  createAuditLog(@Body() data: any) {
    return this.crud.createAuditLog(data);
  }

  // ========== SEED ==========

  @Post('seed')
  async seedFromCrudJson() {
    try {
      const result = await this.crud.seedFromCrudJson();
      return {
        success: true,
        message: 'Seed completed',
        ...result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Seed failed',
        error: error.message
      };
    }
  }

  // ========== WEBHOOK (secure ops: seed DB or fix structure) ==========
  //
  //   curl -X POST https://keledonapi.tuyoisaza.com/api/crud/webhook \
  //     -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  //     -H "Content-Type: application/json" \
  //     -d '{"action":"seed","companies":[...],"brands":[...],"teams":[...],"users":[...]}'
  //
  //   curl -X POST https://keledonapi.tuyoisaza.com/api/crud/webhook \
  //     -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  //     -d '{"action":"migrate"}'
  //
  @UseGuards(WebhookGuard)
  @Post('webhook')
  async webhook(@Body() body: any) {
    const { action } = body;

    if (!action) {
      return { success: false, message: 'Missing "action" in body (seed | migrate)' };
    }

    if (action === 'seed') {
      return this.webhookSeed(body);
    }

    if (action === 'migrate') {
      return this.webhookMigrate();
    }

    return { success: false, message: `Unknown action "${action}". Use "seed" or "migrate".` };
  }

  private async webhookSeed(body: any) {
    const counters = { companies: 0, brands: 0, teams: 0, users: 0 };
    const errors: string[] = [];

    try {
      // Companies
      if (body.companies && Array.isArray(body.companies)) {
        for (const company of body.companies) {
          const existing = await this.prisma.company.findFirst({ where: { name: company.name } });
          if (!existing) {
            await this.prisma.company.create({
              data: { name: company.name, industry: company.industry || null }
            });
            counters.companies++;
          }
        }
      }

      // Brands
      if (body.brands && Array.isArray(body.brands)) {
        for (const brand of body.brands) {
          const existing = await this.prisma.brand.findFirst({ where: { name: brand.name } });
          if (!existing) {
            const company = brand.company_name
              ? await this.prisma.company.findFirst({ where: { name: brand.company_name } })
              : null;
            if (company) {
              await this.prisma.brand.create({
                data: { name: brand.name, companyId: company.id, color: brand.color || '#6366f1' }
              });
              counters.brands++;
            } else {
              errors.push(`Brand "${brand.name}": company "${brand.company_name}" not found`);
            }
          }
        }
      }

      // Teams
      if (body.teams && Array.isArray(body.teams)) {
        for (const team of body.teams) {
          const existing = await this.prisma.team.findFirst({ where: { name: team.name } });
          if (!existing) {
            let brandId = null;
            if (team.brand_name) {
              const brand = await this.prisma.brand.findFirst({ where: { name: team.brand_name } });
              brandId = brand?.id || null;
            }
            await this.prisma.team.create({
              data: {
                name: team.name,
                brandId,
                country: team.country || null,
                sttProvider: team.stt_provider || 'vosk',
                ttsProvider: team.tts_provider || 'elevenlabs',
              }
            });
            counters.teams++;
          }
        }
      }

      // Users
      if (body.users && Array.isArray(body.users)) {
        for (const user of body.users) {
          const existing = await this.prisma.user.findFirst({ where: { email: user.email } });
          if (!existing) {
            let companyId = null;
            let teamId = null;
            if (user.company_name) {
              const company = await this.prisma.company.findFirst({ where: { name: user.company_name } });
              companyId = company?.id || null;
            }
            if (user.team_name) {
              const team = await this.prisma.team.findFirst({ where: { name: user.team_name } });
              teamId = team?.id || null;
            }
            await this.prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email.split('@')[0],
                role: user.role || 'user',
                companyId,
                teamId,
              }
            });
            counters.users++;
          }
        }
      }

      return {
        success: true,
        message: 'Webhook seed completed',
        created: counters,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return { success: false, message: 'Webhook seed failed', error: error.message, partial: counters };
    }
  }

  private async webhookMigrate() {
    try {
      // Re-run all raw migrations (idempotent)
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
      await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "vendors_teamId_idx" ON "vendors"("teamId")`;
      await this.prisma.$executeRaw`ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "startGoal" TEXT`;

      return { success: true, message: 'Migration webhook: vendors table ensured' };
    } catch (error) {
      return { success: false, message: 'Migration webhook failed', error: error.message };
    }
  }

  // ========== VENDORS ==========

  @Get('vendors/:teamId')
  getVendors(@Param('teamId') teamId: string) {
    return this.crud.getVendors(teamId);
  }

  @Post('vendors')
  createVendor(@Body() data: {
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
    return this.crud.createVendor(data);
  }

  @Put('vendors/:id')
  updateVendor(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      type?: string;
      baseUrl?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      config?: Record<string, unknown>;
      isActive?: boolean;
      startGoal?: string;
    }
  ) {
    return this.crud.updateVendor(id, data);
  }

  @Delete('vendors/:id')
  deleteVendor(@Param('id') id: string) {
    return this.crud.deleteVendor(id);
  }
}
