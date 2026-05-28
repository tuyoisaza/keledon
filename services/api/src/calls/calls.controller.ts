import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CallsService } from './calls.service';
import {
  CloseCallDto,
  CreateCallDto,
  CreateCallEventDto,
  DecideCallDto,
  EscalateCallDto,
  TranscriptTurnDto,
} from './dto/calls.dto';

@ApiTags('Calls')
@Controller('api/calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a call orchestration session' })
  @ApiCreatedResponse({ description: 'Call session created' })
  createCall(@Body() dto: CreateCallDto, @Req() request: any) {
    return this.callsService.createCall(dto, request.user);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get current call state and event history' })
  @ApiParam({ name: 'sessionId' })
  @ApiOkResponse({ description: 'Call state fetched' })
  getCall(@Param('sessionId') sessionId: string, @Req() request: any) {
    return this.callsService.getCall(sessionId, request.user);
  }

  @Post(':sessionId/events')
  @ApiOperation({ summary: 'Append a call event from browser or provider' })
  appendEvent(@Param('sessionId') sessionId: string, @Body() dto: CreateCallEventDto, @Req() request: any) {
    return this.callsService.appendCallEvent(sessionId, dto, request.user);
  }

  @Post(':sessionId/transcript')
  @ApiOperation({ summary: 'Append a transcript turn from STT' })
  appendTranscript(@Param('sessionId') sessionId: string, @Body() dto: TranscriptTurnDto, @Req() request: any) {
    return this.callsService.appendTranscript(sessionId, dto, request.user);
  }

  @Post(':sessionId/decide')
  @ApiOperation({ summary: 'Run Cloud decisioning for the current call turn' })
  decide(@Param('sessionId') sessionId: string, @Body() dto: DecideCallDto, @Req() request: any) {
    return this.callsService.decide(sessionId, dto, request.user);
  }

  @Post(':sessionId/close')
  @ApiOperation({ summary: 'Close a call and persist final report metadata' })
  close(@Param('sessionId') sessionId: string, @Body() dto: CloseCallDto, @Req() request: any) {
    return this.callsService.close(sessionId, dto, request.user);
  }

  @Post(':sessionId/escalate')
  @ApiOperation({ summary: 'Escalate a call and queue transfer instruction' })
  escalate(@Param('sessionId') sessionId: string, @Body() dto: EscalateCallDto, @Req() request: any) {
    return this.callsService.escalate(sessionId, dto, request.user);
  }
}
