import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ListeningSessionService } from './listening-session.service';
import { ApiTags } from '@nestjs/swagger';
import { RuntimeActorGuard } from '../gateways/runtime-identity';

@ApiTags('Listening Sessions')
@Controller('listening-sessions')
@UseGuards(RuntimeActorGuard)
export class ListeningSessionController {
  constructor(
    private readonly listeningSessionService: ListeningSessionService,
  ) {}

  @Post()
  createSession(
    @Body() body: { source: string; tabUrl?: string; tabTitle?: string },
  ) {
    if (!body.source) {
      throw new HttpException('Source is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const session = this.listeningSessionService.createSession(body);
      return Promise.resolve(session);
    } catch (error) {
      return Promise.reject(
        new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    }
  }
}
