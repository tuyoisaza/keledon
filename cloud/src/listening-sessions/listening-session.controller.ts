import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ListeningSessionService } from './listening-session.service';
import { RuntimeActorGuard } from '../gateways/runtime-identity';

@Controller('listening-sessions')
@UseGuards(RuntimeActorGuard)
export class ListeningSessionController {
    constructor(private readonly listeningSessionService: ListeningSessionService) { }

    @Post()
    async createSession(@Body() body: { source: string; tabUrl?: string; tabTitle?: string }) {
        if (!body.source) {
            throw new HttpException('Source is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const session = await this.listeningSessionService.createSession(body);
            return session;
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
