import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BrowserCommandsService } from './browser-commands.service';
import { CommandResultDto } from './dto/browser-commands.dto';
import { AuthenticatedRequest } from '../types/auth.types';
import { RuntimeDeviceGuard } from '../gateways/runtime-identity';
import { Public } from '../guards/public.decorator';
import { InterfaceControlService } from '../interface-control/interface-control.service';

@ApiTags('Browser Commands')
@Public()
@UseGuards(RuntimeDeviceGuard)
@Controller('api/browser/devices')
export class BrowserCommandsController {
  constructor(
    private readonly browserCommandsService: BrowserCommandsService,
    private readonly interfaces: InterfaceControlService,
  ) {}

  @Get(':deviceId/next-command')
  @ApiOperation({
    summary: 'Pull the next queued browser command for a device',
  })
  @ApiParam({ name: 'deviceId' })
  @ApiOkResponse({ description: 'Next browser command fetched' })
  async getNextCommand(
    @Param('deviceId') deviceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.interfaces.next(deviceId, (request as any).runtimeIdentity) || this.browserCommandsService.getNextCommand(deviceId, request.user);
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
    if (typeof dto.commandId === 'string' && dto.commandId.startsWith('ui_'))
      return this.interfaces.completeDevice(deviceId, (request as any).runtimeIdentity, dto.commandId, dto.extracted);
    return this.browserCommandsService.recordCommandResult(
      deviceId,
      dto,
      request.user,
    );
  }

  @Post(':deviceId/interface-authorize')
  authorizeInterface(@Param('deviceId') deviceId: string, @Body() body: { commandId?: string }, @Req() request: any) {
    return this.interfaces.authorizeDevice(deviceId, request.runtimeIdentity, body?.commandId);
  }
}
