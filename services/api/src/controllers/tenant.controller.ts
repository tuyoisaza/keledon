import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrudService } from '../crud/crud.service';
import { CrudAccessGuard } from '../guards/crud-access.guard';

@ApiTags('Tenant')
@Controller('api/tenant')
@UseGuards(CrudAccessGuard)
export class TenantController {
  constructor(private readonly crudService: CrudService) {}

  @Get('voice-profiles')
  @ApiOperation({ summary: 'Get tenant voice profiles' })
  getTenantVoiceProfiles(@Query('companyId') companyId: string) {
    return this.crudService.getTenantVoiceProfiles(companyId);
  }

  @Get('voice-profiles/:id')
  @ApiOperation({ summary: 'Get a tenant voice profile without provider secrets' })
  getTenantVoiceProfile(@Param('id') id: string, @Req() req: any) {
    const companyId =
      req.actor.role === 'superadmin' ? undefined : req.actor.companyId;
    return this.crudService.getTenantVoiceProfile(id, companyId);
  }

  @Post('voice-profiles')
  @ApiOperation({ summary: 'Create tenant voice profile' })
  createTenantVoiceProfile(@Body() data: any) {
    return this.crudService.createTenantVoiceProfile(data);
  }

  @Put('voice-profiles/:id')
  @ApiOperation({ summary: 'Update a tenant voice profile' })
  updateTenantVoiceProfile(@Param('id') id: string, @Body() data: any) {
    return this.crudService.updateTenantVoiceProfile(id, data);
  }

  @Delete('voice-profiles/:id')
  @ApiOperation({ summary: 'Delete tenant voice profile' })
  async deleteTenantVoiceProfile(@Param('id') id: string) {
    await this.crudService.deleteTenantVoiceProfile(id);
    return { success: true };
  }
}
