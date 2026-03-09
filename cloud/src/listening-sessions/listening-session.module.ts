import { Module } from '@nestjs/common';
import { ListeningSessionController } from './listening-session.controller';
import { ListeningSessionService } from './listening-session.service';
import { ListeningSessionGateway } from './listening.gateway';

@Module({
    controllers: [ListeningSessionController],
    providers: [ListeningSessionService, ListeningSessionGateway],
    exports: [ListeningSessionService],
})
export class ListeningSessionModule { }
