import { Module } from '@nestjs/common';
import { CrudController } from './crud.controller';
import { CrudService } from './crud.service';
import { WebhookGuard } from '../guards/webhook.guard';

@Module({
  controllers: [CrudController],
  providers: [CrudService, WebhookGuard],
  exports: [CrudService],
})
export class CrudModule {}
