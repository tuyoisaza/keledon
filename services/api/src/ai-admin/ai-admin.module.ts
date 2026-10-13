import { Module } from '@nestjs/common';
import { AiAdminService } from './ai-admin.service';
import { AiAdminController } from './ai-admin.controller';
@Module({ controllers: [AiAdminController], providers: [AiAdminService], exports: [AiAdminService] })
export class AiAdminModule {}
