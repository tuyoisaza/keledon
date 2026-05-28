import { Controller, Get } from '@nestjs/common';
import { Public } from './guards/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'KELEDON Phase 2 DATABASE-READY Backend is running!';
  }

  @Public()
  @Get('api')
  getApi() {
    return { message: 'KELEDON API is running - DATABASE-READY' };
  }
}
