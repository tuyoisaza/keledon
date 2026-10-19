import { Module } from '@nestjs/common';
import { LocalAuthController } from './auth-local.controller';
import { LocalAuthService } from './auth-local.service';
import { GoogleOAuthService } from './google-oauth.service';
import { UatTestProfilesService } from './uat-test-profiles.service';
import { RolePreviewFixturesService } from './role-preview-fixtures.service';
import { RolePreviewOperatorService } from './role-preview-operator.service';
import { UatFixturesService } from '../uat-fixtures/uat-fixtures.service';

@Module({
  controllers: [LocalAuthController],
  providers: [LocalAuthService, GoogleOAuthService, UatTestProfilesService, RolePreviewFixturesService, RolePreviewOperatorService, UatFixturesService],
  exports: [LocalAuthService, GoogleOAuthService],
})
export class AuthLocalModule {}
