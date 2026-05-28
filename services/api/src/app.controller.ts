import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'KELEDON Phase 2 DATABASE-READY Backend is running!';
  }

  @Get('api')
  getApi() {
    return { message: 'KELEDON API is running - DATABASE-READY' };
  }
}