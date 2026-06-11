import { Module } from '@nestjs/common';
import { CrudController } from './crud.controller';
import { CrudService } from './crud.service';
import { CrudKeledonService } from './crud-keledon.service';
import { CrudAuditService } from './crud-audit.service';
import { CrudSeedService } from './crud-seed.service';
import { CrudCompanyService } from './crud-company.service';
import { CrudVendorService } from './crud-vendor.service';
import { WebhookGuard } from '../guards/webhook.guard';

@Module({
  controllers: [CrudController],
  providers: [CrudService, CrudKeledonService, CrudAuditService, CrudSeedService, CrudCompanyService, CrudVendorService, WebhookGuard],
  exports: [CrudService, CrudKeledonService, CrudAuditService, CrudSeedService, CrudCompanyService, CrudVendorService],
})
export class CrudModule {}
