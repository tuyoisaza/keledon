import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { MvpStoreService } from '../mvp/mvp-store.service';

@Controller('api')
export class MvpDataController {
  constructor(private readonly mvpStore: MvpStoreService) {}

  @Get('tech-status')
  getTechStatus() {
    return this.mvpStore.getTechStatus();
  }

  @Get('provider-catalog')
  getProviderCatalog(@Query('localOnly') localOnly?: string) {
    return this.mvpStore.getProviderCatalog(localOnly === 'true');
  }

  @Get('rpa-providers')
  getRpaProviders() {
    return this.mvpStore.getRpaProviders();
  }

  @Get('interfaces')
  getInterfaces() {
    return this.mvpStore.getInterfaces();
  }

  @Post('interfaces')
  createInterface(@Body() body: Record<string, any>) {
    return this.mvpStore.createInterface(body);
  }

  @Put('interfaces/:id')
  updateInterface(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.mvpStore.updateInterface(id, body);
  }

  @Delete('interfaces/:id')
  deleteInterface(@Param('id') id: string) {
    return { success: this.mvpStore.deleteInterface(id) };
  }

  @Get('flow-definitions')
  getFlowDefinitions() {
    return this.mvpStore.getFlowDefinitions();
  }

  @Post('flow-definitions')
  createFlowDefinition(@Body() body: Record<string, any>) {
    return this.mvpStore.createFlowDefinition(body);
  }

  @Get('flow-versions')
  getFlowVersions() {
    return this.mvpStore.getFlowVersions();
  }

  @Post('flow-versions')
  createFlowVersion(@Body() body: Record<string, any>) {
    return this.mvpStore.createFlowVersion(body);
  }

  @Put('flow-versions/:id')
  updateFlowVersion(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.mvpStore.updateFlowVersion(id, body);
  }

  @Get('tenant-flow-permissions/:companyId')
  getTenantFlowPermissions(@Param('companyId') companyId: string) {
    return this.mvpStore.getTenantFlowPermissions(companyId);
  }

  @Post('tenant-flow-permissions')
  upsertTenantFlowPermissions(@Body() body: Array<Record<string, any>>) {
    const entries = Array.isArray(body) ? body : [];
    return this.mvpStore.upsertTenantFlowPermissions(entries);
  }

  @Get('intent-flow-mappings/:companyId')
  getIntentFlowMappings(@Param('companyId') companyId: string) {
    return this.mvpStore.getIntentFlowMappings(companyId);
  }

  @Post('intent-flow-mappings')
  upsertIntentFlowMapping(@Body() body: Record<string, any>) {
    return this.mvpStore.upsertIntentFlowMapping(body);
  }

  @Get('knowledge/documents')
  getKnowledgeDocuments() {
    return this.mvpStore.getKnowledgeDocuments();
  }

  @Post('knowledge/documents')
  createKnowledgeDocument(@Body() body: Record<string, any>) {
    return this.mvpStore.createKnowledgeDocument(body);
  }
}
