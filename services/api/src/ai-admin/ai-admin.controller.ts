import { Controller, Get, Put, Param, Body, Req, Query } from '@nestjs/common';
import { AiAdminService } from './ai-admin.service';

@Controller('api/admin/ai')
export class AiAdminController {
  constructor(private readonly service: AiAdminService) {}
  @Get('prompts')
  list(@Req() req: any) {
    return this.service.listPrompts(req.user?.userId);
  }
  @Get('prompts/:id')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.service.getPrompt(req.user?.userId, id);
  }
  @Put('prompts/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updatePrompt(req.user?.userId, id, body);
  }
  @Get('consumption')
  consumption(@Req() req: any, @Query('limit') limit?: string) {
    return this.service.consumption(req.user?.userId, limit);
  }
}
