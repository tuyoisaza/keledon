import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { PlatformThemeService } from './platform-theme.service';

@Controller('api')
export class PlatformThemeController {
  constructor(private readonly themes: PlatformThemeService) {}

  @Get('theme')
  read() {
    return this.themes.read();
  }

  @Get('admin/theme')
  adminRead(@Req() req: any) {
    return this.themes.readAdmin(req.user?.userId);
  }

  @Put('admin/theme')
  update(@Req() req: any, @Body() body: unknown) {
    return this.themes.update(req.user?.userId, body);
  }
}
