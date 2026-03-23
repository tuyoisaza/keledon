import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CrudService } from './crud.service';

@Controller('api/crud')
export class CrudController {
  constructor(private readonly crud: CrudService) {}

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

  // ========== AGENTS ==========

  @Get('agents')
  getAgents(@Query('companyId') companyId?: string) {
    return this.crud.getAgents(companyId);
  }

  @Post('agents')
  createAgent(@Body() data: any) {
    return this.crud.createAgent(data);
  }

  @Put('agents/:id')
  updateAgent(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateAgent(id, data);
  }

  @Delete('agents/:id')
  async deleteAgent(@Param('id') id: string) {
    await this.crud.deleteAgent(id);
    return { success: true };
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
}
