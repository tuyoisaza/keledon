import { Controller, Get, Query } from '@nestjs/common';
import { TechStatusService, TechStatusResponse } from './tech-status.service';

@Controller('api/tech-status')
export class TechStatusController {
    constructor(private readonly techStatusService: TechStatusService) { }

    @Get()
    async getTechStatus(@Query('checkUpdates') checkUpdates?: string) {
        const status = await this.techStatusService.getTechStatus();

        // Optionally check npm for updates (can be slow)
        if (checkUpdates === 'true') {
            status.dependencies = await this.techStatusService.checkForUpdates(
                status.dependencies,
            );
        }

        return status;
    }
}
