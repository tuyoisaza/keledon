import { ResourceScopeGuard } from '../guards/resource-scope.guard';
import {
  Body,
  Controller,
  UseGuards,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { MvpStoreService } from '../mvp/mvp-store.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../guards/public.decorator';
import type { TTSConfigEntry } from '../mvp/mvp-store.types';

interface AuthenticatedRequest {
  user?: { role?: string };
}

@ApiTags('MVP Data')
@Controller('api')
@UseGuards(ResourceScopeGuard)
export class MvpDataController {
  constructor(private readonly mvpStore: MvpStoreService) {}

  @Get('tech-status')
  getTechStatus(@Req() req: AuthenticatedRequest) {
    const status = this.mvpStore.getTechStatus();
    if (req.user?.role === 'superadmin')
      return { ...status, detailsAvailable: true };
    return {
      detailsAvailable: false,
      server: { status: status.server.status },
      techStack: [],
      dependencies: [],
    };
  }

  @Get('provider-catalog')
  getProviderCatalog(@Query('localOnly') localOnly?: string) {
    return this.mvpStore.getProviderCatalog(localOnly === 'true');
  }

  @Get('rpa-providers')
  getRpaProviders() {
    return this.mvpStore.getRpaProviders();
  }

  @Get('cloud-config')
  @Public()
  getCloudConfig() {
    const config: unknown = this.mvpStore.getCloudConfig();
    if (typeof config !== 'object' || config === null) {
      return { api_url: '', ws_url: '' };
    }
    const values = config as Record<string, unknown>;
    return {
      api_url: typeof values.api_url === 'string' ? values.api_url : '',
      ws_url: typeof values.ws_url === 'string' ? values.ws_url : '',
    };
  }

  @Get('tts-config')
  getTTSConfig() {
    const ttsConfig: TTSConfigEntry = this.mvpStore.getTTSConfig();
    const { apiKey, ...config } = ttsConfig;
    return { ...config, apiKey: '', apiKeySet: !!apiKey };
  }

  @Patch('tts-config')
  updateTTSConfig(
    @Body() body: { providerId?: string; apiKey?: string; voiceId?: string },
  ) {
    const ttsConfig: TTSConfigEntry = this.mvpStore.updateTTSConfig(body);
    const { apiKey, ...config } = ttsConfig;
    return { ...config, apiKey: '', apiKeySet: !!apiKey };
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
  updateFlowVersion(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
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
