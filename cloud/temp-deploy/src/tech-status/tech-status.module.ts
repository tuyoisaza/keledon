import { Module } from '@nestjs/common';
import { TechStatusController } from './tech-status.controller';
import { TechStatusService } from './tech-status.service';

@Module({
    controllers: [TechStatusController],
    providers: [TechStatusService],
    exports: [TechStatusService],
})
export class TechStatusModule { }
