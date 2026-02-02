import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Application is running' })
  getHealth(): { message: string; timestamp: string } {
    return {
      message: 'KELEDON RBAC System is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('docs')
  @ApiOperation({ summary: 'Get API info' })
  @ApiResponse({ status: 200, description: 'API documentation' })
  getApiInfo(): { message: string; documentation: string; version: string } {
    return {
      message: 'KELEDON RBAC API',
      documentation: '/docs',
      version: '1.0.0',
    };
  }
}