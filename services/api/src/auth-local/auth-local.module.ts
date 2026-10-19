import { Module } from '@nestjs/common';
import { LocalAuthController } from './auth-local.controller';
import { LocalAuthService } from './auth-local.service';
import { GoogleOAuthService } from './google-oauth.service';
import { UatTestProfilesService } from './uat-test-profiles.service';
import { RolePreviewFixturesService } from './role-preview-fixtures.service';

@Module({
  controllers: [LocalAuthController],
  providers: [LocalAuthService, GoogleOAuthService, UatTestProfilesService, RolePreviewFixturesService],
  exports: [LocalAuthService, GoogleOAuthService],
})
export class AuthLocalModule {}
