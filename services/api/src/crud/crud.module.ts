import { Module } from '@nestjs/common';
import { CrudController } from './crud.controller';
import { CrudService } from './crud.service';
import { CrudKeledonService } from './crud-keledon.service';
import { CrudAuditService } from './crud-audit.service';
import { CrudSeedService } from './crud-seed.service';
import { CrudVendorService } from './crud-vendor.service';

@Module({
  controllers: [CrudController],
  providers: [CrudService, CrudKeledonService, CrudAuditService, CrudSeedService, CrudVendorService],
  exports: [CrudService, CrudKeledonService, CrudAuditService, CrudSeedService, CrudVendorService],
})
export class CrudModule {}
