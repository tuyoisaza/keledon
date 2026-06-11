import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrudService } from '../crud/crud.service';

@ApiTags('Tenant')
@Controller('api/tenant')
export class TenantController {
  constructor(private readonly crudService: CrudService) {}

  @Get('voice-profiles')
  @ApiOperation({ summary: 'Get tenant voice profiles' })
  getTenantVoiceProfiles(@Query('companyId') companyId: string) {
    return this.crudService.getTenantVoiceProfiles(companyId);
  }

  @Post('voice-profiles')
  @ApiOperation({ summary: 'Create tenant voice profile' })
  createTenantVoiceProfile(@Body() data: any) {
    return this.crudService.createTenantVoiceProfile(data);
  }

  @Delete('voice-profiles/:id')
  @ApiOperation({ summary: 'Delete tenant voice profile' })
  async deleteTenantVoiceProfile(@Param('id') id: string) {
    await this.crudService.deleteTenantVoiceProfile(id);
    return { success: true };
  }
}
