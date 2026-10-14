import { Module } from '@nestjs/common';
import { CrudController } from './crud.controller';
import { CrudService } from './crud.service';
import { CrudKeledonService } from './crud-keledon.service';
import { CrudAuditService } from './crud-audit.service';
import { CrudCompanyService } from './crud-company.service';
import { CrudVendorService } from './crud-vendor.service';
import { TenantController } from '../controllers/tenant.controller';
import { CrudAccessGuard } from '../guards/crud-access.guard';
import { CrudSessionDataService } from './crud-session-data.service';
import { CrudTenantVoiceProfileService } from './crud-tenant-voice-profile.service';

@Module({
  controllers: [CrudController, TenantController],
  providers: [
    CrudService,
    CrudKeledonService,
    CrudAuditService,
    CrudCompanyService,
    CrudVendorService,
    CrudSessionDataService,
    CrudTenantVoiceProfileService,
    CrudAccessGuard,
  ],
  exports: [
    CrudService,
    CrudKeledonService,
    CrudAuditService,
    CrudCompanyService,
    CrudVendorService,
    CrudSessionDataService,
    CrudTenantVoiceProfileService,
  ],
})
export class CrudModule {}
