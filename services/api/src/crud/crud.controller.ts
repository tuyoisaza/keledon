import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CrudService } from './crud.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('CRUD')
@Controller('api/crud')
export class CrudController {
  constructor(
    private readonly crud: CrudService,
    private readonly prisma: PrismaService,
  ) {}

  // ========== COMPANIES ==========

  @Get('companies')
  getCompanies(@Query() query: any) {
    return this.crud.getCompanies(query);
  }

  // ========== BRANDS ==========

  @Get('brands')
  getBrands(@Query() query: any) {
    return this.crud.getBrands(query);
  }

  // ========== TEAMS ==========

  @Get('teams')
  getTeams() {
    return this.crud.getTeams();
  }

  @Get('teams/:id/config')
  getTeamConfig(@Param('id') id: string) {
    return this.crud.getTeamConfig(id);
  }

  // ========== AGENTS / KELEDONS ==========

  @Get('keledons')
  getKeledons() {
    return this.crud.getAgents();
  }

  @Get('keledons/:id')
  getKeledon(@Param('id') id: string) {
    return this.crud.getAgent(id);
  }

  @Post('keledons/:id/launch')
  async launchKeledon(
    @Param('id') keledonId: string,
    @Body() body: { userId: string },
  ) {
    return this.crud.generateKeledonLaunchLink(keledonId, body.userId);
  }

  // ========== LAUNCH DEBUG ==========

  @Get('keledons/:id/launch-debug')
  async debugLaunch(@Param('id') keledonId: string) {
    return this.crud.getLaunchContext(keledonId);
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

  @Get('tenant-voice-profiles')
  getTenantVoiceProfiles() {
    return this.crud.getTenantVoiceProfiles();
  }

  @Post('tenant-voice-profiles')
  upsertTenantVoiceProfile(@Body() data: any) {
    return this.crud.upsertTenantVoiceProfile(data);
  }

  @Delete('tenant-voice-profiles/:id')
  deleteTenantVoiceProfile(@Param('id') id: string) {
    return this.crud.deleteTenantVoiceProfile(id);
  }

  // ========== VENDORS ==========

  @Get('vendors')
  getVendors(@Query('teamId') teamId?: string) {
    return this.crud.getVendors(teamId);
  }

  @Put('vendors')
  upsertVendors(@Body() data: any[]) {
    return this.crud.upsertVendors(data);
  }

  // ========== KNOWLEDGE ==========

  @Get('knowledge/bases')
  getKnowledgeBases() {
    return this.crud.getKnowledgeBases();
  }

  @Post('knowledge/bases')
  createKnowledgeBase(@Body() data: any) {
    return this.crud.createKnowledgeBase(data);
  }

  @Get('knowledge/bases/:id')
  getKnowledgeBase(@Param('id') id: string) {
    return this.crud.getKnowledgeBase(id);
  }

  @Put('knowledge/bases/:id')
  updateKnowledgeBase(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateKnowledgeBase(id, data);
  }

  @Delete('knowledge/bases/:id')
  deleteKnowledgeBase(@Param('id') id: string) {
    return this.crud.deleteKnowledgeBase(id);
  }

  @Get('knowledge/documents')
  getKnowledgeDocuments(@Query('baseId') baseId?: string) {
    return this.crud.getKnowledgeDocuments(baseId);
  }

  @Post('knowledge/documents')
  createKnowledgeDocument(@Body() data: any) {
    return this.crud.createKnowledgeDocument(data);
  }

  @Delete('knowledge/documents/:id')
  deleteKnowledgeDocument(@Param('id') id: string) {
    return this.crud.deleteKnowledgeDocument(id);
  }

  // ========== FLOWS ==========

  @Get('flows')
  getFlows() {
    return this.crud.getFlows();
  }

  @Post('flows')
  createFlow(@Body() data: any) {
    return this.crud.createFlow(data);
  }

  @Put('flows/:id')
  updateFlow(@Param('id') id: string, @Body() data: any) {
    return this.crud.updateFlow(id, data);
  }

  @Delete('flows/:id')
  deleteFlow(@Param('id') id: string) {
    return this.crud.deleteFlow(id);
  }

  @Get('flows/:id/runs')
  getFlowRuns(@Param('id') flowId: string) {
    return this.crud.getFlowRuns(flowId);
  }

  @Post('flows/:id/run')
  triggerFlow(
    @Param('id') flowId: string,
    @Body() body: { sessionId?: string; data?: any },
  ) {
    return this.crud.triggerFlow(flowId, body.sessionId, body.data);
  }

  // ========== INTENT MAPPINGS ==========

  @Get('intent-mappings')
  getIntentFlowMappings() {
    return this.crud.getIntentFlowMappings();
  }

  @Post('intent-mappings')
  upsertIntentFlowMapping(@Body() data: any) {
    return this.crud.upsertIntentFlowMapping(data);
  }

  @Delete('intent-mappings/:id')
  deleteIntentFlowMapping(@Param('id') id: string) {
    return this.crud.deleteIntentFlowMapping(id);
  }

  // ========== DASHBOARD / STATUS ==========

  @Get('tech-status')
  getTechStatus() {
    return this.crud.getTechStatus();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
