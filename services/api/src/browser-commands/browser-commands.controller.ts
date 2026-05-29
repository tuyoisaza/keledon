import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BrowserCommandsService } from './browser-commands.service';
import { CommandResultDto } from './dto/browser-commands.dto';
import { AuthenticatedRequest } from '../types/auth.types';

@ApiTags('Browser Commands')
@Controller('api/browser/devices')
export class BrowserCommandsController {
  constructor(
    private readonly browserCommandsService: BrowserCommandsService,
  ) {}

  @Get(':deviceId/next-command')
  @ApiOperation({
    summary: 'Pull the next queued browser command for a device',
  })
  @ApiParam({ name: 'deviceId' })
  @ApiOkResponse({ description: 'Next browser command fetched' })
  getNextCommand(
    @Param('deviceId') deviceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.browserCommandsService.getNextCommand(deviceId, request.user);
  }

  @Post(':deviceId/command-result')
  @ApiOperation({
    summary: 'Append the execution result for a browser command',
  })
  @ApiParam({ name: 'deviceId' })
  recordCommandResult(
    @Param('deviceId') deviceId: string,
    @Body() dto: CommandResultDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.browserCommandsService.recordCommandResult(
      deviceId,
      dto,
      request.user,
    );
  }
}
