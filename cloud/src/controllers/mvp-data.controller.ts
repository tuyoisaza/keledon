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
import type {
  FlowDefinitionInput,
  FlowVersionInput,
  FlowVersionUpdateInput,
  IntentFlowMappingInput,
  KnowledgeDocumentInput,
  ManagedInterfaceInput,
  TenantFlowPermissionInput,
} from '../mvp/mvp-store.types';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../guards/public.decorator';
import type { TTSConfigEntry } from '../mvp/mvp-store.types';

interface AuthenticatedRequest {
  user?: { userId?: string; role?: string; companyId?: string };
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
  createInterface(@Body() body: ManagedInterfaceInput) {
    return this.mvpStore.createInterface(body);
  }

  @Put('interfaces/:id')
  updateInterface(
    @Param('id') id: string,
    @Body() body: ManagedInterfaceInput,
  ) {
    return this.mvpStore.updateInterface(id, body);
  }

  @Delete('interfaces/:id')
  deleteInterface(@Param('id') id: string) {
    return { success: this.mvpStore.deleteInterface(id) };
  }

  @Get('flow-definitions')
  getFlowDefinitions(@Query('companyId') companyId?: string) {
    return this.mvpStore.getFlowDefinitions(companyId);
  }

  @Post('flow-definitions')
  createFlowDefinition(@Body() body: FlowDefinitionInput) {
    return this.mvpStore.createFlowDefinition(body);
  }

  @Put('flow-definitions/:id')
  updateFlowDefinition(
    @Param('id') id: string,
    @Body() body: FlowDefinitionInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.updateFlowDefinition(id, body, req.user?.companyId);
  }

  @Delete('flow-definitions/:id')
  archiveFlowDefinition(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.updateFlowDefinition(
      id,
      { status: 'inactive' },
      req.user?.companyId,
    );
  }

  @Get('flow-versions')
  getFlowVersions(@Query('companyId') companyId?: string) {
    return this.mvpStore.getFlowVersions(companyId);
  }

  @Post('flow-versions')
  createFlowVersion(
    @Body() body: FlowVersionInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.createFlowVersion(
      body,
      req.user?.userId || '',
      req.user?.companyId,
    );
  }

  @Put('flow-versions/:id')
  updateFlowVersion(
    @Param('id') id: string,
    @Body() body: FlowVersionUpdateInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.updateFlowVersion(id, body, req.user?.companyId);
  }

  @Get('tenant-flow-permissions/:companyId')
  getTenantFlowPermissions(
    @Param('companyId') companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.getTenantFlowPermissions(
      req.user?.companyId || companyId,
    );
  }

  @Post('tenant-flow-permissions')
  upsertTenantFlowPermissions(
    @Body() body: TenantFlowPermissionInput[],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.upsertTenantFlowPermissions(body, req.user?.companyId);
  }

  @Get('intent-flow-mappings/:companyId')
  getIntentFlowMappings(
    @Param('companyId') companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.getIntentFlowMappings(
      req.user?.companyId || companyId,
    );
  }

  @Post('intent-flow-mappings')
  upsertIntentFlowMapping(
    @Body() body: IntentFlowMappingInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.mvpStore.upsertIntentFlowMapping(body, req.user?.companyId);
  }

  @Get('knowledge/documents')
  getKnowledgeDocuments() {
    return this.mvpStore.getKnowledgeDocuments();
  }

  @Post('knowledge/documents')
  createKnowledgeDocument(@Body() body: KnowledgeDocumentInput) {
    return this.mvpStore.createKnowledgeDocument(body);
  }
}
