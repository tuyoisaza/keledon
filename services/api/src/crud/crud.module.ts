import { Module } from '@nestjs/common';
import { CrudController } from './crud.controller';
import { CrudService } from './crud.service';
import { CrudKeledonService } from './crud-keledon.service';
import { CrudAuditService } from './crud-audit.service';
import { CrudSeedService } from './crud-seed.service';
import { CrudCompanyService } from './crud-company.service';
import { CrudVendorService } from './crud-vendor.service';
import { TenantController } from '../controllers/tenant.controller';
import { WebhookGuard } from '../guards/webhook.guard';
import { CrudAccessGuard } from '../guards/crud-access.guard';
import { CrudMigrationService } from './crud-migration.service';
import { CrudSessionDataService } from './crud-session-data.service';

@Module({
  controllers: [CrudController, TenantController],
  providers: [
    CrudService,
    CrudKeledonService,
    CrudAuditService,
    CrudSeedService,
    CrudCompanyService,
    CrudVendorService,
    CrudMigrationService,
    CrudSessionDataService,
    WebhookGuard,
    CrudAccessGuard,
  ],
  exports: [
    CrudService,
    CrudKeledonService,
    CrudAuditService,
    CrudSeedService,
    CrudCompanyService,
    CrudVendorService,
    CrudMigrationService,
    CrudSessionDataService,
  ],
})
export class CrudModule {}
